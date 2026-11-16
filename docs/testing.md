# Testing

## Commands

```bash
pnpm install
pnpm test          # vitest run - all packages
pnpm typecheck     # tsc --noEmit over the whole workspace
pnpm lint          # oxlint
pnpm build:web     # vite build for the PWA
pnpm check:pins    # reject ^ / ~ dependency ranges
bash scripts/verify.sh   # all of the above, in order
```

## What is covered

`packages/jk-protocol/tests`:

- `crc.test.ts` - `sum8`, command checksum, response checksum
- `frame-builder.test.ts` - 20-byte command frames, byte-for-byte
- `frame-assembler.test.ts` - split, pending, duplicate, out-of-order,
  truncated, bad-header, bad-checksum, overflow
- `decoder-device-info.test.ts` - real upstream JK-B2A16S device-info frame
- `decoder-status.test.ts` - real upstream cell-info frame + a synthetic
  unbalanced frame
- `decoder-settings.test.ts` - settings frame against the upstream example
- `profile.test.ts` - profile selection, HW-revision resolution / diagnostic mode, hex helpers
- `settings-write.test.ts` - balancer-switch command bytes, capability gating,
  read-back verification, unsupported JK04 registers, no raw write API

`packages/ble-core/tests`:

- `session.test.ts` - `BmsSession` end to end on `MockBleTransport` with fake
  timers: lifecycle order, diagnostic mode, corrupt frames keep state,
  STALE/stalled watchdog, link-loss reconnect, 1/2/4 s backoff, manual
  reconnect, user disconnect, identify timeout, 0x96 retry, settings read,
  raw logger on/off
- `debug-export.test.ts` - file name, contents, passcode masking, no RX export
- `watchdog-replay.test.ts` - freshness thresholds, fragmented fixture replay
- `packet-pipeline.test.ts`, `connection-manager.test.ts`, `reconnect-policy.test.ts`

Adapters: `packages/ble-web/tests/adapter.test.ts` (fake GATT: filters,
namePrefix fallback, copied notifications, link loss vs user disconnect,
reconnect) and `packages/ble-react-native/tests/adapter.test.ts` (fake
BleManager: connect, notifications, disconnect events, scan errors, base64).

`packages/device-model`, `packages/ui-common`: statistics, active-cell-count
priority, history/CSV, cell grid layout and colour thresholds.

`apps/mobile/src/fixtures.generated.test.ts` keeps the mobile demo fixtures in
sync with `fixtures/`.

Mobile (not part of `pnpm test`):

```bash
cd apps/mobile && npm ci && npm run typecheck
cd android && ./gradlew assembleRelease
```

## Fixture policy

Every fixture states its provenance (real upstream-transcribed vs synthetic) in
its filename and in `fixtures/jk-b2a16s/README.md`. A synthetic fixture is never
reported as a device measurement.

## Hardware validation

No test in this repository has been run against a physical JK-B2A16S yet.
Physical capture is a Phase 1 acceptance item (design sections 25, 37 step 9).
Device-dependent work must say `NOT HARDWARE VERIFIED` rather than imply
otherwise.
