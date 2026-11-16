import type { SessionSnapshot } from "@jk-active-balancer/ble-core";
import type { CellColorThresholds, Language, LanguagePreference, StringKey } from "@jk-active-balancer/ui-common";
import type { Mode, SessionHandle } from "../session";

export interface Prefs {
  readonly language: LanguagePreference;
  readonly thresholds: CellColorThresholds;
  readonly loggerEnabled: boolean;
}

export type T = (key: StringKey, params?: Record<string, string | number>) => string;

export interface ScreenProps {
  readonly handle: SessionHandle;
  readonly snapshot: SessionSnapshot;
  readonly now: number;
  readonly t: T;
  readonly language: Language;
  readonly prefs: Prefs;
  readonly setPrefs: (patch: Partial<Prefs>) => void;
  readonly openDevices: () => void;
  readonly startMode: (mode: Mode) => void;
}

export function hasDevice(s: SessionSnapshot): boolean {
  return s.deviceInfo !== undefined || s.connection !== "IDLE";
}

export function modeLabel(t: T, mode: string | undefined): string {
  return mode === "verified" ? t("modeVerified") : mode === "preview" ? t("modePreview") : t("modeDiagnostic");
}
