import { useEffect, useState } from "react";
import {
  DEFAULT_PREFS,
  PREFS_STORAGE_KEY,
  parsePrefs,
  resolveLanguage,
  serializePrefs,
  translate,
  type AppPrefs,
  type Language,
  type StringKey,
} from "@jk-active-balancer/ui-common";

/** App preferences (the Settings tab); format + schema version shared with mobile. */
export type Prefs = AppPrefs;

const DEFAULTS: Prefs = { ...DEFAULT_PREFS, loggerEnabled: import.meta.env.DEV };

function load(): { prefs: Prefs; reset: boolean } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFS_STORAGE_KEY);
  } catch {
    return { prefs: DEFAULTS, reset: true };
  }
  const { prefs, status } = parsePrefs(raw, DEFAULTS);
  if (status === "discarded") {
    try {
      localStorage.removeItem(PREFS_STORAGE_KEY);
    } catch {
      // storage unavailable: keep defaults
    }
  }
  return { prefs, reset: status === "discarded" };
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void, boolean] {
  const [initial] = useState(load);
  const [prefs, setPrefs] = useState<Prefs>(initial.prefs);
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, serializePrefs(prefs));
    } catch {
      // private mode / quota: preferences stay in memory
    }
  }, [prefs]);
  return [prefs, (patch) => setPrefs((p) => ({ ...p, ...patch })), initial.reset];
}

export type T = (key: StringKey, params?: Record<string, string | number>) => string;

export function makeT(prefs: Prefs): { t: T; language: Language } {
  const language = resolveLanguage(prefs.language, navigator.language);
  return { language, t: (key, params) => translate(language, key, params) };
}
