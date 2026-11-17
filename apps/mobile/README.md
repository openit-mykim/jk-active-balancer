# apps/mobile

React Native 0.87.1 app for the JK-B2A16S active balancer (Android / iOS).
Unofficial; not affiliated with JiKong. **NOT HARDWARE VERIFIED.**

Standalone **npm** project, outside the pnpm workspace (decisions D005, D013).
The shared packages (`packages/*`) are consumed as TypeScript source via Metro
`extraNodeModules` and tsconfig `paths`.

## Run

```bash
cd apps/mobile
npm ci
npm run typecheck
npm start                 # Metro
npm run android           # debug build on a connected device / emulator
npm run ios               # macOS only: cd ios && pod install first
```

Release APK (signed with the template **debug** key - not for distribution):

```bash
cd apps/mobile/android && ./gradlew assembleRelease
# -> app/build/outputs/apk/release/app-release.apk
```

## What the app does

- Scan (FFE0 service filter) with name / RSSI / platform id, connect, disconnect.
- `BmsSession` lifecycle: identify (0x97), profile resolution (unknown HW ->
  read-only diagnostic mode), streaming (0x96), watchdog STALE badge, automatic
  reconnect with backoff, manual "Reconnect now".
- Re-check on app foreground; reconnect when Bluetooth turns back ON.
- Pack voltage, average, min/max, delta, balancer switch + activity, balance
  current, cell grid (8 cells/column, up to 3 columns).
- Read-only balancer settings. Writes stay disabled until hardware read-back.
- Raw packet logger and a shareable debug report (passcode masked).
- Demo mode: replays the repository fixtures (`src/fixtures.generated.ts`,
  regenerate with `npm run gen:fixtures`).

## Permissions

- Android 12+: `BLUETOOTH_SCAN` (neverForLocation), `BLUETOOTH_CONNECT`.
- Android 11 and older: `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION`.
- iOS: `NSBluetoothAlwaysUsageDescription`, background mode `bluetooth-central`.
