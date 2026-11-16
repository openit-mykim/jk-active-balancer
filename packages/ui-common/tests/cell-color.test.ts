import { describe, expect, it } from "vitest";
import { classifyCellVoltage } from "../src/cell-color";

describe("classifyCellVoltage", () => {
  it("uses configurable deviation thresholds", () => {
    expect(classifyCellVoltage(3.305, 3.3)).toBe("ok");
    expect(classifyCellVoltage(3.315, 3.3)).toBe("warn");
    expect(classifyCellVoltage(3.26, 3.3)).toBe("alert");
    expect(classifyCellVoltage(3.315, 3.3, { warnDeviation: 0.02, alertDeviation: 0.05 })).toBe("ok");
  });
});
