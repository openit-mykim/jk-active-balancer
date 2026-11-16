/**
 * Local-only crash log (wiki mobile standard 7 asks for crash collection; this
 * app has no server and promises that data never leaves the device, so errors
 * are recorded on the device and travel only inside a debug report the user
 * shares). Schema-versioned like the preferences (standard 5.4).
 */
export const CRASH_LOG_SCHEMA_VERSION = 1;
export const CRASH_LOG_STORAGE_KEY = "jk-active-balancer.crashes";
export const CRASH_LOG_MAX = 10;
const STACK_MAX = 1500;

export interface CrashRecord {
  /** ISO-8601 time. */
  readonly at: string;
  /** js = global handler / window.onerror, render = error boundary, promise = unhandled rejection. */
  readonly kind: "js" | "render" | "promise";
  readonly fatal: boolean;
  readonly message: string;
  readonly stack?: string;
  readonly appVersion: string;
}

export function makeCrashRecord(error: unknown, kind: CrashRecord["kind"], fatal: boolean, appVersion: string, now = Date.now()): CrashRecord {
  const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error));
  return {
    at: new Date(now).toISOString(),
    kind,
    fatal,
    message: `${e.name}: ${e.message}`.slice(0, 300),
    stack: e.stack?.slice(0, STACK_MAX),
    appVersion,
  };
}

/** Newest last, bounded to `max` entries. */
export function appendCrash(list: readonly CrashRecord[], record: CrashRecord, max = CRASH_LOG_MAX): CrashRecord[] {
  return [...list, record].slice(-max);
}

export function serializeCrashLog(list: readonly CrashRecord[]): string {
  return JSON.stringify({ schemaVersion: CRASH_LOG_SCHEMA_VERSION, crashes: list });
}

/** Unknown versions or malformed entries are dropped, never thrown. */
export function parseCrashLog(raw: string | null | undefined): CrashRecord[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { schemaVersion?: unknown; crashes?: unknown };
    if (data.schemaVersion !== CRASH_LOG_SCHEMA_VERSION || !Array.isArray(data.crashes)) return [];
    return data.crashes
      .filter(
        (c): c is CrashRecord =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as CrashRecord).at === "string" &&
          typeof (c as CrashRecord).message === "string" &&
          ["js", "render", "promise"].includes((c as CrashRecord).kind),
      )
      .slice(-CRASH_LOG_MAX);
  } catch {
    return [];
  }
}
