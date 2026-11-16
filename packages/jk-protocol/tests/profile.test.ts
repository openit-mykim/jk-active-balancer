import { describe, expect, it } from "vitest";
import { JK_B2A16S_PROFILE, resolveProfile, selectProfile } from "../src/jk04/profile";
import { parseHex, toHex } from "../src/jk04/hex";

describe("device profile", () => {
  it("selects the JK-B2A16S profile from the decoded vendor id", () => {
    const profile = selectProfile("JK-B2A16S");
    expect(profile).not.toBeNull();
    expect(profile?.id).toBe("jk-b2a16s-hw3");
    expect(profile?.protocol).toBe("JK04");
    expect(profile?.maxCells).toBe(16);
  });

  it("keeps Phase 1 read-only (settingsWrite disabled)", () => {
    expect(JK_B2A16S_PROFILE.capabilities.settingsWrite).toBe(false);
    expect(JK_B2A16S_PROFILE.capabilities.settingsRead).toBe(true);
    expect(JK_B2A16S_PROFILE.capabilities.deviceInfo).toBe(true);
  });

  it("returns null for an unknown model (read-only diagnostic mode)", () => {
    expect(selectProfile("JK-B2A20S")).toBeNull();
  });
});

describe("resolveProfile (design section 17)", () => {
  it("selects JK04 for JK-B2A16S HW 3.0 / SW 3.3.0", () => {
    const r = resolveProfile({ vendorId: "JK-B2A16S", hardwareVersion: "3.0", softwareVersion: "3.3.0" });
    expect(r.mode).toBe("verified");
    expect(r.profile?.protocol).toBe("JK04");
    expect(r.softwareUnverified).toBe(false);
  });

  it("flags an unverified software revision but keeps the profile", () => {
    const r = resolveProfile({ vendorId: "JK-B2A16S", hardwareVersion: "3.0", softwareVersion: "3.4.1" });
    expect(r.mode).toBe("verified");
    expect(r.softwareUnverified).toBe(true);
  });

  it("enters read-only diagnostic mode for an unknown hardware revision", () => {
    const r = resolveProfile({ vendorId: "JK-B2A16S", hardwareVersion: "2.1", softwareVersion: "3.3.0" });
    expect(r.mode).toBe("diagnostic");
    expect(r.reason).toMatch(/Unknown JK-B2A16S revision/);
  });

  it("enters diagnostic mode for an unknown model and never trusts the BLE name alone", () => {
    const r = resolveProfile({ vendorId: "JK-B2A24S", hardwareVersion: "3.0", softwareVersion: "3.3.0" });
    expect(r.mode).toBe("diagnostic");
    expect(r.profile).toBeNull();
  });
});

describe("hex helpers", () => {
  it("round-trips with mixed separators", () => {
    expect(toHex(parseHex("0x55 0xAA eb.90:02"))).toBe("55 AA EB 90 02");
    expect(() => parseHex("55 ZZ")).toThrow(/invalid byte/);
  });
});
