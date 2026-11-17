import { type ReactElement, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AppState,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  BmsSession,
  MockBleTransport,
  RawPacketLogger,
  buildDebugExport,
  type BleDevice,
  type SessionSnapshot,
} from "@jk-active-balancer/ble-core";
import { resolveActiveCellCount } from "@jk-active-balancer/device-model";
import { cellLayoutHint, parseHex } from "@jk-active-balancer/jk-protocol";
import { classifyCellVoltage, computeCellGridLayout } from "@jk-active-balancer/ui-common";
import { createBleAdapter, ensureBlePermissions, onBluetoothStateChange } from "./ble/ble-manager";
import { FIXTURE_HEX } from "./fixtures.generated";

const APP_VERSION = "0.1.0";
type Mode = "ble" | "demo";
const SWITCH_TRACK = { false: "#2c3d63", true: "#2f8f5b" };

function createSession(mode: Mode): { session: BmsSession; logger: RawPacketLogger } {
  const logger = new RawPacketLogger({ enabled: __DEV__, maxEntries: 1000 });
  const transport =
    mode === "demo"
      ? new MockBleTransport({
          devices: [{ id: "demo-jk-b2a16s", name: "JK-B2A16S (fixture replay)" }],
          deviceInfoFrames: [parseHex(FIXTURE_HEX.deviceInfo)],
          settingsFrames: [parseHex(FIXTURE_HEX.settings)],
          cellInfoFrames: [parseHex(FIXTURE_HEX.balanced), parseHex(FIXTURE_HEX.unbalanced)],
          fragmentSize: 20,
          streamIntervalMs: 1000,
        })
      : createBleAdapter();
  return { session: new BmsSession({ transport, logger }), logger };
}

export function App(): ReactElement {
  const [mode, setMode] = useState<Mode>("ble");
  const { session, logger } = useMemo(() => createSession(mode), [mode]);
  const snapshot = useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.snapshot,
  );
  const [devices, setDevices] = useState<readonly BleDevice[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    // Foreground: re-validate the link (design section 21).
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") session.checkHealth();
    });
    // Bluetooth OFF -> ON: reconnect without restarting the app (design section 36).
    const unsubscribeBt =
      mode === "ble"
        ? onBluetoothStateChange((poweredOn) => {
            if (poweredOn && session.snapshot.connection === "RECONNECT_WAIT") {
              void session.reconnectNow();
            }
          })
        : () => undefined;
    return () => {
      clearInterval(timer);
      appState.remove();
      unsubscribeBt();
      void session.disconnect().catch(() => undefined);
      session.dispose();
    };
  }, [session, mode]);

  const scan = async (): Promise<void> => {
    setMessage(null);
    setDevices([]);
    if (mode === "ble" && !(await ensureBlePermissions())) {
      setMessage("Bluetooth permission denied.");
      return;
    }
    try {
      const found = await session.scan();
      setDevices(found);
      if (found.length === 0) setMessage("No JK-B2A16S found. Is it powered and in range?");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const connect = (device: BleDevice): void => {
    setMessage(null);
    session.connect(device).catch((e: unknown) => setMessage(e instanceof Error ? e.message : String(e)));
  };

  const shareDebug = (includeRaw: boolean): void => {
    const report = buildDebugExport({
      environment: { appVersion: APP_VERSION, platform: `mobile/${mode}` },
      snapshot: session.snapshot,
      events: session.events,
      packetLog: logger.entries,
      includeRawFrames: includeRaw,
    });
    void Share.share({ title: "jk-active-balancer debug", message: JSON.stringify(report, null, 2) });
  };

  const idle = snapshot.connection === "IDLE";
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>jk-active-balancer</Text>
          <Text style={styles.muted}>
            Default device JK-B4A24S (protocol capture pending) · JK-B2A16S (JK04). Unofficial. NOT HARDWARE VERIFIED.
          </Text>

          <Card title="Connection">
            <Text style={styles.text}>
              State: <Text style={styles.badge}>{snapshot.connection}</Text>{" "}
              {snapshot.device ? snapshot.device.name ?? snapshot.device.id : ""}
            </Text>
            {snapshot.connection === "RECONNECT_WAIT" && snapshot.nextReconnectAt !== undefined && (
              <Text style={styles.muted}>
                Reconnect attempt {snapshot.reconnectAttempt} in{" "}
                {Math.max(0, Math.ceil((snapshot.nextReconnectAt - Date.now()) / 1000))} s
              </Text>
            )}
            {(message ?? snapshot.lastError) ? <Text style={styles.error}>{message ?? snapshot.lastError}</Text> : null}
            <View style={styles.row}>
              <Text style={styles.text}>Demo (fixture replay)</Text>
              <Switch trackColor={SWITCH_TRACK} thumbColor="#e6edf7" value={mode === "demo"} disabled={!idle} onValueChange={(on) => setMode(on ? "demo" : "ble")} />
            </View>
            <View style={styles.row}>
              {idle && <Button label="Scan" onPress={() => void scan()} />}
              {snapshot.connection === "RECONNECT_WAIT" && (
                <Button label="Reconnect now" onPress={() => void session.reconnectNow()} />
              )}
              {!idle && <Button label="Disconnect" onPress={() => void session.disconnect()} />}
            </View>
            {mode === "demo" && (
              <Text style={styles.muted}>
                Upstream-documented frames + 1 synthetic unbalanced frame. Not a device measurement.
              </Text>
            )}
            {idle && devices.length > 0 && (
              <FlatList
                scrollEnabled={false}
                data={devices}
                keyExtractor={(d) => d.id}
                renderItem={({ item }) => (
                  <Pressable style={styles.device} onPress={() => connect(item)}>
                    <Text style={styles.text}>{item.name ?? "(no name)"}</Text>
                    <Text style={styles.muted}>
                      {item.id} {item.rssi !== undefined ? `· ${item.rssi} dBm` : ""}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </Card>

          {snapshot.deviceInfo && <DeviceCard snapshot={snapshot} />}
          {snapshot.profile?.mode === "diagnostic" && (
            <CaptureCard snapshot={snapshot} onShare={() => shareDebug(false)} />
          )}
          {snapshot.cellInfo && <PackCard snapshot={snapshot} />}
          {snapshot.settings && (
            <Card title="Balancer settings (read-only)">
              <KV k="Balancer switch" v={snapshot.settings.balancerEnabled ? "ON" : "OFF"} />
              <KV k="Cell count" v={String(snapshot.settings.cellCount)} />
              <KV k="Balance start voltage" v={`${snapshot.settings.balanceStartVoltage.toFixed(3)} V`} />
              <KV k="Balance trigger delta" v={`${snapshot.settings.balanceTriggerDeltaVoltage.toFixed(3)} V`} />
              <KV k="Max balance current" v={`${snapshot.settings.maxBalanceCurrent.toFixed(1)} A`} />
              <KV k="Power-off voltage" v={`${snapshot.settings.powerOffVoltage.toFixed(3)} V`} />
              <Text style={styles.muted}>Settings write is disabled until verified on hardware.</Text>
            </Card>
          )}

          <Card title="Diagnostics">
            <Text style={styles.muted}>
              Frames {snapshot.framesReceived} · parser errors {snapshot.parserErrors.length} · {snapshot.freshness}
            </Text>
            <View style={styles.row}>
              <Text style={styles.text}>Raw packet logger</Text>
              <Switch
                trackColor={SWITCH_TRACK}
                thumbColor="#e6edf7"
                value={logger.enabled}
                onValueChange={(on) => {
                  logger.enabled = on;
                  setTick((t) => t + 1);
                }}
              />
            </View>
            <View style={styles.row}>
              <Button label="Share debug report" onPress={() => shareDebug(false)} />
              <Button label="…with raw frames" onPress={() => shareDebug(true)} />
            </View>
            {logger.enabled && (
              <Text style={styles.log}>
                {logger.entries
                  .slice(-30)
                  .reverse()
                  .map((e) => `${e.timestamp.slice(11, 23)} ${e.direction}${e.frame ? ` ${e.frame}` : ""} ${e.hex.slice(0, 59)}`)
                  .join("\n") || "(no packets yet)"}
              </Text>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function DeviceCard({ snapshot }: { snapshot: SessionSnapshot }): ReactElement {
  const info = snapshot.deviceInfo;
  const profile = snapshot.profile;
  if (!info) return <></>;
  return (
    <Card title="Device">
      <KV k="Model" v={info.vendorId} />
      <KV k="HW / SW" v={`${info.hardwareVersion} / ${info.softwareVersion}`} />
      <KV k="Protocol" v={profile?.profile?.protocol ?? "UNKNOWN"} />
      <KV k="Profile" v={profile?.mode === "verified" ? "VERIFIED" : "READ-ONLY DIAGNOSTIC"} />
      {profile && <Text style={styles.muted}>{profile.reason}</Text>}
    </Card>
  );
}

/** Design section 44: unknown profile -> read-only diagnostic capture. */
function CaptureCard({ snapshot, onShare }: { snapshot: SessionSnapshot; onShare: () => void }): ReactElement {
  const frames = Object.entries(snapshot.capturedFrames);
  const cell = snapshot.capturedFrames.CELL_INFO;
  const hint = cell ? cellLayoutHint(parseHex(cell.hex)) : null;
  return (
    <Card title="Protocol capture · DIAGNOSTIC">
      <Text style={styles.muted}>
        This device's protocol is not confirmed, so values are not decoded. Stay connected until CELL_INFO and SETTINGS
        appear, then share the capture with the developer.
      </Text>
      {frames.length === 0 ? (
        <Text style={styles.text}>waiting for frames...</Text>
      ) : (
        frames.map(([type, f]) => <KV key={type} k={type} v={`${f.count} frame(s)`} />)
      )}
      {hint && (
        <Text style={styles.muted}>
          Layout hint: {hint.likely} (JK04 {hint.jk04PlausibleCells} / JK02 {hint.jk02PlausibleCells} plausible cells) -
          hint only
        </Text>
      )}
      <View style={styles.row}>
        <Button label="Share capture" onPress={onShare} />
      </View>
    </Card>
  );
}

function PackCard({ snapshot }: { snapshot: SessionSnapshot }): ReactElement {
  const info = snapshot.cellInfo;
  if (!info) return <></>;
  const stale = snapshot.freshness === "stale" || snapshot.freshness === "stalled";
  const activeCells = resolveActiveCellCount({
    settingsCellCount: snapshot.settings?.cellCount,
    reportingCells: info.activeCells,
    profileMaxCells: snapshot.profile?.profile?.maxCells,
  });
  const grid = computeCellGridLayout(activeCells);
  const columns = Array.from({ length: grid.columns }, (_v, c) => grid.placements.filter((p) => p.column === c));
  const balancing =
    info.balancer === "idle" ? "Idle" : info.balancer === "unknown" ? `0x${info.balancerStatusByte.toString(16)}` : `Active (${info.balancer})`;

  return (
    <Card title={stale ? "Pack · STALE" : "Pack"}>
      <View style={[styles.stats, stale && styles.dim]}>
        <Stat label="Pack voltage" value={`${info.totalVoltage.toFixed(3)} V`} />
        <Stat label="Average" value={`${info.averageCellVoltage.toFixed(3)} V`} />
        <Stat label={`Max #${info.maxCellIndex}`} value={`${info.maxCellVoltage.toFixed(3)} V`} />
        <Stat label={`Min #${info.minCellIndex}`} value={`${info.minCellVoltage.toFixed(3)} V`} />
        <Stat label="Delta" value={`${info.deltaCellVoltage.toFixed(4)} V`} />
        <Stat label="Balancer" value={snapshot.settings ? (snapshot.settings.balancerEnabled ? "ENABLED" : "DISABLED") : "-"} />
        <Stat label="Balancing" value={balancing} />
        <Stat label="Balance current" value={`${info.balancingCurrent.toFixed(3)} A`} />
      </View>
      <Text style={styles.subtitle}>Cells ({activeCells}S)</Text>
      <View style={[styles.grid, stale && styles.dim]}>
        {columns.map((column, c) => (
          <View key={c} style={styles.column}>
            {column.map((p) => {
              const voltage = info.cells[p.index - 1]?.voltage ?? 0;
              const cls = classifyCellVoltage(voltage, info.averageCellVoltage);
              return (
                <View key={p.index} style={[styles.cell, cls === "warn" && styles.warn, cls === "alert" && styles.alert]}>
                  <Text style={[styles.muted, grid.columns === 3 && styles.compact]}>{String(p.index).padStart(2, "0")}</Text>
                  <Text style={[styles.text, grid.columns === 3 && styles.compact]}>{voltage.toFixed(3)}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function KV({ k, v }: { k: string; v: string }): ReactElement {
  return (
    <View style={styles.kv}>
      <Text style={styles.muted}>{k}</Text>
      <Text style={styles.text}>{v}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <View style={styles.stat}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }): ReactElement {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1220" },
  content: { padding: 14, gap: 12 },
  title: { color: "#e6edf7", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#e6edf7", fontSize: 15, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  text: { color: "#e6edf7", fontSize: 14 },
  muted: { color: "#8fa3bf", fontSize: 12 },
  error: { color: "#ff8a8a", fontSize: 13, marginTop: 4 },
  badge: { color: "#7ee2a8", fontWeight: "700" },
  card: { backgroundColor: "#121b2e", borderColor: "#1f2c47", borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  cardTitle: { color: "#e6edf7", fontSize: 17, fontWeight: "600", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  button: { backgroundColor: "#1b2742", borderColor: "#2c3d63", borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  pressed: { opacity: 0.6 },
  device: { paddingVertical: 10, borderTopColor: "#1f2c47", borderTopWidth: 1 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  stat: { backgroundColor: "#0e1729", borderRadius: 8, padding: 8, width: "48%" },
  statValue: { color: "#e6edf7", fontSize: 16, fontVariant: ["tabular-nums"] },
  grid: { flexDirection: "row", gap: 6 },
  column: { flex: 1, gap: 4 },
  cell: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#0e1729", borderRadius: 6, paddingVertical: 5, paddingHorizontal: 6, borderWidth: 1, borderColor: "transparent" },
  warn: { borderColor: "#b8862a" },
  alert: { borderColor: "#d05050" },
  compact: { fontSize: 11 },
  dim: { opacity: 0.55 },
  log: { color: "#9fb3cf", fontFamily: "monospace", fontSize: 10 },
});
