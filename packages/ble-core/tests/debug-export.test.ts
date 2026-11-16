import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDebugExport, debugExportFileName } from "../src/debug-export";
import { MockBleTransport } from "../src/mock-ble-transport";
import { RawPacketLogger } from "../src/packet-logger";
import { BmsSession } from "../src/session";
import { BALANCED, DEVICE_INFO, SETTINGS } from "./helpers/fixtures";

describe("debug export (design section 30)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("names the file jk-active-balancer-debug-YYYYMMDD.json", () => {
    expect(debugExportFileName(new Date(2026, 10, 16, 12).getTime())).toBe("jk-active-balancer-debug-20261116.json");
  });

  it("includes device, profile and events and masks the passcode everywhere", async () => {
    const logger = new RawPacketLogger({ enabled: true });
    const transport = new MockBleTransport({
      deviceInfoFrames: [DEVICE_INFO],
      settingsFrames: [SETTINGS],
      cellInfoFrames: [BALANCED],
      fragmentSize: 20,
    });
    const session = new BmsSession({ transport, logger });
    await session.connect({ id: "x", name: "JK-B2A16S" });
    await vi.advanceTimersByTimeAsync(10);

    const report = buildDebugExport({
      environment: { appVersion: "0.1.0", platform: "test" },
      snapshot: session.snapshot,
      events: session.events,
      packetLog: logger.entries,
      includeRawFrames: true,
    });
    const json = JSON.stringify(report);
    expect(report.device).toMatchObject({ model: "JK-B2A16S", hardwareVersion: "3.0", devicePasscode: "****" });
    expect(report.protocolProfile).toMatchObject({ mode: "verified", protocol: "JK04" });
    expect(report.hardwareVerified).toBe(false);
    expect((report.bleConnectionEvents as unknown[]).length).toBeGreaterThan(3);
    // "1234" as ASCII bytes must not survive in any exported frame.
    expect(json).not.toMatch(/31 32 33 34/);
    expect(json).not.toMatch(/"RX"/);
    session.dispose();
  });

  it("omits raw frames unless asked", async () => {
    const session = new BmsSession({ transport: new MockBleTransport() });
    const report = buildDebugExport({
      environment: { appVersion: "0.1.0", platform: "test" },
      snapshot: session.snapshot,
      events: session.events,
    });
    expect(report.rawFrames).toBeUndefined();
    session.dispose();
  });
});
