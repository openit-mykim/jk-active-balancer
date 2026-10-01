import {
  FRAME_TYPE_CELL_INFO,
  FRAME_TYPE_DEVICE_INFO,
  FrameAssembler,
  decodeCellInfo,
  decodeDeviceInfo,
  type JkCellInfo,
  type JkDeviceInfo,
} from "@jk-active-balancer/jk-protocol";

/** A decoded frame, or an unknown frame type that the decoder did not handle. */
export type DecodedFrame =
  | { readonly kind: "device-info"; readonly value: JkDeviceInfo }
  | { readonly kind: "cell-info"; readonly value: JkCellInfo }
  | { readonly kind: "unknown"; readonly frameType: number };

/**
 * The BLE -> state pipeline required by design section 2.2:
 * fragment collector -> frame validator -> JK04 decoder.
 *
 * Raw notifications must never reach the UI undecoded.
 */
export class PacketPipeline {
  private readonly assembler = new FrameAssembler();

  /** Feed one notification fragment; returns a decoded frame or `null`. */
  push(fragment: Uint8Array | readonly number[]): DecodedFrame | null {
    const frame = this.assembler.push(fragment);
    if (frame === null) {
      return null;
    }

    const frameType = frame[4];
    if (frameType === FRAME_TYPE_DEVICE_INFO) {
      return { kind: "device-info", value: decodeDeviceInfo(frame) };
    }
    if (frameType === FRAME_TYPE_CELL_INFO) {
      return { kind: "cell-info", value: decodeCellInfo(frame) };
    }
    return { kind: "unknown", frameType };
  }

  reset(): void {
    this.assembler.reset();
  }
}
