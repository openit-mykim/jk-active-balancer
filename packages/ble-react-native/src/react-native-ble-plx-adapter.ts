import type { BleDevice, BleTransport } from "@jk-active-balancer/ble-core";
import { createDevice } from "./device-factory";
import {
  CHARACTERISTIC_UUID,
  SERVICE_UUID,
} from "@jk-active-balancer/jk-protocol";

/**
 * Structural subset of `react-native-ble-plx` used by this adapter.
 *
 * The package does not depend on `react-native-ble-plx` directly: the mobile
 * app owns the (pinned) native dependency and injects a `BleManager` here. That
 * keeps native peers out of the shared workspace install.
 */
export interface BleManagerLike {
  startDeviceScan(
    uuids: readonly string[] | null,
    options: unknown,
    listener: (error: Error | null, device: { id: string; name?: string | null; rssi?: number | null } | null) => void,
  ): void;
  stopDeviceScan(): void;
}

export interface DeviceLike {
  id: string;
  connect(): Promise<DeviceLike>;
  discoverAllServicesAndCharacteristics(): Promise<DeviceLike>;
  cancelConnection(): Promise<DeviceLike>;
  writeCharacteristicWithResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    value: string,
  ): Promise<unknown>;
  monitorCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: Error | null, characteristic: { value?: string | null } | null) => void,
  ): { remove(): void };
}

/** Native BLE adapter for Android/iOS (design sections 21, 22). */
export class ReactNativeBlePlxAdapter implements BleTransport {
  private device: DeviceLike | null = null;
  private scanStop: (() => void) | null = null;
  private readonly queue: Uint8Array[] = [];

  constructor(private readonly manager: BleManagerLike) {}

  async scan(): Promise<readonly BleDevice[]> {
    return new Promise((resolve) => {
      const discovered: BleDevice[] = [];
      const timer = setTimeout(() => {
        this.manager.stopDeviceScan();
        this.scanStop = null;
        resolve(discovered);
      }, 5000);
      this.scanStop = () => {
        clearTimeout(timer);
        this.manager.stopDeviceScan();
      };
      this.manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          return;
        }
        if (device) {
          discovered.push({ id: device.id, name: device.name ?? undefined, rssi: device.rssi ?? undefined });
        }
      });
    });
  }

  async connect(deviceId: string): Promise<void> {
    const device = createDevice(this.manager, deviceId);
    this.device = await device.connect();
    await this.device.discoverAllServicesAndCharacteristics();
  }

  async disconnect(): Promise<void> {
    await this.device?.cancelConnection();
    this.device = null;
    this.scanStop?.();
  }

  async write(data: Uint8Array): Promise<void> {
    const device = this.device;
    if (device === null) {
      throw new Error("ReactNativeBlePlxAdapter: write() before connect()");
    }
    await device.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, toBase64(data));
  }

  private deliver(fragment: Uint8Array): void {
    this.queue.push(fragment);
  }

  notifications(): AsyncIterable<Uint8Array> {
    const device = this.device;
    if (device !== null) {
      device.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, (error, characteristic) => {
        if (!error && characteristic?.value) {
          this.deliver(fromBase64(characteristic.value));
        }
      });
    }
    const iterator: AsyncIterator<Uint8Array> = {
      next: () =>
        new Promise<IteratorResult<Uint8Array>>((resolve) => {
          const pump = (): void => {
            const value = this.queue.shift();
            if (value) {
              resolve({ value, done: false });
            } else {
              setTimeout(pump, 10);
            }
          };
          pump();
        }),
    };
    return { [Symbol.asyncIterator]: () => iterator };
  }
}

/** Encode bytes as base64 (react-native-ble-plx's wire format). */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}

/** Decode base64 back to bytes. */
export function fromBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i) & 0xff;
  }
  return out;
}
