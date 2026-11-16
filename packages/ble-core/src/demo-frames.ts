import { sum8 } from "@jk-active-balancer/jk-protocol";

/**
 * SYNTHETIC frame builder for demos and layout previews (design section 28).
 * It rewrites copies of the upstream-documented JK04 fixtures; the results are
 * never device measurements and must be labelled as such in the UI.
 */
export interface DemoBaseFrames {
  readonly deviceInfo: Uint8Array;
  readonly settings: Uint8Array;
  readonly cellInfo: Uint8Array;
}

export interface DemoFrames {
  readonly deviceInfo: Uint8Array;
  readonly settings: Uint8Array;
  /** Two alternating cell-info frames (balanced, then a balancing one). */
  readonly cellInfo: readonly Uint8Array[];
}

function fix(frame: Uint8Array): Uint8Array {
  frame[299] = sum8(frame.subarray(0, 299));
  return frame;
}

function writeFloat(frame: Uint8Array, offset: number, value: number): void {
  new DataView(frame.buffer, frame.byteOffset, frame.byteLength).setFloat32(offset, value, true);
}

/** Deterministic, plausible cell voltages for `cells` cells. */
export function demoCellVoltages(cells: number, spread: number): number[] {
  return Array.from({ length: cells }, (_v, i) => 3.32 + spread * Math.sin((i + 1) * 1.7) * 0.5 + spread * 0.5);
}

/**
 * Build a device-info / settings / cell-info set for `model` with `cells`
 * populated cells (1..24) in the JK04 layout.
 */
export function buildDemoFrames(
  base: DemoBaseFrames,
  model: string,
  cells: number,
  options: { readonly maxBalanceCurrent?: number } = {},
): DemoFrames {
  const count = Math.max(1, Math.min(24, Math.trunc(cells)));

  const deviceInfo = Uint8Array.from(base.deviceInfo);
  for (let i = 0; i < 16; i += 1) deviceInfo[6 + i] = i < model.length ? model.charCodeAt(i) : 0;
  fix(deviceInfo);

  const settings = Uint8Array.from(base.settings);
  settings[34] = count;
  if (options.maxBalanceCurrent !== undefined) {
    writeFloat(settings, 110, options.maxBalanceCurrent);
  }
  fix(settings);

  const make = (spread: number, balancing: boolean): Uint8Array => {
    const frame = Uint8Array.from(base.cellInfo);
    const voltages = demoCellVoltages(count, spread);
    for (let i = 0; i < 24; i += 1) {
      writeFloat(frame, 6 + i * 4, i < count ? voltages[i] : 0);
      writeFloat(frame, 102 + i * 4, i < count ? 0.05 + (i % 5) * 0.01 : 0);
    }
    frame[220] = balancing ? 0x01 : 0x00;
    writeFloat(frame, 222, balancing ? 1.2 : 0);
    return fix(frame);
  };

  return { deviceInfo, settings, cellInfo: [make(0.004, false), make(0.06, true)] };
}
