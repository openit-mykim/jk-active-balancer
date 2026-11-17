import { DisconnectListeners, NotificationQueue, type BleDevice, type BleTransport } from "@jk-active-balancer/ble-core";
import { CHARACTERISTIC_UUID, SERVICE_UUID } from "@jk-active-balancer/jk-protocol";

/** `react-native-ble-plx` Subscription. */
export interface SubscriptionLike {
  remove(): void;
}

/** Structural subset of a `react-native-ble-plx` `Device`. */
export interface DeviceLike {
  readonly id: string;
  readonly name?: string | null;
  readonly rssi?: number | null;
  discoverAllServicesAndCharacteristics(): Promise<DeviceLike>;
  cancelConnection(): Promise<DeviceLike>;
  writeCharacteristicWithoutResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
  ): Promise<unknown>;
  writeCharacteristicWithResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
  ): Promise<unknown>;
  monitorCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: Error | null, characteristic: { value?: string | null } | null) => void,
  ): SubscriptionLike;
}

/**
 * Structural subset of `react-native-ble-plx`'s `BleManager`.
 *
 * The package does not depend on `react-native-ble-plx` directly: the mobile
 * app owns the (pinned) native dependency and injects a `BleManager` here. That
 * keeps native peers out of the shared workspace install (decision D005).
 */
export interface BleManagerLike {
  startDeviceScan(
    uuids: string[] | null,
    options: { allowDuplicates?: boolean } | null,
    listener: (error: Error | null, device: DeviceLike | null) => void,
  ): void | Promise<void>;
  stopDeviceScan(): void | Promise<void>;
  connectToDevice(deviceId: string, options?: { requestMTU?: number; timeout?: number }): Promise<DeviceLike>;
  cancelDeviceConnection(deviceId: string): Promise<DeviceLike>;
  onDeviceDisconnected(
    deviceId: string,
    listener: (error: Error | null, device: DeviceLike | null) => void,
  ): SubscriptionLike;
}

export interface ReactNativeBlePlxAdapterOptions {
  /** Scan window in ms. Default 5000. */
  readonly scanDurationMs?: number;
  /**
   * Scan for every peripheral instead of filtering by the FFE0 service UUID,
   * for revisions that do not advertise it (design section 24). Default false.
   */
  readonly scanAllDevices?: boolean;
  /** Request a larger MTU on Android (fewer fragments). Default 247. */
  readonly requestMTU?: number;
  /** Connection timeout in ms. Default 10000. */
  readonly connectTimeoutMs?: number;
}

/** Native BLE adapter for Android/iOS (design sections 21, 22). */
export class ReactNativeBlePlxAdapter implements BleTransport {
  private readonly options: ReactNativeBlePlxAdapterOptions;
  private device: DeviceLike | null = null;
  private monitor: SubscriptionLike | null = null;
  private disconnectSubscription: SubscriptionLike | null = null;
  private readonly queue = new NotificationQueue();
  private readonly disconnects = new DisconnectListeners();
  private userDisconnecting = false;

  constructor(
    private readonly manager: BleManagerLike,
    options: ReactNativeBlePlxAdapterOptions = {},
  ) {
    this.options = options;
  }

  scan(): Promise<readonly BleDevice[]> {
    const duration = this.options.scanDurationMs ?? 5000;
    const uuids = this.options.scanAllDevices ? null : [SERVICE_UUID];
    return new Promise((resolve, reject) => {
      const found = new Map<string, BleDevice>();
      let settled = false;
      const finish = (error?: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void this.manager.stopDeviceScan();
        if (error) reject(error);
        else resolve([...found.values()]);
      };
      const timer = setTimeout(() => finish(), duration);
      void Promise.resolve(
        this.manager.startDeviceScan(uuids, { allowDuplicates: false }, (error, device) => {
          if (error) {
            finish(error);
            return;
          }
          if (device) {
            found.set(device.id, {
              id: device.id,
              name: device.name ?? undefined,
              rssi: device.rssi ?? undefined,
            });
          }
        }),
      ).catch((error: unknown) => finish(error instanceof Error ? error : new Error(String(error))));
    });
  }

  async connect(deviceId: string): Promise<void> {
    this.userDisconnecting = false;
    this.cleanupLink();
    this.queue.reopen();

    const device = await this.manager.connectToDevice(deviceId, {
      requestMTU: this.options.requestMTU ?? 247,
      timeout: this.options.connectTimeoutMs ?? 10000,
    });
    this.device = device;
    this.disconnectSubscription = this.manager.onDeviceDisconnected(deviceId, (error) => {
      this.cleanupLink();
      this.queue.close();
      if (!this.userDisconnecting) {
        this.disconnects.emit(error ?? new Error("device disconnected"));
      }
    });
    // Handles come from discovery, never hard-coded (design section 34.5).
    await device.discoverAllServicesAndCharacteristics();
    this.monitor = device.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, (error, characteristic) => {
      if (error) {
        // ble-plx reports cancellation/disconnect through the monitor too;
        // the disconnect subscription owns the lifecycle.
        return;
      }
      if (characteristic?.value) {
        this.queue.push(fromBase64(characteristic.value));
      }
    });
  }

  async disconnect(): Promise<void> {
    this.userDisconnecting = true;
    const device = this.device;
    this.cleanupLink();
    this.queue.close();
    if (device !== null) {
      await this.manager.cancelDeviceConnection(device.id).catch(() => undefined);
    }
  }

  onDisconnect(listener: (error?: Error) => void): () => void {
    return this.disconnects.add(listener);
  }

  async write(data: Uint8Array): Promise<void> {
    const device = this.device;
    if (device === null) {
      throw new Error("ReactNativeBlePlxAdapter: write() before connect()");
    }
    // Upstream writes without response (ESP_GATT_WRITE_TYPE_NO_RSP).
    await device.writeCharacteristicWithoutResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, toBase64(data));
  }

  notifications(): AsyncIterable<Uint8Array> {
    return this.queue.iterable();
  }

  private cleanupLink(): void {
    this.monitor?.remove();
    this.monitor = null;
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    this.device = null;
  }
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode bytes as base64 (react-native-ble-plx's wire format). Pure JS:
 * `btoa`/`atob` are not guaranteed on every React Native JS engine.
 */
export function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? BASE64[triple & 63] : "=";
  }
  return out;
}

/** Decode base64 back to bytes. */
export function fromBase64(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, "");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | BASE64.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}
