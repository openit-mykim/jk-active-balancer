/**
 * Minimal structural types for the Web Bluetooth API.
 *
 * `lib.dom` does not ship Web Bluetooth types, and pulling `@types/web-bluetooth`
 * would add a dependency for a surface we use narrowly. These declarations
 * cover only the members this adapter touches.
 */

export interface WebBluetoothCharacteristic {
  value: DataView | null;
  startNotifications(): Promise<WebBluetoothCharacteristic>;
  writeValueWithoutResponse(value: Uint8Array): Promise<void>;
  writeValue(value: Uint8Array): Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
}

export interface WebBluetoothService {
  getCharacteristic(characteristic: string | number): Promise<WebBluetoothCharacteristic>;
}

export interface WebBluetoothGattServer {
  connected: boolean;
  connect(): Promise<WebBluetoothGattServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<WebBluetoothService>;
}

export interface WebBluetoothDevice {
  id: string;
  name?: string;
  gatt?: WebBluetoothGattServer;
  addEventListener(type: string, listener: (event: Event) => void): void;
}

export interface WebBluetooth {
  getAvailability?(): Promise<boolean>;
  requestDevice(options: unknown): Promise<WebBluetoothDevice>;
}

/** Return `navigator.bluetooth`, or `null` where the API is unavailable. */
export function getWebBluetooth(): WebBluetooth | null {
  const nav = globalThis.navigator as { bluetooth?: WebBluetooth } | undefined;
  return nav?.bluetooth ?? null;
}
