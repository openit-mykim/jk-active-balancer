import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cellLayoutHint } from "../src/jk04/layout-hint";
import { parseHex } from "../src/jk04/hex";
import { loadFixture } from "./helpers/fixtures";

const JK02 = parseHex(readFileSync(resolve(process.cwd(), "fixtures/reference/jk02-24s-cell-info.upstream.hex"), "utf8"));

describe("cellLayoutHint (diagnostic only)", () => {
  it("recognises the real upstream JK04 cell-info frame", () => {
    const hint = cellLayoutHint(loadFixture("status/16s-balanced.upstream.hex"));
    expect(hint?.likely).toBe("JK04");
    expect(hint?.jk04PlausibleCells).toBe(16);
  });

  it("recognises the real upstream JK02_24S cell-info frame", () => {
    const hint = cellLayoutHint(JK02);
    expect(hint?.likely).toBe("JK02");
    expect(hint?.jk02PlausibleCells).toBeGreaterThanOrEqual(16);
    expect(hint?.jk02Voltages[0]).toBeCloseTo(3.327, 3);
  });

  it("ignores non cell-info frames", () => {
    expect(cellLayoutHint(loadFixture("settings/default.upstream.hex"))).toBeNull();
  });
});
