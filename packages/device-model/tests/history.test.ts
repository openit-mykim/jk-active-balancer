import { describe, expect, it } from "vitest";
import { CellHistory, checkCellRange, historyToCsv, resolveActiveCellCount } from "../src/index";

describe("CellHistory / CSV export", () => {
  it("throttles, bounds and exports samples", () => {
    const history = new CellHistory(2, 1000);
    expect(history.add({ timestamp: 0, totalVoltage: 6.6, deltaCellVoltage: 0, balancingCurrent: 0, cellVoltages: [3.3, 3.3] })).toBe(true);
    expect(history.add({ timestamp: 500, totalVoltage: 6.6, deltaCellVoltage: 0, balancingCurrent: 0, cellVoltages: [3.3, 3.3] })).toBe(false);
    history.add({ timestamp: 1000, totalVoltage: 6.61, deltaCellVoltage: 0.01, balancingCurrent: 0.5, cellVoltages: [3.3, 3.31] });
    history.add({ timestamp: 2000, totalVoltage: 6.62, deltaCellVoltage: 0.02, balancingCurrent: 1, cellVoltages: [3.3, 3.32] });
    expect(history.items).toHaveLength(2);
    expect(history.series(2).map((p) => p.voltage)).toEqual([3.31, 3.32]);

    const csv = historyToCsv(history.items).trim().split("\n");
    expect(csv[0]).toBe("timestamp,total_voltage_v,delta_cell_voltage_v,balancing_current_a,cell_01_v,cell_02_v");
    expect(csv[1]).toBe("1970-01-01T00:00:01.000Z,6.610,0.0100,0.500,3.3000,3.3100");
  });
});

describe("resolveActiveCellCount (design section 41.2)", () => {
  it("prefers the device setting, then reporting cells, then the profile", () => {
    expect(resolveActiveCellCount({ settingsCellCount: 8, reportingCells: 16, profileMaxCells: 16 })).toBe(8);
    expect(resolveActiveCellCount({ reportingCells: 13, profileMaxCells: 16 })).toBe(13);
    expect(resolveActiveCellCount({ profileMaxCells: 16 })).toBe(16);
    expect(resolveActiveCellCount({ settingsCellCount: 0, reportingCells: 7 })).toBe(7);
    expect(resolveActiveCellCount({ settingsCellCount: 40 })).toBe(24);
    expect(resolveActiveCellCount({})).toBe(0);
  });
});

describe("product cell range (decision D015)", () => {
  it("caps the grid at the product's maximum cells", () => {
    expect(resolveActiveCellCount({ settingsCellCount: 16, profileMaxCells: 8 })).toBe(8);
    expect(resolveActiveCellCount({ reportingCells: 24, profileMaxCells: 24 })).toBe(24);
  });

  it("warns outside the specified range", () => {
    const b4 = { minCells: 8, maxCells: 24 };
    expect(checkCellRange(16, b4)).toEqual({ ok: true });
    expect(checkCellRange(6, b4)).toMatchObject({ ok: false, kind: "below-min" });
    expect(checkCellRange(10, { minCells: 4, maxCells: 8 })).toMatchObject({ ok: false, kind: "above-max" });
  });
});
