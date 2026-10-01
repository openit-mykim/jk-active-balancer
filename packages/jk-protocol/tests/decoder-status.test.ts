import { describe, expect, it } from "vitest";
import { decodeCellInfo, isCellInfoFrame } from "../src/jk04/decoder-status";
import { loadFixture } from "./helpers/fixtures";

const BALANCED = loadFixture("status/16s-balanced.upstream.hex");
const UNBALANCED = loadFixture("status/16s-unbalanced.synthetic.hex");
const DEVICE_INFO = loadFixture("device-info/hw3-sw3.3.0.upstream.hex");

describe("decodeCellInfo", () => {
  it("decodes the real upstream 16S cell-info frame", () => {
    const info = decodeCellInfo(BALANCED);
    expect(info.cells).toHaveLength(24);
    expect(info.activeCells).toBe(16);
    expect(info.cells[0]?.voltage).toBeCloseTo(3.349716, 5);
    expect(info.cells[1]?.voltage).toBeCloseTo(3.354133, 5);
    expect(info.averageCellVoltage).toBeCloseTo(3.352845, 5);
    expect(info.deltaCellVoltage).toBeCloseTo(0.004417, 5);
    expect(info.balancer).toBe("idle");
    expect(info.balancingCurrent).toBe(0);
    expect(info.uptimeSeconds).toBe(1873491);
  });

  it("computes min / max / delta statistics from the cells", () => {
    const info = decodeCellInfo(BALANCED);
    expect(info.minCellVoltage).toBeLessThanOrEqual(info.maxCellVoltage);
    expect(info.minCellIndex).toBeGreaterThanOrEqual(1);
    expect(info.maxCellIndex).toBeLessThanOrEqual(16);
  });

  it("decodes the synthetic unbalanced frame", () => {
    const info = decodeCellInfo(UNBALANCED);
    expect(info.activeCells).toBe(16);
    expect(info.cells[0]?.voltage).toBeCloseTo(3.3, 5);
    expect(info.cells[15]?.voltage).toBeCloseTo(3.45, 5);
    expect(info.deltaCellVoltage).toBeCloseTo(0.15, 5);
    expect(info.balancer).toBe("charging");
    expect(info.balancingCurrent).toBeCloseTo(1.5, 5);
  });

  it("recognises a cell-info frame by header and type", () => {
    expect(isCellInfoFrame(BALANCED)).toBe(true);
    expect(isCellInfoFrame(DEVICE_INFO)).toBe(false);
  });

  it("throws on a device-info frame", () => {
    expect(() => decodeCellInfo(DEVICE_INFO)).toThrow(/cell-info/);
  });
});
