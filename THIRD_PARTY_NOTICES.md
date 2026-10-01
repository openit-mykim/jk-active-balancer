# Third-Party Notices

## syssi/esphome-jk-bms

The JK04 protocol facts, packet layouts and example frames used by this project
come from the field-validated implementation in `syssi/esphome-jk-bms`.

- Project: esphome-jk-bms
- Upstream repository: `https://github.com/syssi/esphome-jk-bms`
- Tag: `3.0.0`
- Commit: `b3016df3799095c0760e0a578d04dc7185a1c74a`
- License: Apache-2.0
- Verified: 2026-10-02

The verbatim Apache-2.0 license text is preserved at
`THIRD_PARTY_LICENSES/syssi-esphome-jk-bms-LICENSE`.

**No upstream source code was copied into this repository.** Only constant
values, packet-layout facts and documented example frames were transcribed into
an independent TypeScript implementation. The device-info, cell-info and
settings fixtures under `fixtures/jk-b2a16s/` are transcriptions of the upstream
documented examples (see `fixtures/jk-b2a16s/README.md` for the real-vs-synthetic
table).

## encap/better-bms-app

Referenced for Web Bluetooth UX patterns only (design section 2.2).

- Upstream repository: `https://github.com/encap/better-bms-app`
- License: **none declared**

Because the project has no license, **no code from it is reused** in this
repository.

## Third-party runtime dependencies

Runtime dependencies (React, React Native, Vite, Vitest, and so on) are listed
in the respective `package.json` files with their own licenses. This project is
MIT licensed; see `LICENSE`.

## Trademarks

This is an unofficial community project and is not affiliated with or endorsed
by JiKong (JIKONG).
