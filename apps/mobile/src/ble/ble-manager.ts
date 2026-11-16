import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State } from "react-native-ble-plx";
import { ReactNativeBlePlxAdapter, type BleManagerLike } from "@jk-active-balancer/ble-react-native";

let shared: BleManager | null = null;

/** One BleManager per process (react-native-ble-plx requirement). */
export function getBleManager(): BleManager {
  if (shared === null) {
    shared = new BleManager();
  }
  return shared;
}

/** Build the mobile BLE transport over the shared manager. */
export function createBleAdapter(): ReactNativeBlePlxAdapter {
  return new ReactNativeBlePlxAdapter(getBleManager() as unknown as BleManagerLike);
}

/**
 * Runtime Bluetooth permissions (design section 21):
 * Android 12+ -> BLUETOOTH_SCAN + BLUETOOTH_CONNECT; Android <= 11 -> fine
 * location for scanning. iOS prompts on first use (NSBluetoothAlwaysUsageDescription).
 */
export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }
  const api = typeof Platform.Version === "number" ? Platform.Version : Number.parseInt(String(Platform.Version), 10);
  const wanted =
    api >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

/** Subscribe to adapter power state; returns an unsubscribe function. */
export function onBluetoothStateChange(listener: (poweredOn: boolean) => void): () => void {
  const subscription = getBleManager().onStateChange((state) => listener(state === State.PoweredOn), true);
  return () => subscription.remove();
}
