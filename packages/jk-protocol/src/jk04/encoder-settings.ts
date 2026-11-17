import { buildCommand } from "./frame-builder";
import type { JkSettings } from "./decoder-settings";
import type { DeviceProfile } from "./profile";

/**
 * JK04 settings WRITE API - whitelist registers only (design section 15).
 *
 * Whitelist, transcribed from upstream `syssi/esphome-jk-bms@3.0.0`
 * (`components/jk_bms_ble/switch/__init__.py`, `SWITCHES[CONF_BALANCER]`,
 * JK04 column, and `switch/jk_switch.cpp`):
 *
 *   balancer switch -> register 0x6C, value 0x00000001 / 0x00000000, length 1
 *
 * Upstream lists `0x00` (= not supported) in the JK04 column for every number
 * register, including balancing start voltage and balance trigger voltage, so
 * those two writes are permanently rejected for JK04.
 *
 * A write is only attempted when the selected profile grants both
 * `settingsWrite` and `balancerSwitch`. Phase 1 ships them `false` (NOT
 * HARDWARE VERIFIED). Every successful write is confirmed by reading the
 * settings frame back (design section 36 "Write").
 */
export interface JkSettingsWriter {
  setBalancerEnabled(value: boolean): Promise<void>;
  setBalanceStartVoltage(value: number): Promise<void>;
  setBalanceDeltaVoltage(value: number): Promise<void>;
}

/** JK04 balancer switch holding register (upstream JK04 column). */
export const JK04_REGISTER_BALANCER_SWITCH = 0x6c as const;

/** Raised when the profile does not (yet) allow settings writes. */
export class SettingsWriteDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsWriteDisabledError";
  }
}

/** Raised for settings that have no upstream-verified JK04 register. */
export class SettingsWriteUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsWriteUnsupportedError";
  }
}

/** Raised when the read-back after a write does not show the written value. */
export class SettingsReadbackMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsReadbackMismatchError";
  }
}

/** `write_register(0x6C, enabled ? 1 : 0, 1)` - JK04 balancer switch. */
export function buildBalancerSwitchCommand(enabled: boolean): Uint8Array {
  return buildCommand({ register: JK04_REGISTER_BALANCER_SWITCH, value: enabled ? 1 : 0, length: 1 });
}

/** Dependencies of a live settings writer. */
export interface SettingsWriterOptions {
  /** Profile of the connected device; gates every write. */
  readonly profile: DeviceProfile | null;
  /** Send one 20-byte command frame to the device. */
  readonly send: (frame: Uint8Array) => Promise<void>;
  /** Fetch a fresh settings frame from the device (read-back). */
  readonly readSettings: () => Promise<JkSettings>;
}

/**
 * Create a settings writer.
 *
 * Without options (or with a profile that does not grant write capability)
 * every method rejects with {@link SettingsWriteDisabledError}. There is no
 * raw `writeRegister` escape hatch (design section 15 forbids exposing raw
 * register writes to the UI).
 */
export function createSettingsWriter(options?: SettingsWriterOptions): JkSettingsWriter {
  const disabled = (): Promise<void> =>
    Promise.reject(
      new SettingsWriteDisabledError(
        "Settings write is disabled: the device profile has no hardware-verified write capability.",
      ),
    );
  const unsupported = (name: string) => (): Promise<void> =>
    Promise.reject(new SettingsWriteUnsupportedError(`${name} has no upstream-verified JK04 register.`));

  const capabilities = options?.profile?.capabilities;
  const canWriteSwitch = options !== undefined && capabilities?.settingsWrite === true && capabilities.balancerSwitch;

  return {
    setBalancerEnabled: canWriteSwitch
      ? async (value: boolean): Promise<void> => {
          await options.send(buildBalancerSwitchCommand(value));
          const readBack = await options.readSettings();
          if (readBack.balancerEnabled !== value) {
            throw new SettingsReadbackMismatchError(
              `Balancer switch read-back is ${readBack.balancerEnabled}, expected ${value}.`,
            );
          }
        }
      : disabled,
    setBalanceStartVoltage: unsupported("Balance start voltage"),
    setBalanceDeltaVoltage: unsupported("Balance delta voltage"),
  };
}
