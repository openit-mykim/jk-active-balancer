# JK04 Protocol Design Notes

This document is an implementation guide. It records **verified upstream facts**
transcribed from the pinned upstream release plus what this repository actually
implements. It is not a claim that a fact was measured on our own hardware.

Upstream pin (see `docs/upstream-lock.json`):

```text
syssi/esphome-jk-bms  tag 3.0.0  commit b3016df3799095c0760e0a578d04dc7185a1c74a  Apache-2.0
```

## BLE transport

```text
Service        : 0000FFE0-0000-1000-8000-00805F9B34FB   (short FFE0)
Characteristic : 0000FFE1-0000-1000-8000-00805F9B34FB   (short FFE1)
```

The same characteristic is used for command TX and notification RX; on ESP32
the write handle is `0x03` and the notify handle `0x05`. **Handles are never
hard-coded** (design section 34.5): both adapters resolve the characteristic
from GATT discovery and decide TX/RX from the reported properties.

## Command framing

A command is a fixed 20-byte write:

| Offset | Size | Meaning |
|---:|---:|---|
| 0..3 | 4 | header `AA 55 90 EB` |
| 4 | 1 | register / command |
| 5 | 1 | value length in bytes |
| 6..9 | 4 | value, little-endian |
| 10..18 | 9 | reserved / padding (zero) |
| 19 | 1 | `sum8` checksum of bytes 0..18 |

Commands used in Phase 1:

```text
0x97  COMMAND_DEVICE_INFO   -> response frame type 0x03
0x96  COMMAND_CELL_INFO     -> status / streaming trigger
```

Upstream sends both as `write_register(address, 0x00000000, 0x00)`. The exact
20-byte frames this repository produces are:

```text
0x97 -> AA 55 90 EB 97 00 00 00 00 00 00 00 00 00 00 00 00 00 00 11
0x96 -> AA 55 90 EB 96 00 00 00 00 00 00 00 00 00 00 00 00 00 00 10
```

These are asserted byte-for-byte in `packages/jk-protocol/tests/frame-builder.test.ts`.
`0xA1` (logbook) exists upstream but is only supported on some devices and is
out of Phase 1 scope.

## Response framing

The response header is the reverse of the command header (design section 11 -
mixing them up breaks the parser):

```text
command  : AA 55 90 EB
response : 55 AA EB 90
```

Byte 4 is the frame type:

```text
0x01  settings
0x02  cell info / status
0x03  device info
```

Response frames are 300 bytes; the trailing checksum lives at index 299.
Upstream also keeps a window `MIN_RESPONSE_SIZE = 300` and `MAX_RESPONSE_SIZE =
384 + 16 = 400` (the 384 comes from an ESP32 MTU note; this repository records
`MAX_RESPONSE_SIZE = 400`).

## Checksum

Upstream `crc()` is `sum8`: an 8-bit accumulator, i.e. sum of the bytes mod 256.

```text
command  : frame[19]  = sum8(frame[0..18])
response : frame[299] = sum8(frame[0..298])
```

Implemented once in `packages/jk-protocol/src/jk04/crc.ts` and unit-tested
against the real upstream frames in `fixtures/`.

## Frame assembly

BLE notifications fragment a 300-byte frame across several MTU-sized packets,
so a notification must never be decoded directly. `FrameAssembler` mirrors
upstream `assemble()`:

1. If the buffer already exceeds `MAX_RESPONSE_SIZE`, discard it.
2. Flush the buffer whenever a fragment itself begins with `55 AA EB 90`. This
   is what makes out-of-order fragments safe: a stray tail cannot merge with the
   next frame.
3. Append the fragment.
4. Once the buffer reaches `MIN_RESPONSE_SIZE`, validate the checksum of the
   first 300 bytes and either emit the frame or discard the buffer.

One documented divergence: `FrameAssembler` drops a frame that is byte-identical
to the immediately previous emitted frame (duplicate notifications are a known
JK BLE symptom). Set `dropConsecutiveDuplicates: false` for exact upstream
parity. See `docs/decision-log.md` D006.

## Device info frame (type 0x03)

Offsets, from the upstream JK04/JK-B2A16S example:

| Offset | Size | Field |
|---:|---:|---|
| 0..3 | 4 | header `55 AA EB 90` |
| 4 | 1 | frame type `0x03` |
| 5 | 1 | frame counter |
| 6 | 16 | vendor id (null-terminated) |
| 22 | 8 | hardware version (null-terminated) |
| 30 | 8 | software version (null-terminated) |
| 38 | 4 | uptime seconds (uint32 LE) |
| 42 | 4 | power-on count (uint32 LE) |
| 46 | 16 | device name |
| 62 | 16 | device passcode |
| 78 | 8 | manufacturing date |
| 86 | 11 | serial number |
| 102 | 16 | user data |

The fixture decodes to vendor `JK-B2A16S`, hardware `3.0`, software `3.3.0`,
uptime `36867600` s, power-on count `19`, name `BMS`, device passcode `1234`.

`1234` is that fixture's value; it is **not** a universal default password.

## Cell info frame (type 0x02)

| Offset | Size | Field |
|---:|---:|---|
| 4 | 1 | frame type `0x02` |
| 6 + i*4 | 4 | cell voltage i (0-based, 24 slots), float32 LE |
| 102 + i*4 | 4 | cell wire resistance i, float32 LE |
| 202 | 4 | average cell voltage, float32 LE |
| 206 | 4 | delta cell voltage, float32 LE |
| 220 | 1 | balancer blink byte (`0x00` off, `0x01` charging, `0x02` discharging) |
| 222 | 4 | balancing current, float32 LE |
| 286 | 4 | uptime seconds, uint32 LE |

Statistics follow upstream: only cells with a non-zero voltage count towards
the average, and the minimum is taken over non-zero cells only.

`Cell Wire Resistance` is reported by the parser but is a diagnostic value; the
UI only shows it, never acts on it (design section 42).

## Settings frame (type 0x01) and writes

Phase 1 is **read-only + diagnostics** (design sections 15, 35). Therefore:

- `decodeSettings()` throws `DecoderNotVerifiedError` rather than risk a wrong
  decode;
- `createSettingsWriter()` returns a `JkSettingsWriter` whose every method
  rejects with `SettingsWriteDisabledError`.

Settings **write** is Phase 2, whitelist registers only. A register may only be
writable once its address, unit, range and read-back verification are all
validated (design section 15). There is deliberately no raw
`writeRegister(address, value)` in the public API.

## Fixtures

See `fixtures/jk-b2a16s/README.md` for the real-vs-synthetic provenance table.
The real frames are transcribed from the pinned upstream source; nothing here
was captured on our own hardware yet (design sections 25, 37 step 9).
