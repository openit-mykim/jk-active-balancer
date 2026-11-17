import { FRAME_TYPE_SETTINGS, RESPONSE_FRAME_SIZE, RESPONSE_HEADER } from "./constants";

/**
 * JK04 settings frame decoder (response frame type 0x01).
 *
 * Field offsets are transcribed from upstream `syssi/esphome-jk-bms@3.0.0`
 * (commit b3016df) `components/jk_bms_ble/jk_bms_ble.cpp` ->
 * `decode_jk04_settings_()`, which documents the JK-B2A16S v3 example frame
 * stored in fixtures/jk-b2a16s/settings/default.upstream.hex. Only the fields
 * upstream names are decoded; bytes upstream labels "Unknown" are left alone.
 *
 * | Offset | Size | Field                    | Type        |
 * |-------:|-----:|--------------------------|-------------|
 * |     34 |    1 | cell count               | uint8       |
 * |     38 |    4 | power off voltage (V)    | float32 LE  |
 * |     98 |    4 | start balance voltage (V)| float32 LE  |
 * |    106 |    4 | trigger delta voltage (V)| float32 LE  |
 * |    110 |    4 | max balance current (A)  | float32 LE  |
 * |    114 |    1 | balancer switch          | uint8 != 0  |
 *
 * NOT HARDWARE VERIFIED: decoded against the upstream example frame only.
 */
export interface JkSettings {
  /** Configured cell count (byte 34). */
  readonly cellCount: number;
  /** Power-off voltage in volts. */
  readonly powerOffVoltage: number;
  /** Cell voltage at which balancing may start, in volts. */
  readonly balanceStartVoltage: number;
  /** Cell delta voltage that triggers balancing, in volts. */
  readonly balanceTriggerDeltaVoltage: number;
  /** Maximum balancing current, in amps. */
  readonly maxBalanceCurrent: number;
  /** Balancer enabled switch. */
  readonly balancerEnabled: boolean;
}

/**
 * Retained for API compatibility: raised by decoders whose layout has not been
 * transcribed from upstream. No decoder currently throws it.
 */
export class DecoderNotVerifiedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecoderNotVerifiedError";
  }
}

const OFFSETS = {
  cellCount: 34,
  powerOffVoltage: 38,
  balanceStartVoltage: 98,
  balanceTriggerDeltaVoltage: 106,
  maxBalanceCurrent: 110,
  balancerSwitch: 114,
} as const;

function readFloat32LE(frame: Uint8Array, offset: number): number {
  return new DataView(frame.buffer, frame.byteOffset + offset, 4).getFloat32(0, true);
}

/** True when `frame` is a complete JK04 settings frame (header + type 0x01). */
export function isSettingsFrame(frame: Uint8Array): boolean {
  return (
    frame.length >= RESPONSE_FRAME_SIZE &&
    frame[0] === RESPONSE_HEADER[0] &&
    frame[1] === RESPONSE_HEADER[1] &&
    frame[2] === RESPONSE_HEADER[2] &&
    frame[3] === RESPONSE_HEADER[3] &&
    frame[4] === FRAME_TYPE_SETTINGS
  );
}

/**
 * Decode a JK04 settings frame.
 *
 * @throws Error when the frame is not a settings frame.
 */
export function decodeSettings(frame: Uint8Array): JkSettings {
  if (!isSettingsFrame(frame)) {
    throw new Error("decodeSettings: not a JK04 settings frame (expected 55 AA EB 90 01)");
  }
  return {
    cellCount: frame[OFFSETS.cellCount],
    powerOffVoltage: readFloat32LE(frame, OFFSETS.powerOffVoltage),
    balanceStartVoltage: readFloat32LE(frame, OFFSETS.balanceStartVoltage),
    balanceTriggerDeltaVoltage: readFloat32LE(frame, OFFSETS.balanceTriggerDeltaVoltage),
    maxBalanceCurrent: readFloat32LE(frame, OFFSETS.maxBalanceCurrent),
    balancerEnabled: frame[OFFSETS.balancerSwitch] !== 0,
  };
}
