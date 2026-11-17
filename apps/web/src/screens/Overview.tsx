import type { ReactElement } from "react";
import { checkCellRange } from "@jk-active-balancer/device-model";
import { Icon } from "../icons";
import { Card, EmptyState, Metric, fmt } from "../ui";
import { type ScreenProps, hasDevice } from "./context";

/** 개요: a battery snapshot readable in a few seconds (jbd-bms-manager Overview). */
export function Overview(p: ScreenProps): ReactElement {
  const { snapshot: s, t } = p;
  if (!hasDevice(s)) {
    return (
      <EmptyState icon={<Icon name="bluetoothSearch" size={96} />} title={t("placeholderTitle")} body={t("placeholderBody")}>
        <button type="button" className="btn-filled" onClick={p.openDevices}>
          {t("selectDevice")}
        </button>
      </EmptyState>
    );
  }
  const info = s.cellInfo;
  const spec = s.profile?.profile?.spec;
  const stale = s.freshness === "stale" || s.freshness === "stalled";
  const age = s.cellInfoAt !== undefined ? Math.round((p.now - s.cellInfoAt) / 1000) : undefined;
  const range = info && spec ? checkCellRange(s.settings?.cellCount ?? info.activeCells, spec) : ({ ok: true } as const);

  return (
    <div className="screen">
      {s.connection === "RECONNECT_WAIT" && (
        <div className="banner">
          <div>
            <div className="banner-title">{t("reconnectBannerTitle")}</div>
            <div className="banner-body">
              {t("reconnectIn", {
                s: Math.max(0, Math.ceil(((s.nextReconnectAt ?? p.now) - p.now) / 1000)),
                n: s.reconnectAttempt,
              })}
              {s.lastError ? ` · ${s.lastError}` : ""}
            </div>
          </div>
          <div className="banner-actions">
            <button type="button" className="btn-text" onClick={() => void p.handle.session.disconnect()}>
              {t("cancelReconnect")}
            </button>
            <button type="button" className="btn-tonal" onClick={() => void p.handle.session.reconnectNow()}>
              {t("reconnectNow")}
            </button>
          </div>
        </div>
      )}

      <Card>
        <div className="status-line">
          <span className="status-model">{s.deviceInfo?.vendorId ?? s.device?.name ?? "-"}</span>
          <ModeChip mode={s.profile?.mode} t={t} />
          {stale && <span className="chip chip-caution">{t("stale")}{age !== undefined ? ` ${age}s` : ""}</span>}
        </div>
        <div className="status-sub">
          {s.connection}
          {spec ? ` · ${spec.minCells}-${spec.maxCells}S · ${t("ratedCurrent", { a: spec.ratedBalanceCurrent })}` : ""}
        </div>
        {s.profile?.mode === "preview" && <div className="status-sub warn-text">{t("syntheticNote")}</div>}
      </Card>

      {info ? (
        <>
          <Card className={stale ? "is-stale" : ""}>
            <span className="metric-label">{t("packVoltage")}</span>
            <div className="primary-metric">{fmt(info.totalVoltage, 2)} V</div>
            <div className="metric-grid">
              <Metric label={t("averageVoltage")} value={`${fmt(info.averageCellVoltage)} V`} />
              <Metric label={t("deltaVoltage")} value={`${(info.deltaCellVoltage * 1000).toFixed(1)} mV`} />
              <Metric label={`${t("maxVoltage")} #${info.maxCellIndex}`} value={`${fmt(info.maxCellVoltage)} V`} />
              <Metric label={`${t("minVoltage")} #${info.minCellIndex}`} value={`${fmt(info.minCellVoltage)} V`} />
            </div>
          </Card>
          <Card className={stale ? "is-stale" : ""}>
            <div className="metric-grid">
              <Metric
                label={t("balancer")}
                value={s.settings ? (s.settings.balancerEnabled ? t("enabled") : t("disabled")) : "-"}
              />
              <Metric
                label={t("balancing")}
                value={info.balancer === "idle" ? t("idle") : `${t("active")} (${info.balancer})`}
                band={info.balancer === "idle" ? undefined : "caution"}
              />
              <Metric
                label={t("balanceCurrent")}
                value={`${fmt(info.balancingCurrent, 2)} A`}
                sub={spec ? t("ratedCurrent", { a: spec.ratedBalanceCurrent }) : undefined}
              />
              <Metric label={t("cellCount")} value={`${s.settings?.cellCount ?? info.activeCells}S`} />
            </div>
            {spec && (
              <div className="bar" title={t("balanceCurrent")}>
                <div style={{ width: `${Math.min(100, (Math.abs(info.balancingCurrent) / spec.ratedBalanceCurrent) * 100)}%` }} />
              </div>
            )}
            {!range.ok && <p className="error-text">{range.message}</p>}
            {spec?.interfaces.ntc && <p className="muted small">{t("ntcNote")}</p>}
          </Card>
        </>
      ) : (
        s.profile?.mode === "diagnostic" && (
          <Card>
            <p className="muted">{t("captureOnlyBody")}</p>
          </Card>
        )
      )}
    </div>
  );
}

export function ModeChip({ mode, t }: { mode: string | undefined; t: ScreenProps["t"] }): ReactElement | null {
  if (mode === undefined) return null;
  if (mode === "verified") return <span className="chip chip-normal">{t("modeVerified")}</span>;
  if (mode === "preview") return <span className="chip chip-caution">{t("modePreview")}</span>;
  return <span className="chip chip-caution">{t("modeDiagnostic")}</span>;
}
