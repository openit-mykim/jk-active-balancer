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
- `profile.test.ts` - JK-B2A16S profile selection and capability flags
- `settings-write.test.ts` - the Phase 1 read-only guarantee

`packages/device-model`, `packages/ble-core`, `packages/ui-common`,
`packages/ble-web`, `packages/ble-react-native` add domain statistics, reconnect
policy, connection state machine, packet pipeline (driven by `MockBleTransport`)
and cell-grid layout tests.

## Fixture policy

Every fixture states its provenance (real upstream-transcribed vs synthetic) in
its filename and in `fixtures/jk-b2a16s/README.md`. A synthetic fixture is never
reported as a device measurement.

## Hardware validation

No test in this repository has been run against a physical JK-B2A16S yet.
Physical capture is a Phase 1 acceptance item (design sections 25, 37 step 9).
Device-dependent work must say `NOT HARDWARE VERIFIED` rather than imply
otherwise.
