import { FRAME_TYPE_CELL_INFO, RESPONSE_FRAME_SIZE, RESPONSE_HEADER } from "./constants";

/** One cell as reported by a JK04 cell-info frame. */
export interface JkCellSample {
  /** 1-based cell index. */
  readonly index: number;
  /** Cell voltage in volts (0 when the cell is not populated). */
  readonly voltage: number;
  /** Cell wire resistance in ohms (0 when not reported). */
  readonly resistance: number;
}

/** Balancer activity reported by the cell-info "blink" byte. */
export type BalancerActivity = "idle" | "charging" | "discharging" | "unknown";

/** Decoded JK04 cell-info / status frame (response frame type 0x02). */
export interface JkCellInfo {
  readonly cells: readonly JkCellSample[];
  /** Number of cells with a non-zero voltage. */
  readonly activeCells: number;
  readonly minCellVoltage: number;
  readonly maxCellVoltage: number;
  readonly minCellIndex: number;
  readonly maxCellIndex: number;
  /** `max - min` over populated cells (upstream computes this; see below). */
  readonly deltaCellVoltage: number;
  /** Mean over populated cells (upstream computes this; see below). */
  readonly averageCellVoltage: number;
  /** Pack voltage: sum of every cell voltage (upstream `total_voltage`). */
  readonly totalVoltage: number;
  /**
   * Raw float32 at offset 202. Upstream documents it as "Average Cell Voltage"
   * but does not publish it, so it is kept for diagnostics only.
   */
  readonly reportedAverageCellVoltage: number;
  /** Raw float32 at offset 206 ("Delta Cell Voltage"), diagnostics only. */
  readonly reportedDeltaCellVoltage: number;
  readonly balancer: BalancerActivity;
  /** Raw balancer byte at offset 220 (upstream `balancer_status_bitmask`). */
  readonly balancerStatusByte: number;
  /** Balancing current in amps (float32 at offset 222). */
  readonly balancingCurrent: number;
  /** Device uptime in seconds (uint32 at offset 286). */
  readonly uptimeSeconds: number;
}

/**
 * Field offsets are taken from the field-validated JK04 cell-info example in
 * `syssi/esphome-jk-bms` (tag 3.0.0):
 *   cell voltage i (0-based) = float32 LE at i*4 + 6      (24 slots)
 *   cell resistance i        = float32 LE at i*4 + 102    (24 slots)
 *   average cell voltage     = float32 LE at 202  (diagnostic; upstream does not publish)
 *   delta cell voltage       = float32 LE at 206  (diagnostic; upstream does not publish)
 *   balancer blink byte      = uint8 at 220
 *   balancing current        = float32 LE at 222
 *   uptime                   = uint32 LE at 286
 * Verified in fixtures/jk-b2a16s/status/16s-balanced.upstream.hex.
 */
const CELL_SLOTS = 24;
const CELL_VOLTAGE_BASE = 6;
const CELL_RESISTANCE_BASE = 102;
const AVERAGE_OFFSET = 202;
const DELTA_OFFSET = 206;
const BALANCER_OFFSET = 220;
const BALANCING_CURRENT_OFFSET = 222;
const UPTIME_OFFSET = 286;

function readFloat32LE(frame: Uint8Array, offset: number): number {
  const view = new DataView(frame.buffer, frame.byteOffset + offset, 4);
  return view.getFloat32(0, true);
}

function readUint32LE(frame: Uint8Array, offset: number): number {
  const view = new DataView(frame.buffer, frame.byteOffset + offset, 4);
  return view.getUint32(0, true);
}

function readBalancerByte(frame: Uint8Array, offset: number): BalancerActivity {
  switch (frame[offset]) {
    case 0x00:
      return "idle";
    case 0x01:
      return "charging";
    case 0x02:
      return "discharging";
    default:
      return "unknown";
  }
}

/** True when `frame` is a complete JK04 cell-info frame (header + type 0x02). */
export function isCellInfoFrame(frame: Uint8Array): boolean {
  return (
    frame.length >= RESPONSE_FRAME_SIZE &&
    frame[0] === RESPONSE_HEADER[0] &&
    frame[1] === RESPONSE_HEADER[1] &&
    frame[2] === RESPONSE_HEADER[2] &&
    frame[3] === RESPONSE_HEADER[3] &&
    frame[4] === FRAME_TYPE_CELL_INFO
  );
}

/**
 * Decode a JK04 cell-info frame. Statistics follow upstream
 * `decode_jk04_cell_info_()`: only cells with a non-zero voltage count towards
 * the average and the minimum, delta is `max - min`, and the pack voltage is the
 * sum of all cell slots. Upstream deliberately leaves the frame's own
 * average/delta floats (offsets 202/206) unpublished; they are exposed here as
 * `reported*` diagnostics only.
 *
 * @throws Error when the frame is not a cell-info frame.
 */
export function decodeCellInfo(frame: Uint8Array): JkCellInfo {
  if (!isCellInfoFrame(frame)) {
    throw new Error("decodeCellInfo: not a JK04 cell-info frame (expected 55 AA EB 90 02)");
  }

  const cells: JkCellSample[] = [];
  let activeCells = 0;
  let minCellVoltage = Number.POSITIVE_INFINITY;
  let maxCellVoltage = Number.NEGATIVE_INFINITY;
  let minCellIndex = 0;
  let maxCellIndex = 0;
  let voltageSum = 0;
  let totalVoltage = 0;

  for (let i = 0; i < CELL_SLOTS; i += 1) {
    const voltage = readFloat32LE(frame, i * 4 + CELL_VOLTAGE_BASE);
    const resistance = readFloat32LE(frame, i * 4 + CELL_RESISTANCE_BASE);
    cells.push({ index: i + 1, voltage, resistance });
    totalVoltage += voltage;

    if (voltage > 0) {
      activeCells += 1;
      voltageSum += voltage;
      if (voltage < minCellVoltage) {
        minCellVoltage = voltage;
        minCellIndex = i + 1;
      }
    }
    if (voltage > maxCellVoltage) {
      maxCellVoltage = voltage;
      maxCellIndex = i + 1;
    }
  }

  const averageCellVoltage = activeCells > 0 ? voltageSum / activeCells : 0;

  const min = activeCells > 0 ? minCellVoltage : 0;
  const max = activeCells > 0 ? maxCellVoltage : 0;

  return {
    cells,
    activeCells,
    minCellVoltage: min,
    maxCellVoltage: max,
    minCellIndex: activeCells > 0 ? minCellIndex : 0,
    maxCellIndex: activeCells > 0 ? maxCellIndex : 0,
    deltaCellVoltage: max - min,
    averageCellVoltage,
    totalVoltage,
    reportedAverageCellVoltage: readFloat32LE(frame, AVERAGE_OFFSET),
    reportedDeltaCellVoltage: readFloat32LE(frame, DELTA_OFFSET),
    balancer: readBalancerByte(frame, BALANCER_OFFSET),
    balancerStatusByte: frame[BALANCER_OFFSET],
    balancingCurrent: readFloat32LE(frame, BALANCING_CURRENT_OFFSET),
    uptimeSeconds: readUint32LE(frame, UPTIME_OFFSET),
  };
}
