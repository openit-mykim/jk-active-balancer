/** Maximum rows (cells) per column in the dashboard cell grid. */
export const CELLS_PER_COLUMN = 8;
/** Maximum number of columns: supports 1S..24S without a code change. */
export const MAX_COLUMNS = 3;

/** Grid placement for a single cell. */
export interface CellGridPlacement {
  readonly index: number;
  /** 0-based column. */
  readonly column: number;
  /** 0-based row within the column. */
  readonly row: number;
}

/** Layout for a cell grid (design section 41.3). */
export interface CellGridLayout {
  readonly activeCells: number;
  readonly columns: number;
  readonly rows: number;
  readonly placements: readonly CellGridPlacement[];
}

/**
 * Build an `8 cells / column, up to 3 columns` layout.
 *
 * ```text
 * 1..8S   -> 1 column
 * 9..16S  -> 2 columns
 * 17..24S -> 3 columns
 * ```
 *
 * Unused cells produce no placeholder (design section 41.3).
 */
export function computeCellGridLayout(activeCellCount: number): CellGridLayout {
  const activeCells = Math.max(0, Math.min(activeCellCount, CELLS_PER_COLUMN * MAX_COLUMNS));
  const columns = Math.ceil(activeCells / CELLS_PER_COLUMN);
  const placements: CellGridPlacement[] = [];
  for (let index = 1; index <= activeCells; index += 1) {
    placements.push({
      index,
      column: Math.floor((index - 1) / CELLS_PER_COLUMN),
      row: (index - 1) % CELLS_PER_COLUMN,
    });
  }
  return {
    activeCells,
    columns,
    rows: Math.min(activeCells, CELLS_PER_COLUMN),
    placements,
  };
}
