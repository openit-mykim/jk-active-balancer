import { BmsSession, MockBleTransport, RawPacketLogger, buildDemoFrames } from "@jk-active-balancer/ble-core";
import { CellHistory } from "@jk-active-balancer/device-model";
import { KNOWN_PROFILES, parseHex, previewProfile, resolveProfile, sum8, type DeviceProfile } from "@jk-active-balancer/jk-protocol";
import { createBleAdapter } from "./ble/ble-manager";
import { FIXTURE_HEX } from "./fixtures.generated";

/**
 * - ble: real device
 * - demo: JK-B2A16S upstream fixture replay
 * - demo-b4a24s: SYNTHETIC JK-B4A24S diagnostic-capture flow
 * - preview:<profile id>: SYNTHETIC layout preview for a product
 */
export type Mode = "ble" | "demo" | "demo-b4a24s" | `preview:${string}`;

export interface SessionHandle {
  readonly mode: Mode;
  readonly session: BmsSession;
  readonly logger: RawPacketLogger;
  readonly history: CellHistory;
}

export function previewTarget(mode: Mode): DeviceProfile | null {
  return KNOWN_PROFILES.find((p) => `preview:${p.id}` === mode) ?? null;
}

const base = () => ({
  deviceInfo: parseHex(FIXTURE_HEX.deviceInfo),
  settings: parseHex(FIXTURE_HEX.settings),
  cellInfo: parseHex(FIXTURE_HEX.balanced),
});

function renamed(model: string): Uint8Array {
  const frame = parseHex(FIXTURE_HEX.deviceInfo);
  for (let i = 0; i < 16; i += 1) frame[6 + i] = i < model.length ? model.charCodeAt(i) : 0;
  frame[299] = sum8(frame.subarray(0, 299));
  return frame;
}

export function createSession(mode: Mode, loggerEnabled: boolean): SessionHandle {
  const logger = new RawPacketLogger({ enabled: loggerEnabled, maxEntries: 1000 });
  const history = new CellHistory(3600, 1000);
  const preview = previewTarget(mode);
  let session: BmsSession;
  if (preview) {
    const frames = buildDemoFrames(base(), preview.spec.model, preview.spec.maxCells, {
      maxBalanceCurrent: preview.spec.ratedBalanceCurrent,
    });
    session = new BmsSession({
      transport: new MockBleTransport({
        devices: [{ id: `preview-${preview.id}`, name: `${preview.spec.model} (layout preview)` }],
        deviceInfoFrames: [frames.deviceInfo],
        settingsFrames: [frames.settings],
        cellInfoFrames: [...frames.cellInfo],
        fragmentSize: 20,
        streamIntervalMs: 1000,
      }),
      logger,
      resolveProfile: () => previewProfile(preview),
    });
  } else if (mode === "demo" || mode === "demo-b4a24s") {
    const b4 = mode === "demo-b4a24s";
    session = new BmsSession({
      transport: new MockBleTransport({
        devices: [b4 ? { id: "demo-jk-b4a24s", name: "JK-B4A24S (synthetic capture demo)" } : { id: "demo-jk-b2a16s", name: "JK-B2A16S (fixture replay)" }],
        deviceInfoFrames: [b4 ? renamed("JK-B4A24S") : parseHex(FIXTURE_HEX.deviceInfo)],
        settingsFrames: [parseHex(FIXTURE_HEX.settings)],
        cellInfoFrames: [parseHex(FIXTURE_HEX.balanced), parseHex(FIXTURE_HEX.unbalanced)],
        fragmentSize: 20,
        streamIntervalMs: 1000,
      }),
      logger,
      resolveProfile,
    });
  } else {
    session = new BmsSession({ transport: createBleAdapter(), logger, resolveProfile });
  }
  session.subscribe((s) => {
    const info = s.cellInfo;
    if (info && s.cellInfoAt !== undefined) {
      history.add({
        timestamp: s.cellInfoAt,
        totalVoltage: info.totalVoltage,
        deltaCellVoltage: info.deltaCellVoltage,
        balancingCurrent: info.balancingCurrent,
        cellVoltages: info.cells.filter((c) => c.voltage > 0).map((c) => c.voltage),
      });
    }
  });
  return { mode, session, logger, history };
}
