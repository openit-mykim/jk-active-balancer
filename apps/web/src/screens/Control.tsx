import { type ReactElement, useState } from "react";
import { buildDebugExport, debugExportFileName } from "@jk-active-balancer/ble-core";
import { cellLayoutHint, parseHex } from "@jk-active-balancer/jk-protocol";
import { freshnessLabel } from "@jk-active-balancer/ui-common";
import { Icon } from "../icons";
import { Card, EmptyState, Row, Toggle, download, fmt } from "../ui";
import type { ScreenProps } from "./context";


/**
 * 제어: the locked maintenance workspace (jbd-bms-manager Control). Holds the
 * balancer settings (read-only until hardware read-back), protocol capture and
 * technician diagnostics.
 */
export function Control(p: ScreenProps): ReactElement {
  const { snapshot: s, t, handle } = p;
  const [unlocked, setUnlocked] = useState(false);
  const [includeRaw, setIncludeRaw] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!unlocked) {
    return (
      <EmptyState icon={<Icon name="lock" size={96} />} title={t("maintenanceTitle")} body={t("maintenanceBody")}>
        <button type="button" className="btn-filled" onClick={() => setUnlocked(true)}>
          {t("unlock")}
        </button>
      </EmptyState>
    );
  }

  const exportReport = (raw: boolean, kind: "debug" | "capture"): void => {
    const report = buildDebugExport({
      environment: { appVersion: p.appVersion, platform: `web/${handle.mode}`, userAgent: navigator.userAgent },
      snapshot: s,
      events: handle.session.events,
      packetLog: handle.logger.entries,
      includeRawFrames: raw,
    });
    download(debugExportFileName().replace("debug", kind), "application/json", JSON.stringify(report, null, 2));
  };

  const frames = Object.entries(s.capturedFrames);
  const cell = s.capturedFrames.CELL_INFO;
  const hint = cell ? cellLayoutHint(parseHex(cell.hex)) : null;
  const settings = s.settings;
  const log = handle.logger.entries.slice(-150).reverse();

  return (
    <div className="screen">
      <div className="lock-bar">
        <span>
          <Icon name="unlock" size={18} /> {t("maintenanceTitle")}
        </span>
        <button type="button" className="btn-text" onClick={() => setUnlocked(false)}>
          {t("lock")}
        </button>
      </div>

      {s.profile?.mode === "diagnostic" && (
        <Card title={t("protocolCapture")}>
          <p className="muted">{t("captureBody")}</p>
          {frames.length === 0 ? (
            <p className="muted">…</p>
          ) : (
            frames.map(([type, f]) => <Row key={type} label={type} value={`${f.count}`} />)
          )}
          {hint && (
            <Row
              label={t("layoutHint")}
              value={`${hint.likely} (JK04 ${hint.jk04PlausibleCells} / JK02 ${hint.jk02PlausibleCells})`}
            />
          )}
          <button type="button" className="btn-filled" disabled={frames.length === 0} onClick={() => exportReport(false, "capture")}>
            {t("exportCapture")}
          </button>
        </Card>
      )}

      <Card title={t("balancerSettings")}>
        {settings ? (
          <>
            <Row label={t("balancerSwitch")} value={settings.balancerEnabled ? t("enabled") : t("disabled")} />
            <Row label={t("cellCount")} value={`${settings.cellCount}S`} />
            <Row label={t("startVoltage")} value={`${fmt(settings.balanceStartVoltage)} V`} />
            <Row label={t("triggerDelta")} value={`${fmt(settings.balanceTriggerDeltaVoltage)} V`} />
            <Row label={t("maxBalanceCurrent")} value={`${fmt(settings.maxBalanceCurrent, 1)} A`} />
            <Row label={t("powerOffVoltage")} value={`${fmt(settings.powerOffVoltage)} V`} />
          </>
        ) : (
          <p className="muted">{s.profile?.mode === "diagnostic" ? t("settingsNotDecoded") : t("noDataBody")}</p>
        )}
        <p className="muted small">{t("writeDisabled")}</p>
        <button
          type="button"
          className="btn-outlined"
          disabled={busy || !settings || !["READY", "STREAMING"].includes(s.connection)}
          onClick={() => {
            setBusy(true);
            void handle.session
              .readSettings()
              .catch(() => undefined)
              .finally(() => setBusy(false));
          }}
        >
          {t("readSettings")}
        </button>
      </Card>

      <Card title={t("diagnostics")}>
        <Row label={t("frames")} value={`${s.framesReceived} · ${freshnessLabel(p.language, s.freshness)}`} />
        <Row label={t("parserErrors")} value={String(s.parserErrors.length)} />
        <div className="inline-toggle">
          <span>{t("rawLogger")}</span>
          <Toggle checked={p.prefs.loggerEnabled} onChange={(v) => p.setPrefs({ loggerEnabled: v })} label={t("rawLogger")} />
        </div>
        <div className="inline-toggle">
          <span>{t("includeRaw")}</span>
          <Toggle checked={includeRaw} onChange={setIncludeRaw} label={t("includeRaw")} />
        </div>
        <div className="button-row">
          <button type="button" className="btn-outlined" onClick={() => exportReport(includeRaw, "debug")}>
            {t("exportDebug")}
          </button>
          <button type="button" className="btn-text" disabled={handle.logger.entries.length === 0} onClick={() => handle.logger.clear()}>
            {t("clearLog")}
          </button>
        </div>
        {p.prefs.loggerEnabled && (
          <pre className="log">
            {log.length === 0
              ? "—"
              : log
                  .map((e) => `${e.timestamp.slice(11, 23)} ${e.direction}${e.frame ? ` ${e.frame}` : ""}${e.error ? ` ERROR=${e.error}` : ""}\n${e.hex}${e.decoded ? `\n${e.decoded}` : ""}`)
                  .join("\n\n")}
          </pre>
        )}
      </Card>
    </div>
  );
}
