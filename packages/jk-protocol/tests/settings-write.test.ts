import { describe, expect, it } from "vitest";
import { DecoderNotVerifiedError, decodeSettings } from "../src/jk04/decoder-settings";
import { SettingsWriteDisabledError, createSettingsWriter } from "../src/jk04/encoder-settings";

describe("Phase 1 read-only guarantee", () => {
  it("rejects every settings write with SettingsWriteDisabledError", async () => {
    const writer = createSettingsWriter();
    await expect(writer.setBalancerEnabled(true)).rejects.toBeInstanceOf(SettingsWriteDisabledError);
    await expect(writer.setBalanceStartVoltage(3.4)).rejects.toBeInstanceOf(SettingsWriteDisabledError);
    await expect(writer.setBalanceDeltaVoltage(0.02)).rejects.toBeInstanceOf(SettingsWriteDisabledError);
  });

  it("does not expose a raw writeRegister escape hatch", () => {
    const writer = createSettingsWriter() as unknown as Record<string, unknown>;
    expect(writer.writeRegister).toBeUndefined();
  });

  it("keeps the settings decoder explicitly unimplemented", () => {
    expect(() => decodeSettings(Uint8Array.from([0]))).toThrow(DecoderNotVerifiedError);
  });
});
