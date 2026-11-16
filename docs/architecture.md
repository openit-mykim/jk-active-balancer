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
| `@jk-active-balancer/device-model` | Framework-agnostic domain types, statistics, active-cell-count priority, history + CSV | - |
| `@jk-active-balancer/ble-core` | `BleTransport` interface, `BmsSession`, state machine, reconnect policy, watchdog, packet pipeline, raw logger, debug export, mock transport | jk-protocol |
| `@jk-active-balancer/ble-web` | Web Bluetooth adapter | ble-core, jk-protocol |
| `@jk-active-balancer/ble-react-native` | react-native-ble-plx adapter (structural types, manager injected by the app) | ble-core, jk-protocol |
| `@jk-active-balancer/ui-common` | Framework-agnostic layout helpers (cell grid, user-configurable cell colour thresholds) | device-model |
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

`BmsSession` (ble-core) drives the machine end to end (decision D012):

```text
connect(device)
  CONNECTING   transport.connect()  (GATT discovery + FFE1 notify)
  DISCOVERING / SUBSCRIBING
  IDENTIFYING  write 0x97, wait <= 5 s for the device-info frame
               resolveProfile(model, HW, SW) -> verified | diagnostic
  READY        write 0x96 (re-sent every 5 s until status arrives)
  STREAMING    settings (0x01) + cell-info (0x02) frames
watchdog       < 5 s fresh, 5-15 s STALE (values kept), > 15 s stalled -> reconnect
link loss      transport.onDisconnect -> ERROR -> RECONNECT_WAIT -> CONNECTING
```

Supporting pieces in ble-core: `RawPacketLogger` (TX/RX/FRAME, off by default,
design section 29), `buildDebugExport()` (design section 30, passcode masked,
RX fragments never exported), `replayFragments()` (fixture replay, section 25).
