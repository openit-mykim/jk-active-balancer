#!/usr/bin/env bash
# Local verification gate. Mirrors the CI jobs in .github/workflows/ci.yml.
set -euo pipefail

echo "==> install (frozen lockfile)"
pnpm install --frozen-lockfile

echo "==> dependency pins"
pnpm check:pins

echo "==> lint"
pnpm lint

echo "==> typecheck"
pnpm typecheck

echo "==> unit tests"
pnpm test

echo "==> web build"
pnpm build:web

echo "All Phase 1 verification steps passed."
