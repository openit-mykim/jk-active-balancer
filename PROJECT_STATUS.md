# Project Status

Last updated: 2026-11-16

## Current phase

**Phase 1 software complete - NOT HARDWARE VERIFIED. Default target is now the
owner's JK-B4A24S (D014), whose BLE protocol is not confirmed yet: the apps
identify it and capture raw frames only.**

Every design section 35 "Must" item is implemented in software and tested
against upstream-documented frames, the web PWA builds, and the Android release
APK builds and runs (demo mode) on a physical phone. No physical JK-B2A16S has
been connected yet, so the section 36 acceptance criteria are still open.

Phase 1 target is fixed: `JK-B2A16S` / hardware `3.0` / software `3.3.0` /
protocol `JK04` / read-only + diagnostics (design sections 0, 35, 44).

## What exists

- `jk-protocol`: JK04 constants, `sum8`, command builder, `FrameAssembler`,
  device-info / cell-info / **settings** decoders, revision-aware
  `resolveProfile()` (unknown HW -> read-only diagnostic mode), JK04 write
  whitelist (balancer switch `0x6C`) with read-back, gated off (D010, D011).
- `ble-core`: `BmsSession` (lifecycle, identify, 0x96 retry, watchdog,
  reconnect backoff, manual reconnect), `RawPacketLogger`, `buildDebugExport()`,
  fixture replay, `MockBleTransport` (D012).
- `ble-web`: Web Bluetooth adapter with link-loss detection, reconnect,
  namePrefix dev fallback.
- `ble-react-native`: react-native-ble-plx adapter (connect, monitor,
  disconnect events, scan errors).
- `device-model`: statistics, active-cell-count priority (41.2), history + CSV.
- `ui-common`: 8 cells/column grid (1..24S), configurable colour thresholds.
- `apps/web`: live dashboard (connection, device/profile, pack stats, cell grid,
  cell detail, history + CSV, read-only settings, raw log, debug export,
  fixture-replay demo).
- `apps/mobile`: React Native 0.87.1 Android + iOS projects, same features,
  BLE permissions, foreground re-check, Bluetooth ON reconnect (D013).
- CI: lint, typecheck, unit-test, web-build, android-build, ios-build.

## Verified evidence (2026-11-16)

- `bash scripts/verify.sh`: pins, lint, typecheck, 115 unit tests, web build pass.
- Web dashboard driven in headless Chrome with the demo transport: STREAMING,
  values match fixtures, disconnect -> IDLE, no page errors.
- `apps/mobile`: `npm run typecheck` passes; `./gradlew assembleRelease
  -PreactNativeArchitectures=arm64-v8a` succeeds; the APK installed on an
  LG-F800S (Android 9) reaches STREAMING in demo mode and renders device,
  pack and 16S grid.
- Not run: iOS build (needs macOS; CI job added, not yet observed green), real
  BLE scan/connect on a phone, any JK-B2A16S hardware.

Hardware validation status: **NOT HARDWARE VERIFIED**.

## Immediate next action

0. JK-B4A24S (default target, D014): connect with the APK (Android) or the web
   app (Chrome on Android / desktop), wait until the "Protocol capture" panel
   lists CELL_INFO and SETTINGS, share/export the capture JSON. From it: add
   `fixtures/jk-b4a24s/*.captured.hex`, confirm the protocol against the
   official app, then enable a decoder for the profile in a new decision.
1. Connect a physical JK-B2A16S (web on Chrome/Android, and the APK); capture
   device-info / settings / cell-info frames with the raw logger and add them
   as `*.captured.hex` fixtures with provenance (design section 37 step 9).
2. Run the section 36 acceptance checks: identification, cell values vs the
   official app, 30-minute stability, Bluetooth OFF -> ON reconnect, corrupt
   frame handling.
3. Observe the `android-build` and `ios-build` CI jobs green.
4. Only after a physical read-back test: enable `balancerSwitch` /
   `settingsWrite` in the profile and add a balancer ON/OFF control.

## Phase checklist (design section 35)

Must:

- [x] Scan / Connect / Disconnect / Auto reconnect (software; NOT HARDWARE VERIFIED)
- [x] Device info, JK04 auto detection, unknown-revision diagnostic mode
- [x] Cell 1..16 voltage, min, max, delta, balancer status, balancer current
- [x] Settings read (upstream example frame)
- [x] Raw packet logger, debug export, fixture replay
- [x] Chrome PWA build
- [x] Android build (local release APK; CI job added)
- [ ] iOS build (project + CI job added; not built - no macOS here)
- [ ] Physical JK-B2A16S capture and section 36 acceptance

Should:

- [ ] Balancer ON/OFF write (encoder + read-back done, disabled until hardware test)
- [x] Balance start / delta voltage write - **not possible over JK04** (no upstream register; D011)
- [x] History chart, CSV export (web)

## Supported products (D015)

| Model | Cells | Balance | BLE protocol |
|---|---|---|---|
| JK-B2A8S | 4-8S | 2 A | capture pending |
| JK-B2A16S | 8-16S | 2 A | JK04 (upstream) |
| JK-DZ11B2A24S | 8-24S | 2 A | capture pending (upstream: RS485 only) |
| JK-DZ08B2A24S | 8-24S | 2 A | capture pending |
| JK-B4A24S (default) | 8-24S | 4 A | capture pending |

The UI adapts to each product (grid columns, range warning, rated current,
interface badges); every product can be previewed with SYNTHETIC frames.

## Product decisions already made

- Default target device: JK-B4A24S, capture-first (D014); JK-B2A16S remains the verified-by-upstream JK04 profile.
- Five products supported with spec-driven UI; protocols other than JK-B2A16S are confirmed by capture (D015).
- UI follows jbd-bms-manager: app bar + 개요/상세/밸런스/제어/설정 + 장치 screen, Korean/English (D016).
- Wiki mobile standard applied (tokens, persisted prefs with schema version, a11y, i18n, release guard) — `docs/mobile-standard-audit.md` (D017). Stack exception (RN) awaits approval: `docs/adr/0001-mobile-stack-exception.md`.
- Local crash log, a11y audit 0 issues (device + axe), nav 14-61 ms, release signing via env (D018).
- Primary transport: BLE (Web Bluetooth on Chrome, react-native-ble-plx on mobile).
- Local-first; no account or cloud.
- JK-B2A16S / JK04 only in Phase 1.
- Settings write whitelist-only and disabled until hardware read-back.
- Dependency versions are exact; upstream is pinned by tag and commit.
- `apps/mobile` is a standalone npm project outside the pnpm workspace (D013).
