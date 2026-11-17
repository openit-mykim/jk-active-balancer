import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BmsSession, MockBleTransport, RawPacketLogger, type BleTransport, type SessionSnapshot } from "@jk-active-balancer/ble-core";
import { WebBluetoothAdapter } from "@jk-active-balancer/ble-web";
import { CellHistory } from "@jk-active-balancer/device-model";
import { sum8 } from "@jk-active-balancer/jk-protocol";
import { FIXTURES } from "./fixtures";

/** SYNTHETIC: upstream B2A16S device-info frame with the model renamed to JK-B4A24S. */
function renamedDeviceInfo(model: string): Uint8Array {
  const frame = Uint8Array.from(FIXTURES.deviceInfo);
  for (let i = 0; i < 16; i += 1) frame[6 + i] = i < model.length ? model.charCodeAt(i) : 0;
  frame[299] = sum8(frame.subarray(0, 299));
  return frame;
}

export type TransportMode = "web-bluetooth" | "demo" | "demo-b4a24s";

export interface SessionHandle {
  readonly mode: TransportMode;
  readonly session: BmsSession;
  readonly logger: RawPacketLogger;
  readonly history: CellHistory;
}

function createTransport(mode: TransportMode, namePrefixFallback: boolean): BleTransport {
  if (mode === "demo" || mode === "demo-b4a24s") {
    const b4 = mode === "demo-b4a24s";
    return new MockBleTransport({
      devices: [b4 ? { id: "demo-jk-b4a24s", name: "JK-B4A24S (synthetic capture demo)" } : { id: "demo-jk-b2a16s", name: "JK-B2A16S (fixture replay)" }],
      deviceInfoFrames: [b4 ? renamedDeviceInfo("JK-B4A24S") : FIXTURES.deviceInfo],
      settingsFrames: [FIXTURES.settings],
      cellInfoFrames: [FIXTURES.balanced, FIXTURES.unbalanced],
      fragmentSize: 20,
      streamIntervalMs: 1000,
    });
  }
  return new WebBluetoothAdapter(namePrefixFallback ? { namePrefixFallback: "JK-" } : {});
}

/** Owns one BmsSession per (mode, fallback) choice and tears it down on change. */
export function useSessionHandle(mode: TransportMode, namePrefixFallback: boolean, loggerEnabled: boolean): SessionHandle {
  const handle = useMemo<SessionHandle>(() => {
    const logger = new RawPacketLogger({ enabled: false, maxEntries: 2000 });
    const session = new BmsSession({ transport: createTransport(mode, namePrefixFallback), logger });
    return { mode, session, logger, history: new CellHistory(3600, 1000) };
  }, [mode, namePrefixFallback]);

  useEffect(() => {
    handle.logger.enabled = loggerEnabled;
  }, [handle, loggerEnabled]);

  useEffect(() => {
    const unsubscribe = handle.session.subscribe((snapshot) => {
      const info = snapshot.cellInfo;
      if (info && snapshot.cellInfoAt !== undefined) {
        handle.history.add({
          timestamp: snapshot.cellInfoAt,
          totalVoltage: info.totalVoltage,
          deltaCellVoltage: info.deltaCellVoltage,
          balancingCurrent: info.balancingCurrent,
          cellVoltages: info.cells.filter((c) => c.voltage > 0).map((c) => c.voltage),
        });
      }
    });
    // Background tabs throttle timers; re-validate on return (design section 19).
    const onVisible = (): void => {
      if (document.visibilityState === "visible") handle.session.checkHealth();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      void handle.session.disconnect().catch(() => undefined);
      handle.session.dispose();
    };
  }, [handle]);

  return handle;
}

export function useSnapshot(session: BmsSession): SessionSnapshot {
  return useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.snapshot,
  );
}

/** Re-render every second so ages and the STALE badge stay current. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
