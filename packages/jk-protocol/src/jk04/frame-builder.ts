import { COMMAND_CELL_INFO, COMMAND_DEVICE_INFO, COMMAND_FRAME_SIZE, COMMAND_HEADER } from "./constants";
import { computeCommandChecksum } from "./crc";

/**
 * Options for a 20-byte JK04 command frame.
 *
 * Verified against upstream `JkBmsBle::write_register(address, value, length)`:
 *   [0..3] = AA 55 90 EB
 *   [4]    = register / command
 *   [5]    = value length in bytes
 *   [6..9] = value, little-endian
 *   [10..18] = zero padding
 *   [19]   = sum8(frame[0..18])
 */
export interface BuildCommandOptions {
  /** Register / command byte at offset 4 (e.g. 0x96 or 0x97). */
  readonly register: number;
  /** 32-bit value written little-endian at offsets 6..9. Defaults to 0. */
  readonly value?: number;
  /** Value length byte at offset 5. Defaults to 0 when value is 0, else 4. */
  readonly length?: number;
}

/** Build a 20-byte JK04 command frame. */
export function buildCommand(options: BuildCommandOptions): Uint8Array {
  const value = options.value ?? 0;
  const length = options.length ?? (value === 0 ? 0 : 4);
  const frame = new Uint8Array(COMMAND_FRAME_SIZE);

  frame[0] = COMMAND_HEADER[0];
  frame[1] = COMMAND_HEADER[1];
  frame[2] = COMMAND_HEADER[2];
  frame[3] = COMMAND_HEADER[3];
  frame[4] = options.register & 0xff;
  frame[5] = length & 0xff;
  frame[6] = value & 0xff;
  frame[7] = (value >>> 8) & 0xff;
  frame[8] = (value >>> 16) & 0xff;
  frame[9] = (value >>> 24) & 0xff;
  // frame[10..18] intentionally left as 0x00 (reserved / padding).
  frame[19] = computeCommandChecksum(frame);

  return frame;
}

/** `write_register(0x97, 0, 0)` - request the device info frame (type 0x03). */
export function buildDeviceInfoCommand(): Uint8Array {
  return buildCommand({ register: COMMAND_DEVICE_INFO, value: 0, length: 0 });
}

/** `write_register(0x96, 0, 0)` - trigger the settings / cell-info stream. */
export function buildCellInfoCommand(): Uint8Array {
  return buildCommand({ register: COMMAND_CELL_INFO, value: 0, length: 0 });
}
