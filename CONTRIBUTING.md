# Contributing

jk-active-balancer is developed with a strong preference for small, reviewable
changes and explicit verification.

Before contributing, read `AGENTS.md`, `PROJECT_STATUS.md`,
`docs/protocol-design.md` and `docs/testing.md`.

## Workflow

1. Start from current `origin/main`.
2. Create a focused branch (`feat/...`, `fix/...`, `refactor/...`, `test/...`,
   `docs/...`, `chore/...`).
3. Keep the change limited to one primary concern.
4. Run `bash scripts/verify.sh` before opening a PR.
5. Open a PR with sections: Summary, Why, Testing, Safety impact, Follow-up.
6. Update documentation if architecture, workflow or supported behaviour changed.

## Commit messages

Conventional Commits are preferred:

```text
feat(protocol): decode JK04 cell-info frame
fix(web): handle missing Web Bluetooth support
test(assembler): cover out-of-order fragments
chore(deps): pin vite to 8.3.2
```

## Dependencies

Exact versions only - never `^` or `~`. `pnpm check:pins` enforces this in CI.

## Device-dependent work

If a change depends on a physical balancer, state the tested model/firmware and
platform. If no hardware was available, mark the PR `NOT HARDWARE VERIFIED`
rather than implying verification.

## Scope discipline

Do not combine unrelated refactors, dependency upgrades and feature work into
one PR. Never add a settings write path in Phase 1 - it is Phase 2 and
whitelist-only.
