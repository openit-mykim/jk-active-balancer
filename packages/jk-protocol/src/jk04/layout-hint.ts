import { FRAME_TYPE_CELL_INFO, RESPONSE_FRAME_SIZE } from "./constants";

/**
 * Diagnostic hint only - never used to enable decoding.
 *
 * Reads a captured cell-info (0x02) frame both ways upstream lays one out:
 * - JK04:  cell i = float32 LE volts at 6 + 4i
 * - JK02:  cell i = uint16 LE millivolts at 6 + 2i
 * and reports which reading yields a contiguous run of plausible cell
 * voltages (1.5..4.5 V) starting at cell 1. A person still confirms the
 * protocol against the official app before a profile is enabled.
 */
export interface CellLayoutHint {
  readonly jk04PlausibleCells: number;
  readonly jk02PlausibleCells: number;
  readonly likely: "JK04" | "JK02" | "undetermined";
  readonly jk04Voltages: readonly number[];
  readonly jk02Voltages: readonly number[];
}

const MIN_V = 1.5;
const MAX_V = 4.5;

function leadingPlausible(values: readonly number[]): number {
  let n = 0;
  while (n < values.length && values[n] >= MIN_V && values[n] <= MAX_V) n += 1;
  return n;
}

export function cellLayoutHint(frame: Uint8Array): CellLayoutHint | null {
  if (frame.length < RESPONSE_FRAME_SIZE || frame[4] !== FRAME_TYPE_CELL_INFO) {
    return null;
  }
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const jk04 = Array.from({ length: 24 }, (_v, i) => view.getFloat32(6 + i * 4, true));
  const jk02 = Array.from({ length: 24 }, (_v, i) => view.getUint16(6 + i * 2, true) / 1000);
  const a = leadingPlausible(jk04);
  const b = leadingPlausible(jk02);
  const likely = a >= 2 && a > b ? "JK04" : b >= 2 && b > a ? "JK02" : "undetermined";
  return { jk04PlausibleCells: a, jk02PlausibleCells: b, likely, jk04Voltages: jk04.slice(0, a), jk02Voltages: jk02.slice(0, b) };
}
