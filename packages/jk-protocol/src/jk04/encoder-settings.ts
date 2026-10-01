/**
 * JK04 settings WRITE API - Phase 2 only, whitelist registers only.
 *
 * Phase 1 is strictly read-only + diagnostics (design sections 15, 35). This
 * module exposes the intended interface so the shape is fixed, but the factory
 * returns an implementation that rejects every call. A write path may only be
 * enabled once the whitelist register, unit, range and read-back verification
 * are all validated (design section 15).
 */
export interface JkSettingsWriter {
  setBalancerEnabled(value: boolean): Promise<void>;
  setBalanceStartVoltage(value: number): Promise<void>;
  setBalanceDeltaVoltage(value: number): Promise<void>;
}

/** Raised by the Phase 1 placeholder writer for any attempted write. */
export class SettingsWriteDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsWriteDisabledError";
  }
}

/**
 * Phase 1 placeholder. Every method rejects with
 * {@link SettingsWriteDisabledError}; there is no raw `writeRegister` escape
 * hatch (design section 15 forbids exposing raw register writes to the UI).
 */
export function createSettingsWriter(): JkSettingsWriter {
  const disabled = (): Promise<void> =>
    Promise.reject(
      new SettingsWriteDisabledError("Settings write is Phase 2 (whitelist registers only); Phase 1 is read-only."),
    );
  return {
    setBalancerEnabled: disabled,
    setBalanceStartVoltage: disabled,
    setBalanceDeltaVoltage: disabled,
  };
}
