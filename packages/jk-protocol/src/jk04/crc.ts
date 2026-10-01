/**
 * JK04 checksum.
 *
 * Upstream `crc()` sums the bytes as an 8-bit accumulator, i.e. sum mod 256
 * (`crc = crc + data[i]` in a `uint8_t`). Every command frame stores this value
 * in its final byte, and every 300-byte response frame stores it at index 299.
 * See docs/protocol-design.md (Checksum).
 */

/** Sum of every byte, truncated to 8 bits (sum mod 256). */
export function sum8(bytes: Uint8Array | readonly number[]): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crc + bytes[i]) & 0xff;
  }
  return crc;
}

/** Checksum byte for a command frame: `sum8` over all bytes except the last. */
export function computeCommandChecksum(frame: Uint8Array): number {
  return sum8(frame.subarray(0, frame.length - 1));
}

/** True when a complete frame's trailing byte matches `sum8` of the preceding bytes. */
export function verifyFrameChecksum(frame: Uint8Array): boolean {
  if (frame.length < 2) {
    return false;
  }
  return sum8(frame.subarray(0, frame.length - 1)) === frame[frame.length - 1];
}
