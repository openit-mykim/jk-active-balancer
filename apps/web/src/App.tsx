import { type ReactElement, useMemo, useState } from "react";
import {
  buildDebugExport,
  debugExportFileName,
  type SessionSnapshot,
} from "@jk-active-balancer/ble-core";
import { WebBluetoothAdapter } from "@jk-active-balancer/ble-web";
import { checkCellRange, historyToCsv, resolveActiveCellCount } from "@jk-active-balancer/device-model";
import { DEFAULT_TARGET_PROFILE, KNOWN_PROFILES, cellLayoutHint, parseHex, type DeviceProfile, type JkCellInfo } from "@jk-active-balancer/jk-protocol";
import {
  DEFAULT_CELL_COLOR_THRESHOLDS,
  classifyCellVoltage,
  computeCellGridLayout,
  type CellColorThresholds,
} from "@jk-active-balancer/ui-common";
import { DEMO_LABEL } from "./fixtures";
import { Sparkline } from "./Sparkline";
import { type SessionHandle, type TransportMode, useNow, useSessionHandle, useSnapshot } from "./use-session";

const APP_VERSION = "0.1.0";
const DEV_MODE = import.meta.env.DEV || new URLSearchParams(location.search).has("dev");

function loadThresholds(): CellColorThresholds {
  try {
    const stored = JSON.parse(localStorage.getItem("cellThresholds") ?? "null") as CellColorThresholds | null;
    if (stored && stored.warnDeviation > 0 && stored.alertDeviation > 0) return stored;
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_CELL_COLOR_THRESHOLDS;
}

function download(name: string, type: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const v = (value: number | undefined, digits = 3): string => (value === undefined ? "-" : value.toFixed(digits));

export function App(): ReactElement {
  const supported = useMemo(() => WebBluetoothAdapter.isSupported(), []);
  const [mode, setMode] = useState<TransportMode>(supported ? "web-bluetooth" : "demo");
  const [namePrefixFallback, setNamePrefixFallback] = useState(false);
  const [loggerEnabled, setLoggerEnabled] = useState(DEV_MODE);
  const handle = useSessionHandle(mode, namePrefixFallback, loggerEnabled);
  const snapshot = useSnapshot(handle.session);
  const now = useNow();

  return (
    <main className="app">
      <header>
        <h1>jk-active-balancer</h1>
        <p className="subtitle">
          JK active balancer monitor - {KNOWN_PROFILES.length} products, default {DEFAULT_TARGET_PROFILE.spec.model}. Unofficial, not
          affiliated with JiKong. NOT HARDWARE VERIFIED.
        </p>
      </header>
      <ConnectionPanel
        handle={handle}
        snapshot={snapshot}
        supported={supported}
        mode={mode}
        setMode={setMode}
        namePrefixFallback={namePrefixFallback}
        setNamePrefixFallback={setNamePrefixFallback}
      />
      {snapshot.deviceInfo && <DevicePanel snapshot={snapshot} />}
      {snapshot.profile?.mode === "diagnostic" && <CapturePanel handle={handle} snapshot={snapshot} />}
      {snapshot.cellInfo && <Dashboard handle={handle} snapshot={snapshot} now={now} />}
      {snapshot.settings && <SettingsPanel handle={handle} snapshot={snapshot} />}
      <ProductsPanel mode={mode} setMode={setMode} busy={snapshot.connection !== "IDLE"} />
      <DiagnosticsPanel
        handle={handle}
        snapshot={snapshot}
        loggerEnabled={loggerEnabled}
        setLoggerEnabled={setLoggerEnabled}
        now={now}
      />
    </main>
  );
}

function ConnectionPanel(props: {
  handle: SessionHandle;
  snapshot: SessionSnapshot;
  supported: boolean;
  mode: TransportMode;
  setMode: (mode: TransportMode) => void;
  namePrefixFallback: boolean;
  setNamePrefixFallback: (value: boolean) => void;
}): ReactElement {
  const { handle, snapshot } = props;
  const [error, setError] = useState<string | null>(null);
  const busy = !["IDLE", "RECONNECT_WAIT", "ERROR"].includes(snapshot.connection);
  const connected = snapshot.connection === "READY" || snapshot.connection === "STREAMING";

  const connect = async (): Promise<void> => {
    setError(null);
    try {
      const [device] = await handle.session.scan();
      if (device) await handle.session.connect(device);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // The user closing the browser picker is not an error worth shouting about.
      if (!/cancelled|canceled|User cancelled/i.test(message)) setError(message);
    }
  };

  return (
    <section className="panel">
      <h2>Connection</h2>
      <p>
        State: <span className={`badge state-${snapshot.connection.toLowerCase()}`}>{snapshot.connection}</span>
        {snapshot.device && <span className="muted"> {snapshot.device.name ?? snapshot.device.id}</span>}
      </p>
      {snapshot.connection === "RECONNECT_WAIT" && snapshot.nextReconnectAt !== undefined && (
        <p className="muted">
          Reconnect attempt {snapshot.reconnectAttempt} in{" "}
          {Math.max(0, Math.ceil((snapshot.nextReconnectAt - Date.now()) / 1000))} s
        </p>
      )}
      {(error ?? snapshot.lastError) && <p className="error">{error ?? snapshot.lastError}</p>}
      <div className="row">
        <label>
          Transport{" "}
          <select
            value={props.mode}
            disabled={busy || connected}
            onChange={(e) => props.setMode(e.target.value as TransportMode)}
          >
            <option value="web-bluetooth" disabled={!props.supported}>
              Web Bluetooth
            </option>
            <option value="demo">Demo: JK-B2A16S (fixture replay)</option>
            <option value="demo-b4a24s">Demo: JK-B4A24S capture (synthetic)</option>
            {KNOWN_PROFILES.map((p) => (
              <option key={p.id} value={`preview:${p.id}`}>
                Preview: {p.spec.model} {p.spec.maxCells}S layout (synthetic)
              </option>
            ))}
          </select>
        </label>
        {!connected && (
          <button type="button" disabled={busy} onClick={() => void connect()}>
            {props.mode === "web-bluetooth" ? "Scan & connect" : "Start demo"}
          </button>
        )}
        {snapshot.connection === "RECONNECT_WAIT" && (
          <button type="button" onClick={() => void handle.session.reconnectNow()}>
            Reconnect now
          </button>
        )}
        {snapshot.connection !== "IDLE" && (
          <button type="button" onClick={() => void handle.session.disconnect()}>
            Disconnect
          </button>
        )}
      </div>
      {!props.supported && (
        <p className="muted">
          Web Bluetooth is not available in this browser. Use Chrome / Edge on desktop or Android over HTTPS. iOS
          Safari and iOS Chrome do not support Web Bluetooth - use the native app on iPhone.
        </p>
      )}
      {props.mode === "demo" && <p className="muted">{DEMO_LABEL}</p>}
      {props.mode.startsWith("preview:") && (
        <p className="muted">
          SYNTHETIC layout preview: JK04-layout frames generated for this product's maximum cell count. Shows how the
          screen adapts; not a measurement and not a protocol claim for this product.
        </p>
      )}
      {props.mode === "demo-b4a24s" && (
        <p className="muted">
          SYNTHETIC: the JK-B2A16S fixtures with the model renamed, to show the JK-B4A24S diagnostic capture flow. Not a
          JK-B4A24S measurement.
        </p>
      )}
      {DEV_MODE && props.mode === "web-bluetooth" && (
        <label className="muted">
          <input
            type="checkbox"
            checked={props.namePrefixFallback}
            disabled={busy || connected}
            onChange={(e) => props.setNamePrefixFallback(e.target.checked)}
          />{" "}
          Dev: also list devices named "JK-*" (for revisions that do not advertise FFE0)
        </label>
      )}
    </section>
  );
}

function DevicePanel({ snapshot }: { snapshot: SessionSnapshot }): ReactElement {
  const info = snapshot.deviceInfo;
  const profile = snapshot.profile;
  if (!info) return <></>;
  return (
    <section className="panel">
      <h2>Device</h2>
      <dl className="kv">
        <dt>Model</dt>
        <dd>{info.vendorId}</dd>
        <dt>HW / SW</dt>
        <dd>
          {info.hardwareVersion} / {info.softwareVersion}
        </dd>
        <dt>Protocol</dt>
        <dd>{profile?.profile?.protocol ?? "UNKNOWN"}</dd>
        <dt>Profile</dt>
        <dd>
          <ModeBadge mode={profile?.mode} /> <span className="muted">{profile?.reason}</span>
        </dd>
        {profile?.profile && (
          <>
            <dt>Product spec</dt>
            <dd>
              <SpecSummary profile={profile.profile} />
            </dd>
          </>
        )}
        <dt>Name</dt>
        <dd>{info.deviceName || "-"}</dd>
        <dt>Uptime / power-on count</dt>
        <dd>
          {formatDuration(info.uptimeSeconds)} / {info.powerOnCount}
        </dd>
      </dl>
    </section>
  );
}

/** Design section 44: unknown profile -> read-only diagnostic capture. */
function CapturePanel({ handle, snapshot }: { handle: SessionHandle; snapshot: SessionSnapshot }): ReactElement {
  const frames = Object.entries(snapshot.capturedFrames);
  const cell = snapshot.capturedFrames.CELL_INFO;
  const hint = cell ? cellLayoutHint(parseHex(cell.hex)) : null;
  const exportCapture = (): void => {
    const report = buildDebugExport({
      environment: { appVersion: APP_VERSION, platform: `web/${handle.mode}`, userAgent: navigator.userAgent },
      snapshot,
      events: handle.session.events,
    });
    download(debugExportFileName().replace("debug", "capture"), "application/json", JSON.stringify(report, null, 2));
  };
  return (
    <section className="panel">
      <h2>
        Protocol capture <span className="badge warn">DIAGNOSTIC</span>
      </h2>
      <p className="muted">
        This device's BLE protocol is not confirmed, so values are not decoded or shown. Leave it connected until
        CELL_INFO and SETTINGS appear below, then export the capture and hand it to the developer.
      </p>
      <dl className="kv">
        {frames.length === 0 ? (
          <>
            <dt>Frames</dt>
            <dd>waiting...</dd>
          </>
        ) : (
          frames.map(([type, f]) => (
            <span key={type} style={{ display: "contents" }}>
              <dt>{type}</dt>
              <dd>
                {f.count} frame(s), last {new Date(f.at).toLocaleTimeString()}
              </dd>
            </span>
          ))
        )}
        {hint && (
          <>
            <dt>Layout hint</dt>
            <dd>
              {hint.likely} (JK04 reading: {hint.jk04PlausibleCells} plausible cells, JK02 reading:{" "}
              {hint.jk02PlausibleCells}) - hint only, confirm against the official app
            </dd>
          </>
        )}
      </dl>
      <div className="row">
        <button type="button" disabled={frames.length === 0} onClick={exportCapture}>
          Export capture JSON
        </button>
      </div>
    </section>
  );
}

function ModeBadge({ mode }: { mode: string | undefined }): ReactElement {
  if (mode === "verified") return <span className="badge ok">VERIFIED</span>;
  if (mode === "preview") return <span className="badge warn">PREVIEW (synthetic)</span>;
  return <span className="badge warn">READ-ONLY DIAGNOSTIC</span>;
}

function SpecSummary({ profile }: { profile: DeviceProfile }): ReactElement {
  const s = profile.spec;
  const ifs = (["bluetooth", "rs485", "can", "ntc"] as const).filter((k) => s.interfaces[k]);
  return (
    <span>
      {s.minCells}S-{s.maxCells}S · {s.ratedBalanceCurrent} A rated ·{" "}
      {ifs.map((k) => (
        <span key={k} className="badge" style={{ marginRight: 4 }}>
          {k === "bluetooth" ? "BLE" : k.toUpperCase()}
        </span>
      ))}
    </span>
  );
}

/** The products this build supports (seller specification sheet, D015). */
function ProductsPanel(props: { mode: TransportMode; setMode: (m: TransportMode) => void; busy: boolean }): ReactElement {
  return (
    <section className="panel">
      <h2>Supported products</h2>
      <div className="table-wrap">
      <table className="products">
        <thead>
          <tr>
            <th>Model</th>
            <th>Cells</th>
            <th>Balance</th>
            <th>Interfaces</th>
            <th>BLE protocol</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {KNOWN_PROFILES.map((p) => (
            <tr key={p.id} className={p.id === DEFAULT_TARGET_PROFILE.id ? "default" : ""}>
              <td>
                {p.spec.model}
                {p.id === DEFAULT_TARGET_PROFILE.id && <span className="badge ok"> default</span>}
              </td>
              <td>
                {p.spec.minCells}-{p.spec.maxCells}S
              </td>
              <td>{p.spec.ratedBalanceCurrent} A</td>
              <td className="small">
                {[p.spec.interfaces.rs485 && "RS485", p.spec.interfaces.can && "CAN", p.spec.interfaces.ntc && "NTC"]
                  .filter(Boolean)
                  .join(" / ") || "BLE only"}
              </td>
              <td className="small" title={p.protocolEvidence}>
                {p.protocol === "UNKNOWN" ? "capture pending" : `${p.protocol} (upstream)`}
              </td>
              <td>
                <button
                  type="button"
                  disabled={props.busy || props.mode === `preview:${p.id}`}
                  onClick={() => props.setMode(`preview:${p.id}`)}
                >
                  Preview
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="muted small">
        Specs from the seller sheet. Only JK-B2A16S has an upstream-documented BLE protocol; the others are identified
        and captured raw until a capture confirms theirs. Preview renders SYNTHETIC frames for the product's cell range.
      </p>
    </section>
  );
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function Dashboard({ handle, snapshot, now }: { handle: SessionHandle; snapshot: SessionSnapshot; now: number }): ReactElement {
  const info = snapshot.cellInfo as JkCellInfo;
  const [thresholds, setThresholds] = useState(loadThresholds);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResistance, setShowResistance] = useState(false);
  const capabilities = snapshot.profile?.profile?.capabilities;
  const stale = snapshot.freshness === "stale" || snapshot.freshness === "stalled";
  const age = snapshot.cellInfoAt !== undefined ? Math.round((now - snapshot.cellInfoAt) / 1000) : undefined;

  const activeCells = resolveActiveCellCount({
    settingsCellCount: snapshot.settings?.cellCount,
    reportingCells: info.activeCells,
    profileMaxCells: snapshot.profile?.profile?.maxCells,
  });
  const grid = computeCellGridLayout(activeCells);
  const balancerEnabled = snapshot.settings?.balancerEnabled;
  const spec = snapshot.profile?.profile?.spec;
  const reported = snapshot.settings?.cellCount ?? info.activeCells;
  const range = spec ? checkCellRange(reported, spec) : ({ ok: true } as const);

  const saveThresholds = (next: CellColorThresholds): void => {
    setThresholds(next);
    localStorage.setItem("cellThresholds", JSON.stringify(next));
  };

  return (
    <section className={`panel ${stale ? "is-stale" : ""}`}>
      <h2>
        Pack {stale && <span className="badge warn">STALE{age !== undefined ? ` ${age}s` : ""}</span>}
      </h2>
      <div className="stats">
        <Stat label="Pack voltage" value={`${v(info.totalVoltage)} V`} />
        <Stat label="Average cell" value={`${v(info.averageCellVoltage)} V`} />
        <Stat label={`Max cell (#${info.maxCellIndex})`} value={`${v(info.maxCellVoltage)} V`} />
        <Stat label={`Min cell (#${info.minCellIndex})`} value={`${v(info.minCellVoltage)} V`} />
        <Stat label="Delta" value={`${v(info.deltaCellVoltage, 4)} V`} />
        <Stat
          label="Balancer"
          value={balancerEnabled === undefined ? "-" : balancerEnabled ? "ENABLED" : "DISABLED"}
        />
        <Stat
          label="Balancing"
          value={info.balancer === "idle" ? "Idle" : info.balancer === "unknown" ? `0x${info.balancerStatusByte.toString(16)}` : `Active (${info.balancer})`}
        />
        <Stat
          label={spec ? `Balance current (rated ${spec.ratedBalanceCurrent} A)` : "Balance current"}
          value={`${v(info.balancingCurrent)} A`}
        />
      </div>
      {!range.ok && <p className="error">{range.message}</p>}
      {spec?.interfaces.ntc && (
        <p className="muted small">This product has NTC temperature inputs; temperature is not decoded yet.</p>
      )}

      <h3>
        Cells ({activeCells}S{spec ? ` of ${spec.minCells}-${spec.maxCells}S` : ""})
        {capabilities?.cellWireResistance && (
          <label className="muted small">
            <input type="checkbox" checked={showResistance} onChange={(e) => setShowResistance(e.target.checked)} />{" "}
            Advanced: wire resistance
          </label>
        )}
      </h3>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(grid.columns, 1)}, minmax(0, 1fr))` }}>
        {grid.placements.map((placement) => {
          const cell = info.cells[placement.index - 1];
          const voltage = cell?.voltage ?? 0;
          const cls = classifyCellVoltage(voltage, info.averageCellVoltage, thresholds);
          const flag = placement.index === info.maxCellIndex ? "▲" : placement.index === info.minCellIndex ? "▼" : "";
          return (
            <button
              type="button"
              key={placement.index}
              className={`cell ${cls} ${selected === placement.index ? "selected" : ""}`}
              style={{ gridColumn: placement.column + 1, gridRow: placement.row + 1 }}
              onClick={() => setSelected(selected === placement.index ? null : placement.index)}
            >
              <span className="cell-index">
                {String(placement.index).padStart(2, "0")} {flag}
              </span>
              <span className="cell-value">
                {voltage.toFixed(3)}
                {showResistance && cell ? <small> {(cell.resistance * 1000).toFixed(1)}mΩ</small> : null}
              </span>
            </button>
          );
        })}
      </div>

      {selected !== null && <CellDetail handle={handle} info={info} index={selected} />}

      <h3>History</h3>
      <Sparkline points={handle.history.items.map((s) => ({ x: s.timestamp, y: s.deltaCellVoltage }))} label="Delta (V)" />
      <Sparkline points={handle.history.items.map((s) => ({ x: s.timestamp, y: s.totalVoltage }))} label="Pack (V)" />
      <div className="row">
        <button
          type="button"
          disabled={handle.history.items.length === 0}
          onClick={() =>
            download(`jk-active-balancer-history-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.csv`, "text/csv", historyToCsv(handle.history.items))
          }
        >
          Export CSV ({handle.history.items.length} samples)
        </button>
        <label className="muted small">
          Colour thresholds (deviation from average, V): warn{" "}
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={thresholds.warnDeviation}
            onChange={(e) => saveThresholds({ ...thresholds, warnDeviation: Number(e.target.value) || thresholds.warnDeviation })}
          />{" "}
          alert{" "}
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={thresholds.alertDeviation}
            onChange={(e) => saveThresholds({ ...thresholds, alertDeviation: Number(e.target.value) || thresholds.alertDeviation })}
          />
        </label>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function CellDetail({ handle, info, index }: { handle: SessionHandle; info: JkCellInfo; index: number }): ReactElement {
  const cell = info.cells[index - 1];
  const voltage = cell?.voltage ?? 0;
  // History stores active cells only, in order; map by position among active cells.
  const position = info.cells.slice(0, index).filter((c) => c.voltage > 0).length;
  const series = handle.history.series(position).map((p) => ({ x: p.timestamp, y: p.voltage }));
  return (
    <div className="detail">
      <strong>Cell {String(index).padStart(2, "0")}</strong>{" "}
      {index === info.maxCellIndex && <span className="badge">MAX</span>}
      {index === info.minCellIndex && <span className="badge">MIN</span>}
      <dl className="kv">
        <dt>Voltage</dt>
        <dd>{voltage.toFixed(4)} V</dd>
        <dt>Delta from average</dt>
        <dd>{((voltage - info.averageCellVoltage) * 1000).toFixed(1)} mV</dd>
        <dt>Wire resistance</dt>
        <dd>{cell ? `${(cell.resistance * 1000).toFixed(1)} mΩ` : "-"}</dd>
      </dl>
      <Sparkline points={series} label="Voltage (V)" />
    </div>
  );
}

function SettingsPanel({ handle, snapshot }: { handle: SessionHandle; snapshot: SessionSnapshot }): ReactElement {
  const s = snapshot.settings;
  const [busy, setBusy] = useState(false);
  const canWrite = snapshot.profile?.mode === "verified" && snapshot.profile.profile?.capabilities.settingsWrite === true;
  if (!s) return <></>;
  return (
    <section className="panel">
      <h2>Balancer settings (read-only)</h2>
      <dl className="kv">
        <dt>Balancer switch</dt>
        <dd>{s.balancerEnabled ? "ON" : "OFF"}</dd>
        <dt>Cell count</dt>
        <dd>{s.cellCount}</dd>
        <dt>Balance start voltage</dt>
        <dd>{v(s.balanceStartVoltage)} V</dd>
        <dt>Balance trigger delta</dt>
        <dd>{v(s.balanceTriggerDeltaVoltage, 3)} V</dd>
        <dt>Max balance current</dt>
        <dd>{v(s.maxBalanceCurrent, 1)} A</dd>
        <dt>Power-off voltage</dt>
        <dd>{v(s.powerOffVoltage)} V</dd>
      </dl>
      <div className="row">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void handle.session
              .readSettings()
              .catch(() => undefined)
              .finally(() => setBusy(false));
          }}
        >
          Refresh settings
        </button>
      </div>
      {/* Write controls stay hidden until the profile grants a hardware-verified write capability (design 14.4, 15). */}
      {!canWrite && (
        <p className="muted">
          Settings write is disabled: no hardware read-back verification yet. Only the JK04 balancer switch has an
          upstream register; start/delta voltage are not writable over JK04.
        </p>
      )}
    </section>
  );
}

function DiagnosticsPanel(props: {
  handle: SessionHandle;
  snapshot: SessionSnapshot;
  loggerEnabled: boolean;
  setLoggerEnabled: (value: boolean) => void;
  now: number;
}): ReactElement {
  const { handle, snapshot } = props;
  const [includeRaw, setIncludeRaw] = useState(false);
  // Newest first; the view is capped, the export keeps the full ring buffer.
  const entries = handle.logger.entries.slice(-200).reverse();

  const exportDebug = (): void => {
    const report = buildDebugExport({
      environment: { appVersion: APP_VERSION, platform: `web/${handle.mode}`, userAgent: navigator.userAgent },
      snapshot,
      events: handle.session.events,
      packetLog: handle.logger.entries,
      includeRawFrames: includeRaw,
    });
    download(debugExportFileName(), "application/json", JSON.stringify(report, null, 2));
  };

  return (
    <section className="panel">
      <h2>Diagnostics</h2>
      <p className="muted">
        Frames: {snapshot.framesReceived} · parser errors: {snapshot.parserErrors.length} · freshness:{" "}
        {snapshot.freshness}
      </p>
      <div className="row">
        <label>
          <input type="checkbox" checked={props.loggerEnabled} onChange={(e) => props.setLoggerEnabled(e.target.checked)} />{" "}
          Raw packet logger
        </label>
        <button type="button" onClick={() => handle.logger.clear()} disabled={handle.logger.entries.length === 0}>
          Clear log
        </button>
        <label>
          <input type="checkbox" checked={includeRaw} onChange={(e) => setIncludeRaw(e.target.checked)} /> Include raw
          frames
        </label>
        <button type="button" onClick={exportDebug}>
          Export debug JSON
        </button>
      </div>
      {props.loggerEnabled && (
        <pre className="log">
          {entries.length === 0
            ? "(no packets yet)"
            : entries
                .map(
                  (e) =>
                    `${e.timestamp} ${e.direction}${e.frame ? ` ${e.frame}` : ""}${e.error ? ` ERROR=${e.error}` : ""}\n${e.hex}${e.decoded ? `\n${e.decoded}` : ""}`,
                )
                .join("\n\n")}
        </pre>
      )}
    </section>
  );
}
