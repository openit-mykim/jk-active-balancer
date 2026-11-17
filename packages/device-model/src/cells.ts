/** One cell in a battery pack. */
export interface CellState {
  /** 1-based cell index. */
  readonly index: number;
  /** Cell voltage in volts. */
  readonly voltage: number;
  /** Whether the cell is populated/reporting. */
  readonly active: boolean;
}

/** Aggregate statistics over a set of cells. */
export interface CellStats {
  readonly activeCells: number;
  readonly minCellVoltage: number;
  readonly maxCellVoltage: number;
  readonly minCellIndex: number;
  readonly maxCellIndex: number;
  readonly deltaCellVoltage: number;
  readonly averageCellVoltage: number;
}

/**
 * Compute min / max / delta / average over the active cells.
 *
 * Only active cells contribute to the average and the minimum, matching the
 * upstream JK04 cell-info convention. Returns zeroes when no cell is active.
 */
export function computeCellStats(cells: readonly CellState[]): CellStats {
  let activeCells = 0;
  let minCellVoltage = Number.POSITIVE_INFINITY;
  let maxCellVoltage = Number.NEGATIVE_INFINITY;
  let minCellIndex = 0;
  let maxCellIndex = 0;
  let sum = 0;

  for (const cell of cells) {
    if (!cell.active) {
      continue;
    }
    activeCells += 1;
    sum += cell.voltage;
    if (cell.voltage < minCellVoltage) {
      minCellVoltage = cell.voltage;
      minCellIndex = cell.index;
    }
    if (cell.voltage > maxCellVoltage) {
      maxCellVoltage = cell.voltage;
      maxCellIndex = cell.index;
    }
  }

  if (activeCells === 0) {
    return {
      activeCells: 0,
      minCellVoltage: 0,
      maxCellVoltage: 0,
      minCellIndex: 0,
      maxCellIndex: 0,
      deltaCellVoltage: 0,
      averageCellVoltage: 0,
    };
  }

  return {
    activeCells,
    minCellVoltage,
    maxCellVoltage,
    minCellIndex,
    maxCellIndex,
    deltaCellVoltage: maxCellVoltage - minCellVoltage,
    averageCellVoltage: sum / activeCells,
  };
}

/**
 * Active cell count, by the design section 41.2 priority:
 * 1. cell count configured on the device (settings frame),
 * 2. cells reporting a non-zero voltage in the latest cell-info frame,
 * 3. the verified profile's `maxCells`.
 * The BLE advertised name is never used. Clamped to the 24-cell UI maximum.
 */
export function resolveActiveCellCount(input: {
  readonly settingsCellCount?: number;
  readonly reportingCells?: number;
  readonly profileMaxCells?: number;
}): number {
  // The product never has more cells than its profile allows (e.g. 8 for
  // JK-B2A8S), so a corrupt or foreign value cannot widen the grid.
  const cap = input.profileMaxCells !== undefined && input.profileMaxCells > 0 ? Math.min(input.profileMaxCells, 24) : 24;
  const candidates = [input.settingsCellCount, input.reportingCells, input.profileMaxCells];
  for (const candidate of candidates) {
    if (candidate !== undefined && Number.isFinite(candidate) && candidate > 0) {
      return Math.min(Math.trunc(candidate), cap);
    }
  }
  return 0;
}

/** Result of checking a reported cell count against the product's range. */
export type CellRangeCheck =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly kind: "below-min" | "above-max";
      readonly reported: number;
      readonly minCells: number;
      readonly maxCells: number;
    };

/**
 * Compare the cell count the device reports with the product's supported
 * range (e.g. JK-B4A24S 8S-24S). The UI words the result (no strings here);
 * nothing is hidden.
 */
export function checkCellRange(reported: number, range: { readonly minCells: number; readonly maxCells: number }): CellRangeCheck {
  if (reported > range.maxCells) {
    return { ok: false, kind: "above-max", reported, minCells: range.minCells, maxCells: range.maxCells };
  }
  if (reported > 0 && reported < range.minCells) {
    return { ok: false, kind: "below-min", reported, minCells: range.minCells, maxCells: range.maxCells };
  }
  return { ok: true };
}
