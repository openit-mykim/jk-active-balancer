import type { SessionSnapshot } from "@jk-active-balancer/ble-core";
import type { Language } from "@jk-active-balancer/ui-common";
import type { Prefs, T } from "../prefs";
import type { SessionHandle, TransportMode } from "../use-session";

/** Everything a screen needs; passed down from App. */
export interface ScreenProps {
  readonly handle: SessionHandle;
  readonly snapshot: SessionSnapshot;
  readonly now: number;
  readonly t: T;
  readonly language: Language;
  readonly prefs: Prefs;
  readonly setPrefs: (patch: Partial<Prefs>) => void;
  readonly openDevices: () => void;
  readonly startMode: (mode: TransportMode) => void;
  readonly webBluetooth: boolean;
  readonly appVersion: string;
  readonly prefsReset: boolean;
}

/** True once the session holds anything worth showing. */
export function hasDevice(s: SessionSnapshot): boolean {
  return s.deviceInfo !== undefined || s.connection !== "IDLE";
}
