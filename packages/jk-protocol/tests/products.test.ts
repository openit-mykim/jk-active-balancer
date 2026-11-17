import { describe, expect, it } from "vitest";
import { KNOWN_PROFILES, previewProfile, resolveProfile, selectProfile } from "../src/jk04/profile";

const id = (vendorId: string) => ({ vendorId, hardwareVersion: "1.0", softwareVersion: "1.0" });

describe("supported products (seller specification sheet, decision D015)", () => {
  it("registers the five products with their cell range and rated current", () => {
    expect(KNOWN_PROFILES.map((p) => [p.spec.model, p.spec.minCells, p.spec.maxCells, p.spec.ratedBalanceCurrent])).toEqual([
      ["JK-B2A8S", 4, 8, 2],
      ["JK-B2A16S", 8, 16, 2],
      ["JK-DZ11B2A24S", 8, 24, 2],
      ["JK-DZ08B2A24S", 8, 24, 2],
      ["JK-B4A24S", 8, 24, 4],
    ]);
    for (const p of KNOWN_PROFILES) expect(p.maxCells).toBe(p.spec.maxCells);
  });

  it("records the interface differences", () => {
    const by = Object.fromEntries(KNOWN_PROFILES.map((p) => [p.spec.model, p.spec.interfaces]));
    expect(by["JK-DZ11B2A24S"]).toMatchObject({ rs485: true, can: false, ntc: true });
    expect(by["JK-DZ08B2A24S"]).toMatchObject({ rs485: false, can: true, ntc: true });
    expect(by["JK-B4A24S"]).toMatchObject({ rs485: false, can: false, ntc: false });
  });

  it("matches model strings without confusing related names", () => {
    expect(selectProfile("JK-DZ11-B2A24S")?.id).toBe("jk-dz11-b2a24s");
    expect(selectProfile("JK_DZ08B2A24S")?.id).toBe("jk-dz08-b2a24s");
    expect(selectProfile("JK-B2A8S")?.id).toBe("jk-b2a8s");
    // The upstream JK-B2A8S20P is a BMS, not this balancer.
    expect(selectProfile("JK-B2A8S20P")).toBeNull();
    expect(selectProfile("JK-B2A24S")).toBeNull();
  });

  it("decodes only the product with protocol evidence", () => {
    for (const p of KNOWN_PROFILES) {
      const r = resolveProfile({ vendorId: p.spec.model, hardwareVersion: "3.0", softwareVersion: "3.3.0" });
      expect(r.mode).toBe(p.id === "jk-b2a16s-hw3" ? "verified" : "diagnostic");
    }
    expect(resolveProfile(id("JK-B4A24S")).reason).toMatch(/capturing raw frames/);
  });

  it("preview mode decodes but never grants writes", () => {
    for (const p of KNOWN_PROFILES) {
      const r = previewProfile(p);
      expect(r.mode).toBe("preview");
      expect(r.profile?.capabilities.cellVoltage).toBe(true);
      expect(r.profile?.capabilities.settingsWrite).toBe(false);
      expect(r.profile?.spec.maxCells).toBe(p.spec.maxCells);
    }
  });
});
