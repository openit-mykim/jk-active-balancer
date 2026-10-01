import { describe, expect, it } from "vitest";
import { computeCellStats, type CellState } from "../src/cells";

const cells: CellState[] = [
  { index: 1, voltage: 3.4, active: true },
  { index: 2, voltage: 3.3, active: true },
  { index: 3, voltage: 3.35, active: true },
];

describe("computeCellStats", () => {
  it("computes min / max / delta / average over active cells", () => {
    const stats = computeCellStats(cells);
    expect(stats.activeCells).toBe(3);
    expect(stats.minCellVoltage).toBeCloseTo(3.3, 6);
    expect(stats.minCellIndex).toBe(2);
    expect(stats.maxCellVoltage).toBeCloseTo(3.4, 6);
    expect(stats.maxCellIndex).toBe(1);
    expect(stats.deltaCellVoltage).toBeCloseTo(0.1, 6);
    expect(stats.averageCellVoltage).toBeCloseTo(3.35, 6);
  });

  it("ignores inactive cells", () => {
    const stats = computeCellStats([...cells, { index: 4, voltage: 0, active: false }]);
    expect(stats.activeCells).toBe(3);
    expect(stats.averageCellVoltage).toBeCloseTo(3.35, 6);
  });

  it("returns zeroes when no cell is active", () => {
    const stats = computeCellStats([{ index: 1, voltage: 0, active: false }]);
    expect(stats).toEqual({
      activeCells: 0,
      minCellVoltage: 0,
      maxCellVoltage: 0,
      minCellIndex: 0,
      maxCellIndex: 0,
      deltaCellVoltage: 0,
      averageCellVoltage: 0,
    });
  });
});
