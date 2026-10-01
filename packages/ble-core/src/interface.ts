/** A discovered BLE peripheral. */
export interface BleDevice {
  /** Stable, platform-scoped identifier (never assume a MAC address). */
  readonly id: string;
  /** Advertised name, when present. */
  readonly name?: string;
  /** Signal strength in dBm, when the platform reports it. */
  readonly rssi?: number;
}

/**
 * Transport abstraction (design section 28). Implemented by the Web Bluetooth
 * and react-native-ble-plx adapters, and by {@link MockBleTransport}.
 */
export interface BleTransport {
  scan(): Promise<readonly BleDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  /** Write a command frame to the FFE1 characteristic. */
  write(data: Uint8Array): Promise<void>;
  /** Notification fragments streamed from FFE1. */
  notifications(): AsyncIterable<Uint8Array>;
}
