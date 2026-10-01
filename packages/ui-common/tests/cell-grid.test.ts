import { describe, expect, it } from "vitest";
import { computeCellGridLayout } from "../src/cell-grid";

describe("computeCellGridLayout", () => {
  it.each([
    [7, 1],
    [8, 1],
    [13, 2],
    [16, 2],
    [20, 3],
    [24, 3],
  ])("places %i active cells into %i column(s)", (activeCells, columns) => {
    expect(computeCellGridLayout(activeCells).columns).toBe(columns);
  });

  it("places cell 1 at column 0 row 0 and cell 9 at column 1 row 0", () => {
    const layout = computeCellGridLayout(16);
    expect(layout.placements[0]).toEqual({ index: 1, column: 0, row: 0 });
    expect(layout.placements[8]).toEqual({ index: 9, column: 1, row: 0 });
  });

  it("creates no placeholder for a 16S pack", () => {
    const layout = computeCellGridLayout(16);
    expect(layout.placements).toHaveLength(16);
    expect(layout.placements.some((placement) => placement.index > 16)).toBe(false);
  });

  it("caps at 24 cells", () => {
    expect(computeCellGridLayout(30).activeCells).toBe(24);
    expect(computeCellGridLayout(30).columns).toBe(3);
  });
});
