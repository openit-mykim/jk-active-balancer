import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CRASH_LOG_STORAGE_KEY,
  appendCrash,
  makeCrashRecord,
  parseCrashLog,
  serializeCrashLog,
  type CrashRecord,
} from "@jk-active-balancer/ui-common";
import { version as APP_VERSION } from "../package.json";

/** Device-local crash log (no external reporting; see ui-common crash-log.ts). */
let crashes: CrashRecord[] = [];
const listeners = new Set<() => void>();
let ready: Promise<void> | null = null;

function emit(): void {
  for (const l of listeners) l();
}

function persist(): Promise<void> {
  return AsyncStorage.setItem(CRASH_LOG_STORAGE_KEY, serializeCrashLog(crashes)).catch(() => undefined);
}

export function loadCrashes(): Promise<void> {
  ready ??= AsyncStorage.getItem(CRASH_LOG_STORAGE_KEY)
    .then((raw) => {
      // Keep anything recorded before the load finished.
      crashes = [...parseCrashLog(raw), ...crashes].slice(-10);
      emit();
    })
    .catch(() => undefined);
  return ready;
}

export function recordCrash(error: unknown, kind: CrashRecord["kind"], fatal: boolean): Promise<void> {
  crashes = appendCrash(crashes, makeCrashRecord(error, kind, fatal, APP_VERSION));
  emit();
  return persist();
}

export function getCrashes(): readonly CrashRecord[] {
  return crashes;
}

export function clearCrashes(): void {
  crashes = [];
  emit();
  void persist();
}

export function subscribeCrashes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsLike {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
}

/**
 * Wrap React Native's global JS error handler: record first, then let the
 * default handler run (red box in dev, process exit for fatal errors in release).
 */
export function installCrashHandler(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void recordCrash(error, "js", !!isFatal).finally(() => previous(error, isFatal));
  });
  void loadCrashes();
}
