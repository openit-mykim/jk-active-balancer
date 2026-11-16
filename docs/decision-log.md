# Decision Log

Append-only. If a future change materially alters one of these decisions,
update the entry in the same pull request with: old decision, new decision,
evidence/reason, migration impact.

## D001 - Phase 1 scope is JK-B2A16S / JK04 / read-only

Decision: the first version supports exactly one verified device
(`JK-B2A16S`, hardware `3.0`, software `3.3.0`, protocol `JK04`) and is
read-only plus diagnostics. No BMS/JK02/V14/V19/RS485 support.

Reason: design sections 0, 35, 40, 44. Supporting several JK generations at
once collapses parser and write-command confidence.

## D002 - pnpm workspace with exact dependency pins

Decision: a pnpm workspace monorepo; every external dependency is pinned to an
exact version. Caret and tilde ranges are forbidden and enforced by
`scripts/check-pins.mjs` in CI. Internal packages use `workspace:*`.

Reason: design section 32 (dependency pinning) and 36 (release builds require
a lockfile and pinned commits).

## D003 - Upstream pinned at tag 3.0.0 / commit b3016df

Decision: `syssi/esphome-jk-bms` is pinned at tag `3.0.0`, commit
`b3016df3799095c0760e0a578d04dc7185a1c74a`, verified 2026-10-02, recorded in
`docs/upstream-lock.json`. `main` is never tracked automatically.

Reason: design section 33. `main` HEAD (`6a59290...`) is recorded for context
only.

## D004 - Source-first workspace packages

Decision: workspace packages export their TypeScript source
(`exports: "./src/index.ts"`) instead of a built `dist/`. Vite and Vitest
consume the source directly; there is no per-package build step.

Reason: keeps the Phase 1 CI surface small and removes a build-ordering failure
mode. Release builds can add a bundling step later without changing the public
entry points.

## D005 - apps/mobile is scaffolded but excluded from the Phase 1 install

Decision: `apps/mobile` exists with `package.json`, `tsconfig.json` and skeleton
sources, and pins `react-native 0.87.1` / `react-native-ble-plx 3.5.1`, but it
is not a pnpm workspace member (`pnpm-workspace.yaml` lists `apps/web` and
`packages/*`). Its native dependencies are installed when the native build
phase begins.

Reason: design section 5 requires the mobile directory; design section 31 keeps
`android-build` / `ios-build` as separate later jobs. Keeping the heavy native
dependency tree out of the Phase 1 install keeps CI deterministic while the
shared protocol/transport packages are proven.

Migration impact: adding `apps/*` to `pnpm-workspace.yaml` later is a one-line
change and introduces no code changes.

## D006 - FrameAssembler drops consecutive duplicate frames

Decision: `FrameAssembler` discards a frame byte-identical to the immediately
previous emitted frame, by default. `dropConsecutiveDuplicates: false` restores
exact upstream behaviour (upstream decodes every delivered frame).

Reason: duplicate notifications are a documented JK BLE symptom (design section
2.2: corrupted packets, packet queue). Design section 34.10 forbids feeding
corrupted/duplicated data into state. Real status frames change between
notifications, so an exact consecutive repeat is treated as a duplicate.

Migration impact: none for callers that read `push()`'s return value.

## D007 - Fixtures are labelled real vs synthetic, as whitespace hex

Decision: every fixture carries its provenance in the filename suffix
(`.upstream.hex` = transcribed from the pinned upstream source,
`.synthetic.hex` = constructed by this project) and in
`fixtures/jk-b2a16s/README.md`. Fixtures are whitespace-separated hex text, not
raw binary, so they can be reviewed in a diff.

Reason: the task requires that synthetic fixtures are never presented as
measurements. No fixture has been captured on our own hardware yet.

## D008 - oxlint instead of eslint + typescript-eslint

Decision: linting uses `oxlint` (exact pin), not ESLint with
`typescript-eslint`.

Reason: at the time of writing, `typescript-eslint@8.71.0` declares a peer
range of `typescript >=4.8.4 <6.1.0`, which excludes the pinned TypeScript
`7.0.2`. Forcing it would mean an unpinned or downgraded toolchain, both of
which conflict with D002. oxlint needs no TypeScript peer and covers
correctness linting for `.ts`/`.tsx`.

Migration impact: switching to ESLint later is a config-only change.

## D009 - Settings write is interface-only in Phase 1

Decision: `JkSettingsWriter` is defined and exported, but the factory returns
an implementation that rejects every call. `decodeSettings()` throws. No raw
register-write API is exposed.

Reason: design sections 15, 34.6, 34.7. A writable register requires a verified
address, unit, range and read-back verification first.

## D010 - Cell-info statistics follow upstream (computed, not offsets 202/206)

Old decision: `decodeCellInfo()` returned the frame's own floats at offsets 202
(average) and 206 (delta).

New decision: average and delta are computed from the populated cells, exactly
as upstream `decode_jk04_cell_info_()` publishes them; the upstream code keeps
the 202/206 publishes commented out. The raw floats stay available as
`reportedAverageCellVoltage` / `reportedDeltaCellVoltage` for diagnostics. The
pack voltage is exposed as `totalVoltage` (sum of all 24 slots, upstream
`total_voltage`).

Evidence: `syssi/esphome-jk-bms@b3016df` `components/jk_bms_ble/jk_bms_ble.cpp`
lines 815-831. On the upstream fixture the computed average is 3.352661 V vs the
reported 3.352845 V; delta is identical.

Migration impact: `averageCellVoltage` shifts by < 0.2 mV on the fixture.
Frame-type checks (`isCellInfoFrame`, `isDeviceInfoFrame`, `isSettingsFrame`)
now require a full 300-byte frame; previously a 5-byte prefix passed and the
decoder threw a `RangeError` reading past the end (pre-existing defect).

## D011 - Settings read enabled; write whitelist = JK04 balancer switch, gated

Old decision (D009): `decodeSettings()` threw; the writer rejected every call.

New decision:
- `decodeSettings()` decodes the six fields upstream `decode_jk04_settings_()`
  names (cell count 34, power-off voltage 38, start balance voltage 98, trigger
  delta 106, max balance current 110, balancer switch 114) and is verified on
  the upstream example frame. NOT HARDWARE VERIFIED.
- Write whitelist: only the balancer switch, register `0x6C`, length 1 (upstream
  `SWITCHES[CONF_BALANCER]` JK04 column). Upstream lists `0x00` (unsupported)
  for every JK04 number register, so balance start / delta voltage writes reject
  with `SettingsWriteUnsupportedError` permanently for JK04.
- `createSettingsWriter({ profile, send, readSettings })` writes only when the
  profile grants `settingsWrite && balancerSwitch`, and confirms by read-back.
  `JK_B2A16S_PROFILE` keeps both `false` until a physical read-back test passes.
  Unknown hardware revisions never get a writer (diagnostic mode).

Reason: design sections 15, 35 (settings read is a Must), 36 (write -> readback).

## D012 - BmsSession owns the connection lifecycle; transports report link loss

Decision: `@jk-active-balancer/ble-core` adds `BmsSession`, which drives the
design section 18 state machine (connect, identify with 0x97 and a 5 s timeout,
profile resolution, 0x96, streaming), re-sends 0x96 until status arrives (as
upstream `update()` does), runs the section 20 watchdog (stale > 5 s, stalled
> 15 s -> reconnect) and the section 19 backoff (1, 2, 4, 8, 15, 30 s; manual
reconnect skips it). `BleTransport` gains `onDisconnect()`; `connect()` may be
called again after a link loss. All three transports (Web Bluetooth,
react-native-ble-plx, mock) implement it.

Reason: before this, the state machine, reconnect policy and pipeline existed
but nothing wired them together, the Web adapter could not detect a dropped
link, and the React Native adapter could not connect at all (its device factory
always threw).

## D013 - apps/mobile is a standalone React Native 0.87.1 npm project

Old decision (D005): `apps/mobile` was a skeleton (no native project) and not a
workspace member; its native dependencies would arrive "with the native build
phase".

New decision: this is that phase. `apps/mobile` now holds the React Native
0.87.1 Android and iOS projects (from `@react-native-community/template@0.87.1`,
renamed to `com.jkactivebalancer` / `jkActiveBalancer`) and is installed with
**npm** (`apps/mobile/package-lock.json`), still outside the pnpm workspace.
The shared packages are consumed as TypeScript source through Metro
`extraNodeModules` and tsconfig `paths`, so `workspace:*` is no longer used
there. All versions are exact (D002).

- `react` is pinned to `19.2.3` in the mobile app (not the web app's `19.3.0`):
  React Native's bundled renderer refuses a different React version at runtime.
  The previous skeleton pinned `19.3.0` (pre-existing defect, never exercised
  because nothing was installed).
- Android 12+ uses `BLUETOOTH_SCAN` (`neverForLocation`) + `BLUETOOTH_CONNECT`;
  Android <= 11 uses legacy Bluetooth + fine location, `maxSdkVersion=30`.
- iOS: `NSBluetoothAlwaysUsageDescription` and `bluetooth-central` background
  mode (design section 22).
- Demo mode replays `src/fixtures.generated.ts`, generated from `fixtures/`
  by `npm run gen:fixtures`; a root vitest test fails on drift.
- CI gains `android-build` (ubuntu, JDK 21, `assembleRelease`) and `ios-build`
  (macOS, `pod install`, unsigned simulator build) (design section 31).

Reason: keeps pnpm's symlinked layout away from React Native autolinking and
keeps the web/package CI install unchanged, while giving design section 35
"Android build" / "iOS build" a real project.

Migration impact: none for `packages/*` or `apps/web`. Release signing is not
configured; the APK CI produces is signed with the template debug key and is
not for distribution.

## D014 - Default target device is JK-B4A24S; protocol confirmed by capture first

Old decision (D001): the only target is JK-B2A16S / hardware 3.0 / JK04.

New decision: the owner's device, **JK-B4A24S**, is the default target the apps
present (`DEFAULT_TARGET_PROFILE`). The JK-B2A16S JK04 profile stays as is.

Evidence and limits:
- Upstream `syssi/esphome-jk-bms` (3.0.0 and `main`, checked 2026-11-16) and
  its issue tracker have no JK-B4A24S report. Relatives differ: JK-B5A24S
  hw 8.x -> JK04, JK-B2A24S hw 10.x -> JK02_24S, hw 11.x -> JK02_32S.
- Seller specification (owner-provided image, 2026-11-16): 8S-24S, 4 A active
  balancing, Bluetooth only (no RS485 / CAN / NTC), same product line as
  JK-B2A8S / JK-B2A16S. This makes JK04 likely but is not protocol evidence
  (design section 43).

Therefore `JK_B4A24S_PROFILE` has `protocol: "UNKNOWN"`, `maxCells: 24` and no
decode or write capability. The device is identified through the shared 0x03
device-info frame, and every other frame is captured raw (latest frame per type
kept in `SessionSnapshot.capturedFrames` and always included, passcode masked,
in the debug export). `cellLayoutHint()` reports whether a captured cell-info
frame reads plausibly as JK04 (float32 V) or JK02 (uint16 mV); it is a hint for
a person and never enables decoding.

Also fixed (pre-existing, from D012): `BmsSession` decoded cell-info / settings
frames with the JK04 layout even in diagnostic mode. Decoding now requires a
`verified` profile.

Next: capture from the physical JK-B4A24S, add `*.captured.hex` fixtures,
compare against the official app, then set the profile's protocol, revisions
and capabilities in a new decision.
