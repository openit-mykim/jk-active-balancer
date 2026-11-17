import type { StringKey } from "./i18n";

/**
 * App-bar status for a connection state (jbd-bms-manager shows "BMS 미연결"
 * etc. at the right of the toolbar).
 */
export function connectionStatusKey(connection: string, freshness: string): StringKey {
  if (connection === "STREAMING" || connection === "READY") {
    return freshness === "stale" || freshness === "stalled" ? "stale" : "connected";
  }
  if (connection === "RECONNECT_WAIT" || connection === "ERROR") return "reconnectWait";
  if (connection === "IDLE" || connection === "SCANNING") return "disconnected";
  return "connecting";
}
