# Project Status

Last updated: 2026-10-02

## Current phase

**Phase 1 scaffold complete - JK04 read-only codec implemented and tested; no
hardware validation yet.**

Phase 1 target is fixed: `JK-B2A16S` / hardware `3.0` / software `3.3.0` /
protocol `JK04` / read-only + diagnostics (design sections 0, 35, 44).

## What exists

- pnpm workspace monorepo with the design section 5 layout.
- `@jk-active-balancer/jk-protocol`: JK04 constants, `sum8` CRC, 20-byte command
  builder, `FrameAssembler`, device-info and cell-info decoders, JK-B2A16S
  profile, Phase 2 settings-write interface.
- `@jk-active-balancer/device-model`, `ble-core` (transport interface, state
  machine, reconnect policy, packet pipeline, `MockBleTransport`), `ble-web`,
  `ble-react-native`, `ui-common`.
- `apps/web`: Vite + React + TypeScript PWA that builds.
- `apps/mobile`: React Native skeleton (structure, `package.json`, `tsconfig`).
- Fixtures for device-info / settings / status / malformed, with provenance.
- Docs: protocol design, decision log, dependency pins, architecture, testing,
  upstream lock.
- CI: lint, typecheck, unit-test, web-build on `main` and feature branches.

## Verified evidence

- `pnpm test` passes locally (see the run output recorded in the PR/commit
  message for this scaffold).
- `pnpm --filter web build` succeeds locally.
- CI is green on `main`.

Hardware validation status: **NOT HARDWARE VERIFIED**. No fixture was captured
from a physical JK-B2A16S.

## Immediate next action

1. Capture real JK-B2A16S JK04 frames with a physical device (design section 37
   step 9) and add them as `*.captured.hex` fixtures with a provenance entry.
2. Implement the settings **read** path (frame type 0x01) against the real
   capture; keep the decoder throwing until it is verified.
3. Wire the Web Bluetooth adapter to the dashboard and verify against hardware.
4. Add the Android / iOS build jobs (design section 31) once `apps/mobile` joins
   the workspace install.

## Phase checklist

- [x] Repository created: `openit-mykim/jk-active-balancer`
- [x] MIT license selected
- [x] Agent execution contract added
- [x] Upstream pinned (tag 3.0.0 / commit b3016df)
- [x] pnpm workspace scaffold (design section 5)
- [x] JK04 constants + CRC + command builder
- [x] Frame assembler with split/duplicate/out-of-order/malformed handling
- [x] Device-info decoder against the real upstream frame
- [x] Cell-info (status) decoder against the real upstream frame
- [x] Device profile + capability model
- [x] BLE transport interface + mock transport + packet pipeline
- [x] Web Bluetooth and react-native-ble-plx adapters (skeleton)
- [x] Cell grid layout (8 cells/column, up to 3 columns)
- [x] CI: lint / typecheck / unit-test / web-build
- [x] Dependency pin check (no ^ / ~)
- [ ] Physical JK-B2A16S capture and fixtures
- [ ] Settings read path verified
- [ ] Android build / iOS build jobs
- [ ] Web dashboard wired to a real connection

## Product decisions already made

- Primary transport: BLE (Web Bluetooth on Chrome, react-native-ble-plx on
  mobile).
- Local-first; no account or cloud.
- JK-B2A16S / JK04 only in Phase 1.
- Read-only in Phase 1; settings write is Phase 2, whitelist-only.
- Dependency versions are exact; upstream is pinned by tag and commit.
- `apps/mobile` is not yet a workspace member (decision D005).
