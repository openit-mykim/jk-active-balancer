import {
  FRAME_TYPE_CELL_INFO,
  FRAME_TYPE_DEVICE_INFO,
  FRAME_TYPE_NAMES,
  FRAME_TYPE_SETTINGS,
  FrameAssembler,
  decodeCellInfo,
  decodeDeviceInfo,
  decodeSettings,
  type FrameAssemblerOptions,
  type JkCellInfo,
  type JkDeviceInfo,
  type JkSettings,
} from "@jk-active-balancer/jk-protocol";

/** A decoded frame, an unknown frame type, or a frame the decoder rejected. */
export type DecodedFrame =
  | { readonly kind: "device-info"; readonly value: JkDeviceInfo; readonly frame: Uint8Array }
  | { readonly kind: "cell-info"; readonly value: JkCellInfo; readonly frame: Uint8Array }
  | { readonly kind: "settings"; readonly value: JkSettings; readonly frame: Uint8Array }
  | { readonly kind: "unknown"; readonly frameType: number; readonly frame: Uint8Array }
  | { readonly kind: "error"; readonly frameType: number; readonly error: string; readonly frame: Uint8Array };

/** Name for a frame type byte, for logs. */
export function frameTypeName(frameType: number): string {
  return FRAME_TYPE_NAMES[frameType] ?? `0x${frameType.toString(16).padStart(2, "0").toUpperCase()}`;
}

/**
 * The BLE -> state pipeline required by design section 2.2:
 * fragment collector -> frame validator -> JK04 decoder.
 *
 * Raw notifications never reach the UI undecoded, and a decoder failure is
 * reported as an `error` result instead of throwing, so the caller can keep
 * the previous valid state (design section 36 "Corrupt Packet").
 */
export class PacketPipeline {
  private readonly assembler: FrameAssembler;

  constructor(options?: FrameAssemblerOptions) {
    this.assembler = new FrameAssembler(options);
  }

  /** Feed one notification fragment; returns a decoded frame or `null`. */
  push(fragment: Uint8Array | readonly number[]): DecodedFrame | null {
    const frame = this.assembler.push(fragment);
    if (frame === null) {
      return null;
    }
    return decodeFrame(frame);
  }

  reset(): void {
    this.assembler.reset();
  }
}

/** Decode one complete, checksum-valid frame without throwing. */
export function decodeFrame(frame: Uint8Array): DecodedFrame {
  const frameType = frame[4];
  try {
    if (frameType === FRAME_TYPE_DEVICE_INFO) {
      return { kind: "device-info", value: decodeDeviceInfo(frame), frame };
    }
    if (frameType === FRAME_TYPE_CELL_INFO) {
      return { kind: "cell-info", value: decodeCellInfo(frame), frame };
    }
    if (frameType === FRAME_TYPE_SETTINGS) {
      return { kind: "settings", value: decodeSettings(frame), frame };
    }
  } catch (error) {
    return { kind: "error", frameType, error: error instanceof Error ? error.message : String(error), frame };
  }
  return { kind: "unknown", frameType, frame };
}

/**
 * Fixture replay (design section 25): feed recorded fragments through a fresh
 * pipeline and return every decoded result, in order.
 */
export function replayFragments(fragments: Iterable<Uint8Array>, options?: FrameAssemblerOptions): DecodedFrame[] {
  const pipeline = new PacketPipeline(options);
  const out: DecodedFrame[] = [];
  for (const fragment of fragments) {
    const decoded = pipeline.push(fragment);
    if (decoded !== null) {
      out.push(decoded);
    }
  }
  return out;
}

/** Split a frame into MTU-sized fragments, as a BLE link would deliver it. */
export function fragment(frame: Uint8Array, size: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  const step = Math.max(1, size);
  for (let offset = 0; offset < frame.length; offset += step) {
    out.push(frame.slice(offset, offset + step));
  }
  return out;
}
