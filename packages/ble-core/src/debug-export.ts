import { FRAME_TYPE_DEVICE_INFO, parseHex, toHex } from "@jk-active-balancer/jk-protocol";
import type { PacketLogEntry } from "./packet-logger";
import type { SessionEvent, SessionSnapshot } from "./session";

/** Environment facts the app supplies for a debug report (design section 30). */
export interface DebugExportEnvironment {
  readonly appVersion: string;
  readonly platform: string;
  readonly osVersion?: string;
  readonly userAgent?: string;
}

export interface DebugExportInput {
  readonly environment: DebugExportEnvironment;
  readonly snapshot: SessionSnapshot;
  readonly events: readonly SessionEvent[];
  /** Raw packet log; only included when `includeRawFrames` is set. */
  readonly packetLog?: readonly PacketLogEntry[];
  readonly includeRawFrames?: boolean;
  /** Local crash records (app-level), included as-is. */
  readonly crashes?: readonly unknown[];
  readonly now?: number;
}

/** Device-info passcode field: offset 62, 16 bytes (see protocol-design.md). */
const PASSCODE_OFFSET = 62;
const PASSCODE_LENGTH = 16;
const MASK = "****";

/** File name `jk-active-balancer-debug-YYYYMMDD.json` (design section 30). */
export function debugExportFileName(now: number = Date.now()): string {
  const d = new Date(now);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `jk-active-balancer-debug-${yyyy}${mm}${dd}.json`;
}

/** Zero the passcode bytes of an assembled device-info frame hex dump. */
function maskFrameHex(hex: string): string {
  const bytes = parseHex(hex);
  if (bytes.length < PASSCODE_OFFSET + PASSCODE_LENGTH || bytes[4] !== FRAME_TYPE_DEVICE_INFO) {
    return hex;
  }
  const tokens = toHex(bytes).split(" ");
  for (let i = PASSCODE_OFFSET; i < PASSCODE_OFFSET + PASSCODE_LENGTH; i += 1) {
    tokens[i] = "**";
  }
  return tokens.join(" ");
}

/**
 * Build the debug report object. The device passcode is always masked; raw
 * notification fragments (RX) are never exported because a fragment boundary
 * could split the passcode - assembled frames (masked) and TX commands carry
 * the same information.
 */
export function buildDebugExport(input: DebugExportInput): Record<string, unknown> {
  const { snapshot } = input;
  const info = snapshot.deviceInfo;
  const report: Record<string, unknown> = {
    generatedAt: new Date(input.now ?? Date.now()).toISOString(),
    app: { version: input.environment.appVersion },
    platform: {
      name: input.environment.platform,
      osVersion: input.environment.osVersion ?? "unknown",
      userAgent: input.environment.userAgent,
    },
    hardwareVerified: false,
    device: info
      ? {
          model: info.vendorId,
          hardwareVersion: info.hardwareVersion,
          softwareVersion: info.softwareVersion,
          deviceName: info.deviceName,
          devicePasscode: info.devicePasscode.length > 0 ? MASK : "",
          serialNumber: info.serialNumber,
          uptimeSeconds: info.uptimeSeconds,
          powerOnCount: info.powerOnCount,
        }
      : null,
    protocolProfile: snapshot.profile
      ? {
          mode: snapshot.profile.mode,
          id: snapshot.profile.profile?.id ?? null,
          protocol: snapshot.profile.profile?.protocol ?? null,
          reason: snapshot.profile.reason,
        }
      : null,
    connection: {
      state: snapshot.connection,
      freshness: snapshot.freshness,
      reconnectAttempt: snapshot.reconnectAttempt,
      lastError: snapshot.lastError ?? null,
    },
    bleConnectionEvents: input.events,
    parserErrors: snapshot.parserErrors,
    crashes: input.crashes ?? [],
    // Latest raw frame per type; the device passcode is masked. Always
    // included so a diagnostic-mode capture needs no extra switch.
    capturedFrames: Object.fromEntries(
      Object.entries(snapshot.capturedFrames).map(([type, frame]) => [
        type,
        { ...frame, at: new Date(frame.at).toISOString(), hex: maskFrameHex(frame.hex) },
      ]),
    ),
  };
  if (input.includeRawFrames) {
    report.rawFrames = (input.packetLog ?? [])
      .filter((entry) => entry.direction !== "RX")
      .map((entry) => (entry.direction === "FRAME" ? { ...entry, hex: maskFrameHex(entry.hex) } : entry));
  }
  return report;
}
