# apps/mobile (skeleton)

React Native shell for the JK-B2A16S active balancer app (Android/iOS).

Phase 1 status:

- Structure, `package.json` and `tsconfig.json` only (design section 5).
- `react-native` and `react-native-ble-plx` are pinned to exact versions here
  but are **not installed by the Phase 1 workspace install**: `apps/mobile` is
  deliberately not a pnpm workspace member yet (docs/decision-log.md D005). The
  native toolchain arrives with the android-build / ios-build phase.
- BLE access goes through `@jk-active-balancer/ble-react-native`, which takes
  the `BleManager` from `react-native-ble-plx` and never hard-codes GATT
  handles (design section 34.5).

The shared protocol, transport and UI-layout packages are the same ones the web
app uses; only the transport binding differs.
