import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sum8 } from "@jk-active-balancer/jk-protocol";
import { MockBleTransport } from "../src/mock-ble-transport";
import { RawPacketLogger } from "../src/packet-logger";
import { BmsSession } from "../src/session";
import { buildDebugExport } from "../src/debug-export";
import { BALANCED, BAD_CHECKSUM, DEVICE_INFO, SETTINGS, UNBALANCED } from "./helpers/fixtures";

const DEVICE = { id: "mock-jk-b2a16s", name: "JK-B2A16S" };

function scenario(extra: Partial<ConstructorParameters<typeof MockBleTransport>[0]> = {}) {
  return new MockBleTransport({
    deviceInfoFrames: [DEVICE_INFO],
    settingsFrames: [SETTINGS],
    cellInfoFrames: [BALANCED, UNBALANCED],
    fragmentSize: 20,
    streamIntervalMs: 1000,
    ...extra,
  });
}

describe("BmsSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("walks the design section 18 lifecycle and streams data", async () => {
    const transport = scenario();
    const session = new BmsSession({ transport });
    const states: string[] = [];
    session.subscribe((s) => {
      if (states[states.length - 1] !== s.connection) states.push(s.connection);
    });

    await session.connect(DEVICE);
    await vi.advanceTimersByTimeAsync(10);

    expect(states.slice(states.indexOf("CONNECTING"))).toEqual([
      "CONNECTING",
      "DISCOVERING",
      "SUBSCRIBING",
      "IDENTIFYING",
      "READY",
      "STREAMING",
    ]);
    const snap = session.snapshot;
    expect(snap.deviceInfo?.vendorId).toBe("JK-B2A16S");
    expect(snap.profile?.mode).toBe("verified");
    expect(snap.settings?.cellCount).toBe(16);
    expect(snap.cellInfo?.activeCells).toBe(16);
    expect(snap.freshness).toBe("fresh");
    // 0x97 first, then 0x96 (upstream order).
    expect(transport.written.map((f) => f[4])).toEqual([0x97, 0x96]);
    session.dispose();
  });

  it("enters diagnostic mode for an unknown hardware revision and disables writes", async () => {
    const info = Uint8Array.from(DEVICE_INFO);
    info[22] = 0x32; // HW "3.0" -> "2.0"
    info[299] = sum8(info.subarray(0, 299));
    const transport = scenario({ deviceInfoFrames: [info] });
    const session = new BmsSession({ transport });
    await session.connect(DEVICE);
    expect(session.snapshot.profile?.mode).toBe("diagnostic");
    await expect(session.settingsWriter().setBalancerEnabled(true)).rejects.toThrow(/disabled/);
    session.dispose();
  });

  it("discards corrupt frames and keeps the previous valid state", async () => {
    const transport = scenario({ streamIntervalMs: undefined });
    const session = new BmsSession({ transport });
    await session.connect(DEVICE);
    await vi.advanceTimersByTimeAsync(10);
    const before = session.snapshot.cellInfo;
    expect(before).toBeDefined();

    transport.inject(BAD_CHECKSUM);
    // A checksum-valid frame whose type byte is unsupported.
    const odd = Uint8Array.from(BALANCED);
    odd[4] = 0x7f;
    odd[299] = sum8(odd.subarray(0, 299));
    transport.inject(odd);
    await vi.advanceTimersByTimeAsync(10);

    expect(session.snapshot.cellInfo).toBe(before);
    expect(session.snapshot.connection).toBe("STREAMING");
    session.dispose();
  });

  it("marks data stale after 5 s without zeroing values, then reconnects when stalled", async () => {
    const transport = scenario({ streamIntervalMs: undefined });
    const session = new BmsSession({ transport, statusRetryMs: 60_000 });
    await session.connect(DEVICE);
    await vi.advanceTimersByTimeAsync(10);
    const cells = session.snapshot.cellInfo;

    await vi.advanceTimersByTimeAsync(6000);
    expect(session.snapshot.freshness).toBe("stale");
    expect(session.snapshot.cellInfo).toBe(cells);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(["RECONNECT_WAIT", "CONNECTING", "STREAMING", "READY"]).toContain(session.snapshot.connection);
    expect(session.snapshot.lastError).toMatch(/stalled/);
    session.dispose();
  });

  it("reconnects automatically after a link loss with 1 s backoff", async () => {
    const transport = scenario();
    const session = new BmsSession({ transport });
    await session.connect(DEVICE);
    await vi.advanceTimersByTimeAsync(10);

    transport.simulateDisconnect();
    expect(session.snapshot.connection).toBe("RECONNECT_WAIT");
    expect(session.snapshot.reconnectAttempt).toBe(1);

    await vi.advanceTimersByTimeAsync(1100);
    expect(session.snapshot.connection).toBe("STREAMING");
    expect(session.snapshot.reconnectAttempt).toBe(0);
    expect(transport.connectCalls).toBe(2);
    session.dispose();
  });

  it("backs off 1, 2, 4 s across failed reconnects", async () => {
    const transport = scenario({ connectFailures: 3 });
    const session = new BmsSession({ transport });
    await expect(session.connect(DEVICE)).rejects.toThrow(/simulated connect failure/);
    expect(session.snapshot.reconnectAttempt).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(session.snapshot.reconnectAttempt).toBe(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(session.snapshot.reconnectAttempt).toBe(3);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(10);
    expect(session.snapshot.connection).toBe("STREAMING");
    expect(transport.connectCalls).toBe(4);
    session.dispose();
  });

  it("manual reconnect skips the backoff", async () => {
    const transport = scenario({ connectFailures: 1 });
    const session = new BmsSession({ transport });
    await expect(session.connect(DEVICE)).rejects.toThrow();
    expect(session.snapshot.connection).toBe("RECONNECT_WAIT");
    await session.reconnectNow();
    expect(session.snapshot.connection).toBe("READY");
    session.dispose();
  });

  it("user disconnect stops auto reconnect", async () => {
    const transport = scenario();
    const session = new BmsSession({ transport });
    await session.connect(DEVICE);
    await session.disconnect();
    expect(session.snapshot.connection).toBe("IDLE");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(transport.connectCalls).toBe(1);
    session.dispose();
  });

  it("times out identification when the device never answers 0x97", async () => {
    const transport = scenario({ deviceInfoFrames: [] });
    const session = new BmsSession({ transport, identifyTimeoutMs: 2000 });
    const pending = session.connect(DEVICE);
    const assertion = expect(pending).rejects.toThrow(/timeout waiting for device info/);
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
    expect(session.snapshot.connection).toBe("RECONNECT_WAIT");
    session.dispose();
  });

  it("re-sends 0x96 until status arrives (upstream update())", async () => {
    const transport = scenario({ settingsFrames: [], cellInfoFrames: [] });
    const session = new BmsSession({ transport, statusRetryMs: 1000 });
    await session.connect(DEVICE);
    await vi.advanceTimersByTimeAsync(3100);
    expect(transport.written.filter((f) => f[4] === 0x96).length).toBeGreaterThanOrEqual(3);
    session.dispose();
  });

  it("reads settings on demand", async () => {
    const transport = scenario({ streamIntervalMs: undefined });
    const session = new BmsSession({ transport });
    await session.connect(DEVICE);
    const settings = session.readSettings();
    await vi.advanceTimersByTimeAsync(10);
    await expect(settings).resolves.toMatchObject({ balancerEnabled: true, cellCount: 16 });
    session.dispose();
  });

  it("logs TX / RX / FRAME entries only when the logger is enabled", async () => {
    const logger = new RawPacketLogger({ enabled: true });
    const session = new BmsSession({ transport: scenario({ streamIntervalMs: undefined }), logger });
    await session.connect(DEVICE);
    await vi.advanceTimersByTimeAsync(10);
    const directions = new Set(logger.entries.map((e) => e.direction));
    expect(directions).toEqual(new Set(["TX", "RX", "FRAME"]));
    expect(logger.toText()).toMatch(/FRAME=DEVICE_INFO\nMODEL=JK-B2A16S\nHW=3.0\nSW=3.3.0/);
    session.dispose();

    const off = new RawPacketLogger();
    const quiet = new BmsSession({ transport: scenario({ streamIntervalMs: undefined }), logger: off });
    await quiet.connect(DEVICE);
    expect(off.entries).toHaveLength(0);
    quiet.dispose();
  });
});

describe("BmsSession with the JK-B4A24S default target (protocol not confirmed)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** SYNTHETIC: the upstream B2A16S device-info frame with the model renamed. */
  function b4a24sDeviceInfo(): Uint8Array {
    const info = Uint8Array.from(DEVICE_INFO);
    const model = "JK-B4A24S";
    for (let i = 0; i < model.length; i += 1) info[6 + i] = model.charCodeAt(i);
    info[299] = sum8(info.subarray(0, 299));
    return info;
  }

  it("identifies the device but captures cell/settings frames raw instead of decoding them", async () => {
    const transport = scenario({ deviceInfoFrames: [b4a24sDeviceInfo()], streamIntervalMs: undefined });
    const session = new BmsSession({ transport });
    await session.connect({ id: "b4a24s", name: "JK-B4A24S" });
    await vi.advanceTimersByTimeAsync(10);

    const snap = session.snapshot;
    expect(snap.deviceInfo?.vendorId).toBe("JK-B4A24S");
    expect(snap.profile?.mode).toBe("diagnostic");
    expect(snap.profile?.profile?.id).toBe("jk-b4a24s");
    expect(snap.connection).toBe("STREAMING");
    expect(snap.cellInfo).toBeUndefined();
    expect(snap.settings).toBeUndefined();
    expect(Object.keys(snap.capturedFrames).sort()).toEqual(["CELL_INFO", "DEVICE_INFO", "SETTINGS"]);
    await expect(session.settingsWriter().setBalancerEnabled(true)).rejects.toThrow(/disabled/);

    const report = buildDebugExport({
      environment: { appVersion: "test", platform: "test" },
      snapshot: snap,
      events: session.events,
    });
    const captured = report.capturedFrames as Record<string, { hex: string }>;
    expect(captured.CELL_INFO.hex.startsWith("55 AA EB 90 02")).toBe(true);
    expect(captured.DEVICE_INFO.hex).toContain("**");
    session.dispose();
  });
});
