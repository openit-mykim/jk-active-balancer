import { MAX_RESPONSE_SIZE, MIN_RESPONSE_SIZE, RESPONSE_FRAME_SIZE, RESPONSE_HEADER } from "./constants";
import { verifyFrameChecksum } from "./crc";

function startsWithResponseHeader(bytes: Uint8Array | readonly number[]): boolean {
  return (
    bytes.length >= RESPONSE_HEADER.length &&
    bytes[0] === RESPONSE_HEADER[0] &&
    bytes[1] === RESPONSE_HEADER[1] &&
    bytes[2] === RESPONSE_HEADER[2] &&
    bytes[3] === RESPONSE_HEADER[3]
  );
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/** Options for {@link FrameAssembler}. */
export interface FrameAssemblerOptions {
  /**
   * Drop a frame that is byte-identical to the immediately previous emitted
   * frame. Duplicate notifications are a known JK BLE symptom (design section
   * 2.2 / 34.10). Defaults to `true`; set to `false` to match upstream, which
   * decodes every delivered frame.
   */
  readonly dropConsecutiveDuplicates?: boolean;
}

/**
 * Reassembles JK04 response frames from BLE notification fragments.
 *
 * Behaviour mirrors upstream `JkBmsBle::assemble()`:
 *   1. if the buffer has grown beyond {@link MAX_RESPONSE_SIZE}, discard it;
 *   2. flush the buffer whenever a fragment itself starts with the response
 *      header (so an out-of-order tail can never poison the next frame);
 *   3. append the fragment;
 *   4. once the buffer reaches {@link MIN_RESPONSE_SIZE}, validate the trailing
 *      checksum of the first {@link RESPONSE_FRAME_SIZE} bytes and either emit
 *      the frame or discard the buffer.
 *
 * It never concatenates a frame across a bad checksum: a corrupt frame is
 * dropped rather than surfaced to the decoder.
 */
export class FrameAssembler {
  private buffer: number[] = [];
  private lastEmitted: Uint8Array | null = null;
  private readonly dropConsecutiveDuplicates: boolean;

  constructor(options: FrameAssemblerOptions = {}) {
    this.dropConsecutiveDuplicates = options.dropConsecutiveDuplicates ?? true;
  }

  /** Number of bytes currently buffered (diagnostics / tests). */
  get bufferedBytes(): number {
    return this.buffer.length;
  }

  /** Clear the internal buffer. */
  reset(): void {
    this.buffer = [];
  }

  /**
   * Append a notification fragment and return a complete, checksum-valid frame
   * if one became available, otherwise `null`.
   */
  push(fragment: Uint8Array | readonly number[]): Uint8Array | null {
    if (this.buffer.length > MAX_RESPONSE_SIZE) {
      this.buffer = [];
    }

    if (startsWithResponseHeader(fragment)) {
      this.buffer = [];
    }

    for (let i = 0; i < fragment.length; i += 1) {
      this.buffer.push(fragment[i] & 0xff);
    }

    if (this.buffer.length < MIN_RESPONSE_SIZE) {
      return null;
    }

    const frame = Uint8Array.from(this.buffer.slice(0, RESPONSE_FRAME_SIZE));
    if (!verifyFrameChecksum(frame)) {
      this.buffer = [];
      return null;
    }

    this.buffer = [];

    if (this.dropConsecutiveDuplicates && this.lastEmitted !== null && equalBytes(frame, this.lastEmitted)) {
      return null;
    }

    this.lastEmitted = frame;
    return frame;
  }
}
