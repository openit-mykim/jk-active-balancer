import { DisconnectListeners, NotificationQueue, type BleDevice, type BleTransport } from "@jk-active-balancer/ble-core";
import { CHARACTERISTIC_SHORT_UUID, SERVICE_SHORT_UUID } from "@jk-active-balancer/jk-protocol";
import {
  getWebBluetooth,
  type WebBluetooth,
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

export interface WebBluetoothAdapterOptions {
  /**
   * Development-mode fallback for revisions that do not advertise FFE0
   * (design section 24): also offer devices whose name starts with this
   * prefix, e.g. `"JK-"`. Off by default.
   */
  readonly namePrefixFallback?: string;
  /** Override `navigator.bluetooth` (tests). */
  readonly bluetooth?: WebBluetooth | null;
}

/**
 * `BleTransport` over the Web Bluetooth API (design sections 23, 24).
 *
 * The selected device is kept after a link loss so the session can reconnect
 * without a new user gesture; `disconnect()` closes the link but keeps it too.
 */
export class WebBluetoothAdapter implements BleTransport {
  private readonly options: WebBluetoothAdapterOptions;
  private device: WebBluetoothDevice | null = null;
  private characteristic: WebBluetoothCharacteristic | null = null;
  private readonly queue = new NotificationQueue();
  private readonly disconnects = new DisconnectListeners();
  private userDisconnecting = false;

  constructor(options: WebBluetoothAdapterOptions = {}) {
    this.options = options;
  }

  /** Whether this environment exposes the Web Bluetooth API. */
  static isSupported(): boolean {
    return getWebBluetooth() !== null;
  }

  private bluetooth(): WebBluetooth | null {
    return this.options.bluetooth !== undefined ? this.options.bluetooth : getWebBluetooth();
  }

  /** Opens the browser device picker (must be called from a user gesture). */
  async scan(): Promise<readonly BleDevice[]> {
    const bluetooth = this.bluetooth();
    if (bluetooth === null) {
      throw new WebBluetoothUnsupportedError("Web Bluetooth is not available in this browser.");
    }
    // Design section 24: filter by service; optionally also by name prefix.
    const filters: unknown[] = [{ services: [SERVICE_SHORT_UUID] }];
    if (this.options.namePrefixFallback) {
      filters.push({ namePrefix: this.options.namePrefixFallback });
    }
    const device = await bluetooth.requestDevice({ filters, optionalServices: [SERVICE_SHORT_UUID] });
    this.attachDevice(device);
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
    this.userDisconnecting = false;
    this.detachCharacteristic();
    this.queue.reopen();

    const gatt = await device.gatt?.connect();
    if (gatt === undefined) {
      throw new WebBluetoothUnsupportedError("No GATT server on the selected device.");
    }
    // Discovery result is authoritative; handles are never hard-coded
    // (design section 34.5).
    const service = await gatt.getPrimaryService(SERVICE_SHORT_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_SHORT_UUID);
    characteristic.addEventListener("characteristicvaluechanged", this.onValue);
    this.characteristic = characteristic;
    await characteristic.startNotifications();
  }

  async disconnect(): Promise<void> {
    this.userDisconnecting = true;
    this.detachCharacteristic();
    this.queue.close();
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }

  onDisconnect(listener: (error?: Error) => void): () => void {
    return this.disconnects.add(listener);
  }

  async write(data: Uint8Array): Promise<void> {
    const characteristic = this.characteristic;
    if (characteristic === null) {
      throw new Error("WebBluetoothAdapter: write() before connect()");
    }
    // Upstream writes with ESP_GATT_WRITE_TYPE_NO_RSP; fall back when the
    // characteristic only allows acknowledged writes.
    if (characteristic.writeValueWithoutResponse && characteristic.properties?.writeWithoutResponse !== false) {
      await characteristic.writeValueWithoutResponse(data);
    } else if (characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(data);
    } else {
      await characteristic.writeValue(data);
    }
  }

  notifications(): AsyncIterable<Uint8Array> {
    return this.queue.iterable();
  }

  private attachDevice(device: WebBluetoothDevice): void {
    if (this.device !== null && this.device !== device) {
      this.device.removeEventListener("gattserverdisconnected", this.onGattDisconnected);
    }
    if (this.device !== device) {
      device.addEventListener("gattserverdisconnected", this.onGattDisconnected);
    }
    this.device = device;
  }

  private detachCharacteristic(): void {
    this.characteristic?.removeEventListener("characteristicvaluechanged", this.onValue);
    this.characteristic = null;
  }

  private readonly onValue = (event: Event): void => {
    const source = event.target as unknown as WebBluetoothCharacteristic | null;
    const view = source?.value;
    if (!view) {
      return;
    }
    // Copy: the browser may reuse the underlying buffer for the next event.
    this.queue.push(new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)));
  };

  private readonly onGattDisconnected = (): void => {
    this.detachCharacteristic();
    this.queue.close();
    if (this.userDisconnecting) {
      return;
    }
    this.disconnects.emit(new Error("GATT server disconnected"));
  };
}
