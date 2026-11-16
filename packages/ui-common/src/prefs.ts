import { DEFAULT_CELL_COLOR_THRESHOLDS, type CellColorThresholds } from "./cell-color";
import type { LanguagePreference } from "./i18n";

/**
 * App preferences, one definition for web (localStorage) and mobile
 * (AsyncStorage). Wiki standard 5.4: local storage carries a schema version;
 * anything unreadable is discarded and defaults are used - never a crash.
 */
export const PREFS_SCHEMA_VERSION = 1;
export const PREFS_STORAGE_KEY = "jk-active-balancer.prefs";

export interface AppPrefs {
  readonly language: LanguagePreference;
  readonly thresholds: CellColorThresholds;
  readonly loggerEnabled: boolean;
  /** Web only: also offer devices named JK-* in the picker. */
  readonly namePrefixFallback: boolean;
}

export const DEFAULT_PREFS: AppPrefs = {
  language: "system",
  thresholds: DEFAULT_CELL_COLOR_THRESHOLDS,
  loggerEnabled: false,
  namePrefixFallback: false,
};

export type PrefsLoadStatus = "default" | "loaded" | "discarded";

export function serializePrefs(prefs: AppPrefs): string {
  return JSON.stringify({ schemaVersion: PREFS_SCHEMA_VERSION, ...prefs });
}

const LANGS = new Set(["system", "ko", "en"]);

/**
 * Parse stored preferences. Unknown schema versions, corrupt JSON or invalid
 * fields are discarded (the whole record for structural problems, a single
 * field for an invalid value) so an old or broken cache can never break start-up.
 */
export function parsePrefs(raw: string | null | undefined, defaults: AppPrefs = DEFAULT_PREFS): { prefs: AppPrefs; status: PrefsLoadStatus } {
  if (raw === null || raw === undefined || raw === "") {
    return { prefs: defaults, status: "default" };
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { prefs: defaults, status: "discarded" };
  }
  if (typeof data !== "object" || data === null || (data as { schemaVersion?: unknown }).schemaVersion !== PREFS_SCHEMA_VERSION) {
    return { prefs: defaults, status: "discarded" };
  }
  const d = data as Record<string, unknown>;
  const t = (d.thresholds ?? {}) as Record<string, unknown>;
  const warn = typeof t.warnDeviation === "number" && t.warnDeviation > 0 ? t.warnDeviation : defaults.thresholds.warnDeviation;
  const alert = typeof t.alertDeviation === "number" && t.alertDeviation > warn ? t.alertDeviation : Math.max(defaults.thresholds.alertDeviation, warn * 2);
  return {
    prefs: {
      language: typeof d.language === "string" && LANGS.has(d.language) ? (d.language as LanguagePreference) : defaults.language,
      thresholds: { warnDeviation: warn, alertDeviation: alert },
      loggerEnabled: typeof d.loggerEnabled === "boolean" ? d.loggerEnabled : defaults.loggerEnabled,
      namePrefixFallback: typeof d.namePrefixFallback === "boolean" ? d.namePrefixFallback : defaults.namePrefixFallback,
    },
    status: "loaded",
  };
}
