import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_PREFS,
  PREFS_STORAGE_KEY,
  parsePrefs,
  serializePrefs,
  type AppPrefs,
  type PrefsLoadStatus,
} from "@jk-active-balancer/ui-common";

/**
 * Persist app preferences with AsyncStorage. The format and its schema
 * version live in @jk-active-balancer/ui-common (shared with the web app).
 * Wiki standard 5.4: a record that cannot be read is removed and defaults
 * are used - start-up never fails because of storage.
 */
export async function loadPrefs(): Promise<{ prefs: AppPrefs; status: PrefsLoadStatus }> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
  } catch {
    return { prefs: DEFAULT_PREFS, status: "discarded" };
  }
  const result = parsePrefs(raw);
  if (result.status === "discarded") {
    await AsyncStorage.removeItem(PREFS_STORAGE_KEY).catch(() => undefined);
  }
  return result;
}

export function savePrefs(prefs: AppPrefs): void {
  void AsyncStorage.setItem(PREFS_STORAGE_KEY, serializePrefs(prefs)).catch(() => undefined);
}
