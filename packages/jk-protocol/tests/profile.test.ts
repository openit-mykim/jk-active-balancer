import { describe, expect, it } from "vitest";
import { JK_B2A16S_PROFILE, selectProfile } from "../src/jk04/profile";

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
