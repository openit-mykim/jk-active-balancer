# Third-party licenses

This directory holds the verbatim license texts of upstream projects whose
protocol facts, packet layouts or test fixtures influenced this repository.

- `syssi-esphome-jk-bms-LICENSE` — Apache License 2.0, the license of
  `syssi/esphome-jk-bms` (tag 3.0.0, commit
  `b3016df3799095c0760e0a578d04dc7185a1c74a`).

No upstream source code was copied into this repository. Only constant values,
packet-layout facts and documented example frames were transcribed into an
independent TypeScript implementation, with the upstream license and commit
recorded in `docs/upstream-lock.json`, `THIRD_PARTY_NOTICES.md` and
`fixtures/jk-b2a16s/README.md`.
