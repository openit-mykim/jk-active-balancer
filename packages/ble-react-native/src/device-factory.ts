import type { BleManagerLike, DeviceLike } from "./react-native-ble-plx-adapter";

/**
 * Factory seam so the adapter can be unit-tested with a fake manager.
 *
 * The mobile app replaces this with a `BleManager.connectToDevice` call once
 * the pinned native dependency is wired in (design section 21). Phase 1 keeps
 * it structural, with no `react-native-ble-plx` import here.
 */
export interface DeviceConnector {
  createDevice(manager: BleManagerLike, deviceId: string): DeviceLike;
}

/** Default connector: not wired to a native manager in this build. */
export function createDevice(_manager: BleManagerLike, deviceId: string): DeviceLike {
  throw new Error(
    `ReactNativeBlePlxAdapter: device ${deviceId} cannot be created without a native BleManager binding (Phase 1 skeleton).`,
  );
}
