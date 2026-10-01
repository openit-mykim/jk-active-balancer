# Hermes Project Entry Point

Repository: `openit-mykim/jk-active-balancer`

Prepared so a Hermes Agent can resume work from the repository URL alone.

## Start here

Read in this order before editing:

1. `AGENTS.md`
2. `PROJECT_STATUS.md`
3. `docs/architecture.md`
4. `docs/protocol-design.md`
5. `docs/decision-log.md`
6. `docs/testing.md`
7. `docs/dependency-pins.md`
8. `docs/upstream-lock.json`

`AGENTS.md` is authoritative. `PROJECT_STATUS.md` gives the active phase and
immediate next action.

## Agent role

Hermes is the coordinator. Use Paseo worktrees for non-trivial implementation,
review, tests, documentation and investigation when work can be separated
safely.

Hermes should:

- inspect the repository before planning changes;
- continue the active phase rather than jumping ahead;
- keep tasks narrow enough for independent worktrees;
- require verification evidence from each delegated task;
- review diffs before merge;
- keep architecture/status documentation synchronised;
- prefer small, reviewable pull requests over large mixed changes.

## Current first objective

See `PROJECT_STATUS.md`. Immediately after this scaffold the next work is
physical JK-B2A16S capture and the settings-read path, still without writing to
the device.

Upstream reference:

- repository: `syssi/esphome-jk-bms`
- tag: `3.0.0`
- commit: `b3016df3799095c0760e0a578d04dc7185a1c74a`
- license: Apache-2.0

## Work completion rule

A task is complete only when the requested change is implemented, the relevant
checks have been run, failures are explained rather than hidden, the diff has
been reviewed, hardware validation status is explicit when BMS behaviour
matters, and the next task remains clear from repository state.
