import { type ReactElement, useEffect, useMemo, useState } from "react";
import { WebBluetoothAdapter } from "@jk-active-balancer/ble-web";
import { TABS, connectionStatusKey, tabLabel, type Screen, type Tab } from "@jk-active-balancer/ui-common";
import { ErrorBoundary } from "./ErrorBoundary";
import { Icon } from "./icons";
import { version as APP_VERSION } from "../package.json";
import { makeT, usePrefs } from "./prefs";
import { Balance } from "./screens/Balance";
import { Control } from "./screens/Control";
import type { ScreenProps } from "./screens/context";
import { Detail } from "./screens/Detail";
import { Devices } from "./screens/Devices";
import { Overview } from "./screens/Overview";
import { Settings } from "./screens/Settings";
import { type TransportMode, useNow, useSessionHandle, useSnapshot } from "./use-session";

/**
 * App shell following jbd-bms-manager: a top app bar (device list button,
 * title, connection status), five bottom-navigation destinations, and a
 * full-screen device picker.
 */
export function App(): ReactElement {
  const webBluetooth = useMemo(() => WebBluetoothAdapter.isSupported(), []);
  const [prefs, setPrefs, prefsReset] = usePrefs();
  const { t, language } = makeT(prefs);
  const [mode, setMode] = useState<TransportMode>(webBluetooth ? "web-bluetooth" : "demo");
  const [screen, setScreen] = useState<Screen>("overview");
  const [pendingStart, setPendingStart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handle = useSessionHandle(mode, prefs.namePrefixFallback, prefs.loggerEnabled);
  const snapshot = useSnapshot(handle.session);
  const now = useNow();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Start the chosen transport once its session exists (mode switches rebuild it).
  useEffect(() => {
    if (!pendingStart) return;
    setPendingStart(false);
    void (async () => {
      try {
        const [device] = await handle.session.scan();
        if (device) {
          setScreen("overview");
          await handle.session.connect(device);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (!/cancel/i.test(message)) setError(message);
      }
    })();
  }, [handle, pendingStart]);

  const startMode = (next: TransportMode): void => {
    setError(null);
    setMode(next);
    setPendingStart(true);
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
    webBluetooth,
    appVersion: APP_VERSION,
    prefsReset,
  };
  const status = t(connectionStatusKey(snapshot.connection, snapshot.freshness));
  const onDevices = screen === "devices";

  return (
    <div className="shell">
      <header className="app-bar">
        {onDevices ? (
          <button type="button" className="icon-btn" aria-label={t("back")} onClick={() => setScreen("overview")}>
            <Icon name="back" />
          </button>
        ) : (
          <button type="button" className="icon-btn" aria-label={t("selectDevice")} onClick={() => setScreen("devices")}>
            <Icon name="menu" />
          </button>
        )}
        <h1 className="app-bar-title">{onDevices ? t("devices") : tabLabel(language, screen)}</h1>
        <span className={`app-bar-status status-${snapshot.connection.toLowerCase()}`}>
          {snapshot.deviceInfo?.vendorId && snapshot.connection !== "IDLE" ? `${snapshot.deviceInfo.vendorId} · ` : ""}
          {status}
        </span>
      </header>

      <main className="content">
        <ErrorBoundary title={t("errorTitle")} body={t("errorBody")} retry={t("retry")}>
        {screen === "overview" && <Overview {...props} />}
        {screen === "detail" && <Detail {...props} />}
        {screen === "balance" && <Balance {...props} />}
        {screen === "control" && <Control {...props} />}
        {screen === "settings" && <Settings {...props} />}
        {screen === "devices" && <Devices {...props} error={error} />}
        </ErrorBoundary>
      </main>

      {!onDevices && (
        <nav className="bottom-nav" aria-label="main">
          {TABS.map((tab: Tab) => (
            <button
              type="button"
              key={tab}
              className={screen === tab ? "active" : ""}
              aria-current={screen === tab ? "page" : undefined}
              onClick={() => setScreen(tab)}
            >
              <Icon name={tab} />
              <span>{tabLabel(language, tab)}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
