# jk-active-balancer

[한국어 README](README.ko.md)

Unofficial open-source monitor for the **JiKong JK-B2A16S 2S-16S 2A Smart Active Balancer**.
Android and iOS via React Native, plus a Chrome (Web Bluetooth) PWA.

> **Agent handoff:** if you are Hermes or another coding agent, read `AGENTS.md`
> first, then `PROJECT_STATUS.md`. The repository is prepared so work can
> continue from this GitHub path alone.

## Phase 1 scope

Exactly one verified device, read-only:

```text
Model     JK-B2A16S
Hardware  3.0
Software  3.3.0
Protocol  JK04
Service   FFE0   Characteristic FFE1
```

In scope: scan, connect, auto reconnect, device info, JK04 auto detection,
cell 1..16 voltages, min/max/delta/average, balancer status and current,
settings read, raw packet logger, fixture replay, and the Android / iOS / PWA
builds.

Out of scope for Phase 1: **settings write** and any other JK model. Settings
write is Phase 2 and whitelist-only (design section 15); the interface exists
(`JkSettingsWriter`) but every method rejects.

## Monorepo layout

```text
jk-active-balancer/
├─ apps/
│  ├─ web/                    Vite + React + TS, Web Bluetooth PWA
│  └─ mobile/                 React Native skeleton
├─ packages/
│  ├─ jk-protocol/            JK04 constants, CRC, frames, decoders, profile
│  ├─ ble-core/               BleTransport, state machine, reconnect, pipeline, mock
│  ├─ ble-web/                Web Bluetooth adapter
│  ├─ ble-react-native/       react-native-ble-plx adapter (structural)
│  ├─ device-model/           battery / cell / balancer domain model
│  └─ ui-common/              cell-grid layout helpers
├─ fixtures/jk-b2a16s/        device-info / settings / status / malformed
├─ scripts/                   verify.sh, check-pins.mjs
├─ docs/                      protocol design, decision log, upstream lock
└─ .github/workflows/ci.yml   lint, typecheck, unit-test, web-build
```

`apps/mobile` is scaffolded but is not a pnpm workspace member yet, so the
Phase 1 install stays small and deterministic (`docs/decision-log.md` D005).

## Development

Requirements: Node >= 22.12 (developed on Node 26.8.1) and pnpm 12.8.1.

```bash
pnpm install
pnpm test          # vitest
pnpm typecheck
pnpm lint
pnpm build:web     # vite build
bash scripts/verify.sh   # all of the above
```

Dependencies are pinned to exact versions; `pnpm check:pins` rejects `^` / `~`
(design section 32).

## Protocol provenance

Protocol facts, packet layouts and example frames come from
`syssi/esphome-jk-bms`:

```text
tag 3.0.0   commit b3016df3799095c0760e0a578d04dc7185a1c74a   Apache-2.0
```

No upstream source code was copied. See `THIRD_PARTY_NOTICES.md`,
`THIRD_PARTY_LICENSES/` and `docs/upstream-lock.json`.

`encap/better-bms-app` is referenced for Web Bluetooth UX only. It has **no
license**, so no code from it may be reused.

## Current state

Early Phase 1 scaffold. The JK04 codec, the fragment assembler, the device-info
and cell-info decoders and the domain/transport layers are implemented and
covered by tests against real upstream frames. Hardware capture and the native
builds are tracked in `PROJECT_STATUS.md`.

## Safety

Settings write can affect battery safety. Phase 1 therefore never writes to the
device. Any future write path must be capability-gated, whitelisted, staged,
validated and read back; a successful BLE write alone is not evidence that a
setting is correct.

This is an unofficial community project, not affiliated with or endorsed by
JiKong (JIKONG).

## License

MIT. See `LICENSE`.
