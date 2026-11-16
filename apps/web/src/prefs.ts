import { useEffect, useState } from "react";
import {
  DEFAULT_CELL_COLOR_THRESHOLDS,
  resolveLanguage,
  translate,
  type CellColorThresholds,
  type Language,
  type LanguagePreference,
  type StringKey,
} from "@jk-active-balancer/ui-common";

/** App preferences (the Settings tab), persisted in localStorage. */
export interface Prefs {
  readonly language: LanguagePreference;
  readonly thresholds: CellColorThresholds;
  readonly namePrefixFallback: boolean;
  readonly loggerEnabled: boolean;
}

const KEY = "jk-active-balancer.prefs";
const DEFAULTS: Prefs = {
  language: "system",
  thresholds: DEFAULT_CELL_COLOR_THRESHOLDS,
  namePrefixFallback: false,
  loggerEnabled: import.meta.env.DEV,
};

function load(): Prefs {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Prefs> | null;
    return { ...DEFAULTS, ...stored, thresholds: { ...DEFAULTS.thresholds, ...stored?.thresholds } };
  } catch {
    return DEFAULTS;
  }
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(load);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }, [prefs]);
  return [prefs, (patch) => setPrefs((p) => ({ ...p, ...patch }))];
}

export type T = (key: StringKey, params?: Record<string, string | number>) => string;

export function makeT(prefs: Prefs): { t: T; language: Language } {
  const language = resolveLanguage(prefs.language, navigator.language);
  return { language, t: (key, params) => translate(language, key, params) };
}
