import { ReactNativeBlePlxAdapter, type BleManagerLike } from "@jk-active-balancer/ble-react-native";

/**
 * Build the mobile BLE adapter from a `react-native-ble-plx` BleManager.
 *
 * The manager is passed in by the app entry point (see `index.js`) so this
 * module stays free of a native import and can be reasoned about in isolation.
 */
export function createBleAdapter(manager: BleManagerLike): ReactNativeBlePlxAdapter {
  return new ReactNativeBlePlxAdapter(manager);
}
