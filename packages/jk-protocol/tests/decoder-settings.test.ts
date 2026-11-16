import { describe, expect, it } from "vitest";
import { decodeSettings, isSettingsFrame } from "../src/jk04/decoder-settings";
import { loadFixture } from "./helpers/fixtures";

const SETTINGS = loadFixture("settings/default.upstream.hex");
const DEVICE_INFO = loadFixture("device-info/hw3-sw3.3.0.upstream.hex");

describe("decodeSettings (JK04, upstream example frame)", () => {
  it("decodes the fields upstream names", () => {
    const settings = decodeSettings(SETTINGS);
    expect(settings.cellCount).toBe(16);
    expect(settings.powerOffVoltage).toBeCloseTo(3.0, 5);
    expect(settings.balanceStartVoltage).toBeCloseTo(4.25, 5);
    expect(settings.balanceTriggerDeltaVoltage).toBeCloseTo(0.005, 6);
    expect(settings.maxBalanceCurrent).toBeCloseTo(2.0, 5);
    expect(settings.balancerEnabled).toBe(true);
  });

  it("reads the balancer switch from byte 114", () => {
    const off = Uint8Array.from(SETTINGS);
    off[114] = 0;
    expect(decodeSettings(off).balancerEnabled).toBe(false);
  });

  it("recognises settings frames only", () => {
    expect(isSettingsFrame(SETTINGS)).toBe(true);
    expect(isSettingsFrame(DEVICE_INFO)).toBe(false);
    expect(isSettingsFrame(SETTINGS.slice(0, 120))).toBe(false);
    expect(() => decodeSettings(DEVICE_INFO)).toThrow(/settings/);
  });
});
