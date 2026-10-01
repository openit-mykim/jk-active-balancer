# Dependency pins

Design section 32: exact versions only. `^` and `~` are rejected by
`scripts/check-pins.mjs`, which runs in CI's `lint` job and in
`scripts/verify.sh`.

Verified against the npm registry on 2026-10-02.

## Toolchain (root)

| Package | Version |
|---|---|
| typescript | 7.0.2 |
| vitest | 5.0.3 |
| vite | 8.3.2 |
| oxlint | 1.86.0 |
| @types/node | 26.6.3 |

## Web app

| Package | Version |
|---|---|
| react | 19.3.0 |
| react-dom | 19.3.0 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @vitejs/plugin-react | 6.1.1 |

## Mobile app (`apps/mobile`, not in the Phase 1 install - D005)

| Package | Version |
|---|---|
| react-native | 0.87.1 |
| react-native-ble-plx | 3.5.1 |

## Internal packages

All internal dependencies use `workspace:*`:

```text
@jk-active-balancer/jk-protocol
@jk-active-balancer/device-model
@jk-active-balancer/ble-core
@jk-active-balancer/ble-web
@jk-active-balancer/ble-react-native
@jk-active-balancer/ui-common
```
