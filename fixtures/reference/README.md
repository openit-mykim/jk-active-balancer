# Reference frames from other protocols

These frames are **not** JK-B2A16S / JK-B4A24S data. They exist only to test
diagnostic helpers that must tell protocols apart (e.g. `cellLayoutHint`).

| File | Kind | Source |
|---|---|---|
| `jk02-24s-cell-info.upstream.hex` | **REAL (upstream-documented), JK02_24S** | First cell-info example in `syssi/esphome-jk-bms@3.0.0` `components/jk_bms_ble/jk_bms_ble.cpp` (`decode_jk02_cell_info_`, line 446). 300 bytes, `sum8` valid. |
