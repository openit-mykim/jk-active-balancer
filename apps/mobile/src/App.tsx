import { type ReactElement, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppState, Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { BleDevice } from "@jk-active-balancer/ble-core";
import {
  DEFAULT_PREFS,
  SIZE,
  SPACE,
  TABS,
  THEME,
  connectionStatusKey,
  resolveLanguage,
  tabLabel,
  translate,
  type AppPrefs,
  type Screen,
} from "@jk-active-balancer/ui-common";
import { version as APP_VERSION } from "../package.json";
import { ensureBlePermissions, onBluetoothStateChange } from "./ble/ble-manager";
import { loadPrefs, savePrefs } from "./prefs-store";
import { Balance } from "./screens/Balance";
import { Control } from "./screens/Control";
import type { ScreenProps } from "./screens/context";
import { Detail } from "./screens/Detail";
import { Devices } from "./screens/Devices";
import { Overview } from "./screens/Overview";
import { Settings } from "./screens/Settings";
import { type Mode, createSession } from "./session";
import { Glyph, Txt } from "./ui";

const SYSTEM_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;

/** Waits for stored preferences so the first frame is already in the chosen language. */
export function App(): ReactElement {
  const [loaded, setLoaded] = useState<{ prefs: AppPrefs; reset: boolean } | null>(null);
  useEffect(() => {
    void loadPrefs().then(({ prefs, status }) => setLoaded({ prefs, reset: status === "discarded" }));
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {loaded ? <Shell initialPrefs={loaded.prefs} prefsReset={loaded.reset} /> : <View style={styles.splash} />}
    </SafeAreaProvider>
  );
}

/**
 * App shell following jbd-bms-manager: app bar (device list button, title,
 * connection status), five bottom-navigation destinations, device screen.
 * Component sizes follow the wiki mobile standard 5.7.7.
 */
function Shell({ initialPrefs, prefsReset }: { initialPrefs: AppPrefs; prefsReset: boolean }): ReactElement {
  const [prefs, setPrefsState] = useState<AppPrefs>(initialPrefs);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    savePrefs(prefs);
  }, [prefs]);
  const setPrefs = (patch: Partial<AppPrefs>): void => setPrefsState((p) => ({ ...p, ...patch }));
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
  const [permissionDenied, setPermissionDenied] = useState(false);
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
    // 5.8: ask when the user starts a scan; on denial show the alternative, do not loop.
    if (!(await ensureBlePermissions())) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
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
    appVersion: APP_VERSION,
  };
  const onDevices = screen === "devices";
  const status = t(connectionStatusKey(snapshot.connection, snapshot.freshness));

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.appBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onDevices ? t("back") : t("selectDevice")}
          onPress={() => setScreen(onDevices ? "overview" : "devices")}
          style={styles.appBarButton}
        >
          <Glyph name={onDevices ? "back" : "menu"} color="onAppBar" />
        </Pressable>
        <Txt role="heading" bold color="onAppBar" lines={1} style={styles.appBarTitle} fixed>
          {onDevices ? t("devices") : tabLabel(language, screen)}
        </Txt>
        <Txt role="label" bold color="onAppBar" lines={1} style={styles.appBarStatus} fixed>
          {snapshot.deviceInfo?.vendorId && snapshot.connection !== "IDLE" ? `${snapshot.deviceInfo.vendorId} · ` : ""}
          {status}
        </Txt>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: SPACE.lg }}>
        {screen === "overview" && <Overview {...props} />}
        {screen === "detail" && <Detail {...props} />}
        {screen === "balance" && <Balance {...props} />}
        {screen === "control" && <Control {...props} />}
        {screen === "settings" && <Settings {...props} prefsReset={prefsReset} />}
        {screen === "devices" && (
          <Devices {...props} scanning={scanning} found={found} error={error} permissionDenied={permissionDenied} scan={scan} connect={connect} />
        )}
      </ScrollView>

      {!onDevices && (
        <SafeAreaView edges={["bottom"]} style={styles.bottomNav} accessibilityRole="tablist">
          {TABS.map((tab) => {
            const active = screen === tab;
            return (
              <Pressable
                key={tab}
                style={styles.navItem}
                onPress={() => setScreen(tab)}
                accessibilityRole="tab"
                accessibilityLabel={tabLabel(language, tab)}
                accessibilityState={{ selected: active }}
              >
                <Glyph name={tab} color={active ? "primary" : "onSurfaceVariant"} />
                <Txt role="caption" bold={active} fixed lines={1} color={active ? "primary" : "onSurfaceVariant"}>
                  {tabLabel(language, tab)}
                </Txt>
              </Pressable>
            );
          })}
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: THEME.background },
  root: { flex: 1, backgroundColor: THEME.appBar },
  appBar: { height: SIZE.appBar, flexDirection: "row", alignItems: "center", gap: SPACE.sm, paddingHorizontal: SPACE.xs, backgroundColor: THEME.appBar },
  appBarButton: { width: SIZE.touchMin, height: SIZE.touchMin, alignItems: "center", justifyContent: "center" },
  appBarTitle: { flex: 1 },
  appBarStatus: { maxWidth: "50%", paddingRight: SPACE.md },
  content: { flex: 1, backgroundColor: THEME.background },
  bottomNav: { flexDirection: "row", backgroundColor: THEME.bottomBar },
  navItem: { flex: 1, minHeight: SIZE.tabBar, alignItems: "center", justifyContent: "center" },
});
