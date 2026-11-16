import { describe, expect, it, vi } from "vitest";
import {
  JK04_REGISTER_BALANCER_SWITCH,
  SettingsReadbackMismatchError,
  SettingsWriteDisabledError,
  SettingsWriteUnsupportedError,
  buildBalancerSwitchCommand,
  createSettingsWriter,
} from "../src/jk04/encoder-settings";
import type { JkSettings } from "../src/jk04/decoder-settings";
import { JK_B2A16S_PROFILE, type DeviceProfile } from "../src/jk04/profile";
import { toHex } from "../src/jk04/hex";

const SETTINGS: JkSettings = {
  cellCount: 16,
  powerOffVoltage: 3,
  balanceStartVoltage: 4.25,
  balanceTriggerDeltaVoltage: 0.005,
  maxBalanceCurrent: 2,
  balancerEnabled: true,
};

/** Hypothetical profile with hardware-verified write; NOT shipped. */
const WRITE_ENABLED: DeviceProfile = {
  ...JK_B2A16S_PROFILE,
  capabilities: { ...JK_B2A16S_PROFILE.capabilities, settingsWrite: true, balancerSwitch: true },
};

describe("settings write whitelist", () => {
  it("encodes the upstream JK04 balancer switch command byte-for-byte", () => {
    expect(JK04_REGISTER_BALANCER_SWITCH).toBe(0x6c);
    expect(toHex(buildBalancerSwitchCommand(true))).toBe(
      "AA 55 90 EB 6C 01 01 00 00 00 00 00 00 00 00 00 00 00 00 E8",
    );
    expect(toHex(buildBalancerSwitchCommand(false))).toBe(
      "AA 55 90 EB 6C 01 00 00 00 00 00 00 00 00 00 00 00 00 00 E7",
    );
  });

  it("rejects every write without a profile (Phase 1 default)", async () => {
    const writer = createSettingsWriter();
    await expect(writer.setBalancerEnabled(true)).rejects.toBeInstanceOf(SettingsWriteDisabledError);
    await expect(writer.setBalanceStartVoltage(3.4)).rejects.toBeInstanceOf(SettingsWriteUnsupportedError);
    await expect(writer.setBalanceDeltaVoltage(0.02)).rejects.toBeInstanceOf(SettingsWriteUnsupportedError);
  });

  it("keeps the shipped JK-B2A16S profile read-only (NOT HARDWARE VERIFIED)", async () => {
    const send = vi.fn(async () => undefined);
    const writer = createSettingsWriter({ profile: JK_B2A16S_PROFILE, send, readSettings: async () => SETTINGS });
    await expect(writer.setBalancerEnabled(false)).rejects.toBeInstanceOf(SettingsWriteDisabledError);
    expect(send).not.toHaveBeenCalled();
  });

  it("writes then verifies by read-back when a profile grants the capability", async () => {
    const sent: Uint8Array[] = [];
    const writer = createSettingsWriter({
      profile: WRITE_ENABLED,
      send: async (frame) => {
        sent.push(frame);
      },
      readSettings: async () => ({ ...SETTINGS, balancerEnabled: false }),
    });
    await expect(writer.setBalancerEnabled(false)).resolves.toBeUndefined();
    expect(sent).toHaveLength(1);
    expect(sent[0][4]).toBe(0x6c);
  });

  it("fails when the read-back disagrees", async () => {
    const writer = createSettingsWriter({
      profile: WRITE_ENABLED,
      send: async () => undefined,
      readSettings: async () => SETTINGS,
    });
    await expect(writer.setBalancerEnabled(false)).rejects.toBeInstanceOf(SettingsReadbackMismatchError);
  });

  it("never offers start/delta voltage writes for JK04 (no upstream register)", async () => {
    const writer = createSettingsWriter({ profile: WRITE_ENABLED, send: async () => undefined, readSettings: async () => SETTINGS });
    await expect(writer.setBalanceStartVoltage(3.4)).rejects.toBeInstanceOf(SettingsWriteUnsupportedError);
    await expect(writer.setBalanceDeltaVoltage(0.01)).rejects.toBeInstanceOf(SettingsWriteUnsupportedError);
  });

  it("does not expose a raw writeRegister escape hatch", () => {
    const writer = createSettingsWriter() as unknown as Record<string, unknown>;
    expect(writer.writeRegister).toBeUndefined();
  });
});
