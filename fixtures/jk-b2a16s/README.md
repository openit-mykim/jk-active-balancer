# JK-B2A16S JK04 fixtures

Every frame in this directory is **300 bytes** and ends in a `sum8` checksum
byte (sum of the preceding 299 bytes, mod 256).

Files are hex text (whitespace separated), not raw binary, so a reviewer can
diff them by eye. `tests/helpers/fixtures.ts` parses the whitespace form.

## Provenance: real vs synthetic

Do **not** treat a synthetic file as a device measurement. The suffix on each
filename is the claim:

| File | Kind | Source |
|---|---|---|
| `device-info/hw3-sw3.3.0.upstream.hex` | **REAL (upstream-documented)** | JK04 JK-B2A16S example transcribed from `syssi/esphome-jk-bms@3.0.0` (`components/jk_bms_ble/jk_bms_ble.cpp`, `decode_device_info_`). Decodes to Vendor `JK-B2A16S`, HW `3.0`, SW `3.3.0`, uptime `36867600` s, power-on count `19`, name `BMS`, passcode `1234`. |
| `status/16s-balanced.upstream.hex` | **REAL (upstream-documented)** | JK04 cell-info example transcribed from the same file (`decode_jk04_cell_info_`). 16 populated cells. |
| `settings/default.upstream.hex` | **REAL (upstream-documented)** | JK04 settings example transcribed from the same file (`decode_jk04_settings_`). |
| `status/16s-unbalanced.synthetic.hex` | **SYNTHETIC** | Derived from the real cell-info frame by setting per-cell voltages 3.30..3.45 V, delta 0.15 V, balancer byte `0x01` (charging) and current 1.5 A, then recomputing the checksum. No physical device produced it. |
| `malformed/truncated.synthetic.hex` | **SYNTHETIC** | First 250 bytes of the real device-info frame (below `MIN_RESPONSE_SIZE`). |
| `malformed/bad-header.synthetic.hex` | **SYNTHETIC** | Real device-info frame with byte 0 corrupted (`0x55` -> `0x00`). |
| `malformed/bad-checksum.synthetic.hex` | **SYNTHETIC** | Real device-info frame with byte 299 incremented, so `sum8` fails. |

The two `.upstream.hex` real frames, the synthetic unbalanced frame and the
real settings frame all reproduce the upstream `sum8` checksum exactly, which is
what makes them usable as regression fixtures.

## Status

No fixture in this directory was captured from the hardware this project will
ship against. Real-device capture is a Phase 1 acceptance item (design sections
25, 37 step 9). When a real capture lands, add it as `*.captured.hex` and keep
the provenance table above in sync.
