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
