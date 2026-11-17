# jk-active-balancer

[한국어 README](README.ko.md)

Unofficial open-source monitor for JiKong smart active balancers. Default device: **JK-B4A24S** (8S-24S, 4 A; protocol capture pending, decision D014). Upstream-documented profile: **JK-B2A16S** (JK04).
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

Out of scope for Phase 1: any other JK model, and **enabled** settings write.
The write path exists for the one register upstream defines for JK04 (balancer
switch `0x6C`), with read-back verification, but stays disabled by the device
profile until it is verified on hardware (design section 15, decision D011).
Balance start / delta voltage have no JK04 write register upstream.

## Monorepo layout

```text
jk-active-balancer/
├─ apps/
│  ├─ web/                    Vite + React + TS, Web Bluetooth PWA
│  └─ mobile/                 React Native 0.87.1 app (Android + iOS), npm project
├─ packages/
│  ├─ jk-protocol/            JK04 constants, CRC, frames, decoders, profile
│  ├─ ble-core/               BleTransport, BmsSession, watchdog, logger, debug export, mock
│  ├─ ble-web/                Web Bluetooth adapter
│  ├─ ble-react-native/       react-native-ble-plx adapter
│  ├─ device-model/           domain model, statistics, history / CSV
│  └─ ui-common/              cell-grid layout, colour thresholds
├─ fixtures/jk-b2a16s/        device-info / settings / status / malformed
├─ scripts/                   verify.sh, check-pins.mjs
├─ docs/                      protocol design, decision log, upstream lock
└─ .github/workflows/ci.yml   lint, typecheck, unit-test, web-build, android-build, ios-build
```

`apps/mobile` is a standalone npm project outside the pnpm workspace, so the
package/web install stays small and deterministic; it consumes `packages/*` as
TypeScript source through Metro (`docs/decision-log.md` D005, D013). See
`apps/mobile/README.md`.

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

Phase 1 software is implemented: JK04 codec, settings / device-info / cell-info
decoders, connection session with reconnect and watchdog, raw logger, debug
export, fixture replay, the Web Bluetooth dashboard and the React Native app.
Everything is tested against upstream-documented frames; **nothing has been
verified on a physical JK-B2A16S yet**. See `PROJECT_STATUS.md`.

## Safety

Settings write can affect battery safety. The shipped profile therefore never
writes to the device. Any future write path must be capability-gated, whitelisted, staged,
validated and read back; a successful BLE write alone is not evidence that a
setting is correct.

This is an unofficial community project, not affiliated with or endorsed by
JiKong (JIKONG).

## License

MIT. See `LICENSE`.
