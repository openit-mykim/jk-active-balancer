/**
 * JK04 BLE protocol constants for the JK-B2A16S smart active balancer.
 *
 * Provenance: these protocol facts are derived from the field-validated
 * implementation in `syssi/esphome-jk-bms` (Apache-2.0, tag 3.0.0, commit
 * b3016df3799095c0760e0a578d04dc7185a1c74a). No upstream source code was
 * copied: only constant values and packet-layout facts were transcribed into
 * this independent TypeScript implementation. See docs/protocol-design.md.
 */

/** BLE GATT service exposed by the JK-B2A16S. */
export const SERVICE_UUID = "0000FFE0-0000-1000-8000-00805F9B34FB" as const;
/** BLE GATT characteristic used for both command TX and notification RX. */
export const CHARACTERISTIC_UUID = "0000FFE1-0000-1000-8000-00805F9B34FB" as const;

/** 16-bit short form of the service UUID (used for the Web Bluetooth filter). */
export const SERVICE_SHORT_UUID = 0xffe0 as const;
/** 16-bit short form of the characteristic UUID. */
export const CHARACTERISTIC_SHORT_UUID = 0xffe1 as const;

/**
 * Command (TX) preamble. NOTE: the command header order differs from the
 * response header order - mixing them up breaks the parser (design section 11).
 */
export const COMMAND_HEADER: readonly number[] = [0xaa, 0x55, 0x90, 0xeb];
/** Response (RX) preamble, as observed at the start of every notification frame. */
export const RESPONSE_HEADER: readonly number[] = [0x55, 0xaa, 0xeb, 0x90];

/** Command register: request device info (response frame type 0x03). */
export const COMMAND_DEVICE_INFO = 0x97 as const;
/**
 * Command register: status / streaming trigger. Upstream sends this to start
 * the settings (0x01) and cell-info (0x02) frame streams.
 */
export const COMMAND_CELL_INFO = 0x96 as const;

/** Response frame type: settings. */
export const FRAME_TYPE_SETTINGS = 0x01 as const;
/** Response frame type: cell info / status. */
export const FRAME_TYPE_CELL_INFO = 0x02 as const;
/** Response frame type: device info. */
export const FRAME_TYPE_DEVICE_INFO = 0x03 as const;

/** Fixed size of a command (TX) frame in bytes. */
export const COMMAND_FRAME_SIZE = 20 as const;
/** Upstream threshold: a buffer must reach this size before a frame is parsed. */
export const MIN_RESPONSE_SIZE = 300 as const;
/** Upstream overflow guard: a buffer larger than this is discarded. */
export const MAX_RESPONSE_SIZE = 400 as const;
/**
 * Upstream decodes a fixed-size window from the front of the response buffer
 * (the trailing CRC sits at index 299), regardless of extra buffered bytes.
 */
export const RESPONSE_FRAME_SIZE = 300 as const;

/** Human-readable frame type names, for logging and diagnostics. */
export const FRAME_TYPE_NAMES: Readonly<Record<number, string>> = {
  [FRAME_TYPE_SETTINGS]: "SETTINGS",
  [FRAME_TYPE_CELL_INFO]: "CELL_INFO",
  [FRAME_TYPE_DEVICE_INFO]: "DEVICE_INFO",
};
