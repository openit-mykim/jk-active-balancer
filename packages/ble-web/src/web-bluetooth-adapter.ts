import type { BleDevice, BleTransport } from "@jk-active-balancer/ble-core";
import {
  CHARACTERISTIC_SHORT_UUID,
  SERVICE_SHORT_UUID,
} from "@jk-active-balancer/jk-protocol";
import {
  getWebBluetooth,
  type WebBluetoothCharacteristic,
  type WebBluetoothDevice,
} from "./web-bluetooth-types";

/**
 * Raised when the current environment cannot use Web Bluetooth. Chrome
 * desktop/Android and Edge support it; Safari (macOS/iOS), Firefox and any
 * WebKit browser do not (design section 23). Web Bluetooth also requires a
 * secure context.
 */
export class WebBluetoothUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebBluetoothUnsupportedError";
  }
}

/**
 * `BleTransport` over the Web Bluetooth API (design sections 23, 24).
 *
 * Phase 1 status: connection, GATT discovery and notification streaming are
 * implemented; a device picker with a `namePrefix` fallback for revisions that
 * do not advertise the service (design section 24) is left to the UI layer.
 */
export class WebBluetoothAdapter implements BleTransport {
  private device: WebBluetoothDevice | null = null;
  private characteristic: WebBluetoothCharacteristic | null = null;
  private readonly queue: Uint8Array[] = [];
  private readonly waiters: Array<(value: IteratorResult<Uint8Array>) => void> = [];
  private closed = false;

  /** Whether this environment exposes the Web Bluetooth API. */
  static isSupported(): boolean {
    return getWebBluetooth() !== null;
  }

  async scan(): Promise<readonly BleDevice[]> {
    const bluetooth = getWebBluetooth();
    if (bluetooth === null) {
      throw new WebBluetoothUnsupportedError("Web Bluetooth is not available in this browser.");
    }
    // Design section 24: filter by service first; a namePrefix fallback is a
    // UI concern once we have a revision that fails the service filter.
    const device = await bluetooth.requestDevice({
      filters: [{ services: [SERVICE_SHORT_UUID] }],
      optionalServices: [SERVICE_SHORT_UUID],
    });
    this.device = device;
    return [{ id: device.id, name: device.name }];
  }

  async connect(deviceId: string): Promise<void> {
    const device = this.device;
    if (device === null) {
      throw new WebBluetoothUnsupportedError("connect() requires a device selected via scan().");
    }
    if (device.id !== deviceId) {
      throw new Error(`WebBluetoothAdapter: unknown device id ${deviceId}`);
    }
    const gatt = await device.gatt?.connect();
    if (gatt === undefined) {
      throw new WebBluetoothUnsupportedError("No GATT server on the selected device.");
    }
    // Discovery result is authoritative; handles are never hard-coded
    // (design section 34.5).
    const service = await gatt.getPrimaryService(SERVICE_SHORT_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_SHORT_UUID);
    characteristic.addEventListener("characteristicvaluechanged", (event) => {
      const source = event.target as unknown as WebBluetoothCharacteristic;
      const view = source.value;
      if (view === null) {
        return;
      }
      this.deliver(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    });
    await characteristic.startNotifications();
    this.characteristic = characteristic;
  }

  async disconnect(): Promise<void> {
    this.closed = true;
    this.device?.gatt?.disconnect();
    this.device = null;
    this.characteristic = null;
  }

  async write(data: Uint8Array): Promise<void> {
    const characteristic = this.characteristic;
    if (characteristic === null) {
      throw new Error("WebBluetoothAdapter: write() before connect()");
    }
    await characteristic.writeValueWithoutResponse(data);
  }

  private deliver(fragment: Uint8Array): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: fragment, done: false });
    } else {
      this.queue.push(fragment);
    }
  }

  notifications(): AsyncIterable<Uint8Array> {
    const next = (): Promise<IteratorResult<Uint8Array>> => {
      const queued = this.queue.shift();
      if (queued) {
        return Promise.resolve({ value: queued, done: false });
      }
      if (this.closed) {
        return Promise.resolve({ value: undefined, done: true });
      }
      return new Promise((resolve) => this.waiters.push(resolve));
    };
    const iterator: AsyncIterator<Uint8Array> = { next };
    return { [Symbol.asyncIterator]: () => iterator };
  }
}
