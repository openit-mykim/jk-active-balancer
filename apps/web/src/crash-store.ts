import {
  CRASH_LOG_STORAGE_KEY,
  appendCrash,
  makeCrashRecord,
  parseCrashLog,
  serializeCrashLog,
  type CrashRecord,
} from "@jk-active-balancer/ui-common";
import { version as APP_VERSION } from "../package.json";

/** Browser-local crash log, same format as the mobile app (ui-common crash-log.ts). */
let crashes: CrashRecord[] = [];
const listeners = new Set<() => void>();

function read(): CrashRecord[] {
  try {
    return parseCrashLog(localStorage.getItem(CRASH_LOG_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(CRASH_LOG_STORAGE_KEY, serializeCrashLog(crashes));
  } catch {
    // storage unavailable: memory only
  }
  for (const l of listeners) l();
}

export function recordCrash(error: unknown, kind: CrashRecord["kind"], fatal: boolean): void {
  crashes = appendCrash(crashes, makeCrashRecord(error, kind, fatal, APP_VERSION));
  persist();
}

export const getCrashes = (): readonly CrashRecord[] => crashes;

export function clearCrashes(): void {
  crashes = [];
  persist();
}

export function subscribeCrashes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function installCrashHandler(): void {
  crashes = read();
  window.addEventListener("error", (e) => recordCrash(e.error ?? e.message, "js", false));
  window.addEventListener("unhandledrejection", (e) => recordCrash(e.reason, "promise", false));
}
