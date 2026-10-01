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
