import { type ReactElement, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppState, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { BleDevice } from "@jk-active-balancer/ble-core";
import {
  DEFAULT_CELL_COLOR_THRESHOLDS,
  TABS,
  THEME,
  connectionStatusKey,
  resolveLanguage,
  tabLabel,
  translate,
  type Screen,
} from "@jk-active-balancer/ui-common";
import { ensureBlePermissions, onBluetoothStateChange } from "./ble/ble-manager";
import { Balance } from "./screens/Balance";
import { Control } from "./screens/Control";
import type { Prefs, ScreenProps } from "./screens/context";
import { Detail } from "./screens/Detail";
import { Devices } from "./screens/Devices";
import { Overview } from "./screens/Overview";
import { Settings } from "./screens/Settings";
import { type Mode, createSession } from "./session";
import { GLYPH } from "./ui";

const SYSTEM_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;

/**
 * App shell following jbd-bms-manager: top app bar (device list button,
 * title, connection status), five bottom-navigation destinations and a
 * full-screen device picker.
 */
export function App(): ReactElement {
  const [prefs, setPrefsState] = useState<Prefs>({
    language: "system",
    thresholds: DEFAULT_CELL_COLOR_THRESHOLDS,
    loggerEnabled: __DEV__,
  });
  const setPrefs = (patch: Partial<Prefs>): void => setPrefsState((p) => ({ ...p, ...patch }));
  const language = resolveLanguage(prefs.language, SYSTEM_LOCALE);
  const t: ScreenProps["t"] = (key, params) => translate(language, key, params);

  const [mode, setMode] = useState<Mode>("ble");
  const handle = useMemo(() => createSession(mode, prefs.loggerEnabled), [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const snapshot = useSyncExternalStore(
    (onChange) => handle.session.subscribe(onChange),
    () => handle.session.snapshot,
  );
  const [screen, setScreen] = useState<Screen>("overview");
  const [pending, setPending] = useState<"none" | "start" | "scan">("none");
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<readonly BleDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    // Foreground: re-validate the link (design section 21).
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") handle.session.checkHealth();
    });
    // Bluetooth OFF -> ON: reconnect without restarting the app (design section 36).
    const unsubscribeBt =
      mode === "ble"
        ? onBluetoothStateChange((on) => {
            if (on && handle.session.snapshot.connection === "RECONNECT_WAIT") void handle.session.reconnectNow();
          })
        : () => undefined;
    return () => {
      clearInterval(timer);
      appState.remove();
      unsubscribeBt();
      void handle.session.disconnect().catch(() => undefined);
      handle.session.dispose();
    };
  }, [handle, mode]);

  const describe = (e: unknown): string => (e instanceof Error ? e.message : String(e));

  const runScan = async (): Promise<void> => {
    setError(null);
    setFound([]);
    if (!(await ensureBlePermissions())) {
      setError("Bluetooth permission denied.");
      return;
    }
    setScanning(true);
    try {
      const devices = await handle.session.scan();
      setFound(devices);
      if (devices.length === 0) setError(t("noDevices"));
    } catch (e) {
      setError(describe(e));
    } finally {
      setScanning(false);
    }
  };

  // Act once the session for the newly chosen mode exists.
  useEffect(() => {
    if (pending === "none") return;
    const action = pending;
    setPending("none");
    if (action === "scan") {
      void runScan();
      return;
    }
    void (async () => {
      try {
        const [device] = await handle.session.scan();
        if (device) {
          setScreen("overview");
          await handle.session.connect(device);
        }
      } catch (e) {
        setError(describe(e));
      }
    })();
  }, [handle, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMode = (next: Mode): void => {
    setError(null);
    setFound([]);
    setMode(next);
    setPending("start");
  };
  const scan = (): void => {
    if (mode === "ble") {
      void runScan();
    } else {
      setMode("ble");
      setPending("scan");
    }
  };
  const connect = (device: BleDevice): void => {
    setError(null);
    setScreen("overview");
    handle.session.connect(device).catch((e: unknown) => setError(describe(e)));
  };

  const props: ScreenProps = {
    handle,
    snapshot,
    now,
    t,
    language,
    prefs,
    setPrefs,
    openDevices: () => setScreen("devices"),
    startMode,
  };
  const onDevices = screen === "devices";
  const status = t(connectionStatusKey(snapshot.connection, snapshot.freshness));

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <View style={styles.appBar}>
          <Pressable
            hitSlop={8}
            accessibilityLabel={onDevices ? t("back") : t("selectDevice")}
            onPress={() => setScreen(onDevices ? "overview" : "devices")}
            style={styles.appBarButton}
          >
            <Text style={styles.appBarGlyph}>{onDevices ? GLYPH.back : GLYPH.menu}</Text>
          </Pressable>
          <Text style={styles.appBarTitle} numberOfLines={1}>
            {onDevices ? t("devices") : tabLabel(language, screen)}
          </Text>
          <Text style={styles.appBarStatus} numberOfLines={1}>
            {snapshot.deviceInfo?.vendorId && snapshot.connection !== "IDLE" ? `${snapshot.deviceInfo.vendorId} · ` : ""}
            {status}
          </Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 16 }}>
          {screen === "overview" && <Overview {...props} />}
          {screen === "detail" && <Detail {...props} />}
          {screen === "balance" && <Balance {...props} />}
          {screen === "control" && <Control {...props} />}
          {screen === "settings" && <Settings {...props} />}
          {screen === "devices" && <Devices {...props} scanning={scanning} found={found} error={error} scan={scan} connect={connect} />}
        </ScrollView>

        {!onDevices && (
          <SafeAreaView edges={["bottom"]} style={styles.bottomNav}>
            {TABS.map((tab) => {
              const active = screen === tab;
              return (
                <Pressable key={tab} style={styles.navItem} onPress={() => setScreen(tab)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
                  <Text style={[styles.navGlyph, active && styles.navActive]}>{GLYPH[tab]}</Text>
                  <Text style={[styles.navLabel, active && styles.navActive]}>{tabLabel(language, tab)}</Text>
                </Pressable>
              );
            })}
          </SafeAreaView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.appBar },
  appBar: { height: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 8, backgroundColor: THEME.appBar },
  appBarButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  appBarGlyph: { color: THEME.onAppBar, fontSize: 24 },
  appBarTitle: { flex: 1, color: THEME.onAppBar, fontSize: 22, fontWeight: "600" },
  appBarStatus: { maxWidth: "50%", color: THEME.onAppBar, fontSize: 14, fontWeight: "700", paddingRight: 8 },
  content: { flex: 1, backgroundColor: THEME.background },
  bottomNav: { flexDirection: "row", backgroundColor: THEME.bottomBar },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 8, gap: 2 },
  navGlyph: { color: "#bdc1c6", fontSize: 20 },
  navLabel: { color: "#bdc1c6", fontSize: 12 },
  navActive: { color: THEME.primary, fontWeight: "700" },
});
