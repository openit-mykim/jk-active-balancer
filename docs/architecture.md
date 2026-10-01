# Architecture

```text
BLE notification
      |
      v
Fragment collector / FrameAssembler      packages/jk-protocol  (+ ble-core)
      |
      v
Frame validator (header + sum8 checksum)
      |
      v
JK04 decoder (device info / cell info)   packages/jk-protocol
      |
      v
State store                              packages/device-model
      |
      v
UI                                       apps/web, apps/mobile, packages/ui-common
```

Rule (design sections 2.2, 34.9, 38): UI code never parses packets, and
protocol code never contains UI thresholds or colours.

## Layers

| Package | Responsibility | Depends on |
|---|---|---|
| `@jk-active-balancer/jk-protocol` | JK04 constants, CRC, command builder, frame assembler, decoders, device profile | - |
| `@jk-active-balancer/device-model` | Framework-agnostic battery/cell/balancer domain types and statistics | - |
| `@jk-active-balancer/ble-core` | `BleTransport` interface, connection state machine, reconnect policy, packet pipeline, mock transport | jk-protocol |
| `@jk-active-balancer/ble-web` | Web Bluetooth adapter | ble-core, jk-protocol |
| `@jk-active-balancer/ble-react-native` | react-native-ble-plx adapter (structural) | ble-core, jk-protocol |
| `@jk-active-balancer/ui-common` | Framework-agnostic layout helpers (cell grid) | device-model |
| `apps/web` | Vite + React PWA (Web Bluetooth) | all of the above |
| `apps/mobile` | React Native app skeleton | all of the above |

Transport, frame assembly, decoding, domain state and UI are separate layers;
no layer reaches across more than one boundary.

## Connection lifecycle

`ConnectionStateMachine` (ble-core) enforces the design section 18 states:

```text
IDLE -> SCANNING -> CONNECTING -> DISCOVERING -> SUBSCRIBING -> IDENTIFYING -> READY -> STREAMING
failure:  ERROR -> RECONNECT_WAIT -> CONNECTING
```

Reconnect backoff is `1, 2, 4, 8, 15, 30` seconds, capped at 30 s (design
section 19).
