import { type ReactElement, useState } from "react";
import { historyToCsv } from "@jk-active-balancer/device-model";
import { Icon } from "../icons";
import { Sparkline } from "../Sparkline";
import { Card, EmptyState, Row, Segmented, download } from "../ui";
import { ModeChip } from "./Overview";
import type { ScreenProps } from "./context";

type Series = "pack" | "delta" | "current";

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

/** 상세: device and product information plus local history (jbd-bms-manager Detail). */
export function Detail(p: ScreenProps): ReactElement {
  const { snapshot: s, t } = p;
  const [series, setSeries] = useState<Series>("delta");
  const items = p.handle.history.items;
  const info = s.deviceInfo;
  const profile = s.profile?.profile;
  const spec = profile?.spec;

  const points = items.map((h) => ({
    x: h.timestamp,
    y: series === "pack" ? h.totalVoltage : series === "delta" ? h.deltaCellVoltage * 1000 : h.balancingCurrent,
  }));

  return (
    <div className="screen">
      <Card title={t("historyTitle")}>
        <Segmented
          value={series}
          onChange={setSeries}
          options={[
            { value: "pack", label: t("packVoltage") },
            { value: "delta", label: t("deltaVoltage") },
            { value: "current", label: t("balanceCurrent") },
          ]}
        />
        {items.length < 2 ? (
          <p className="muted">{t("historyEmpty")}</p>
        ) : (
          <Sparkline points={points} label={series === "pack" ? "V" : series === "delta" ? "mV" : "A"} />
        )}
        <p className="muted small">{t("historyNote")}</p>
        <button
          type="button"
          className="btn-outlined"
          disabled={items.length === 0}
          onClick={() =>
            download(
              `jk-active-balancer-history-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.csv`,
              "text/csv",
              historyToCsv(items),
            )
          }
        >
          {t("exportCsv")} ({items.length})
        </button>
      </Card>

      {!info ? (
        <EmptyState icon={<Icon name="info" size={80} />} title={t("noDataTitle")} body={t("noDataBody")} />
      ) : (
        <>
          <Card title={t("groupDevice")}>
            <Row label={t("model")} value={info.vendorId} />
            <Row label={t("hwSw")} value={`${info.hardwareVersion} / ${info.softwareVersion}`} />
            <Row label={t("name")} value={info.deviceName || "-"} />
            <Row label={t("uptime")} value={formatDuration(info.uptimeSeconds)} />
            <Row label={t("powerOnCount")} value={String(info.powerOnCount)} />
          </Card>
          <Card title={t("groupProduct")}>
            <Row label={t("profile")} value={<ModeChip mode={s.profile?.mode} t={t} />} />
            <Row label={t("protocol")} value={profile?.protocol ?? "UNKNOWN"} />
            {spec && (
              <>
                <Row label={t("cellRange")} value={`${spec.minCells}S - ${spec.maxCells}S`} />
                <Row label={t("balanceCurrent")} value={t("ratedCurrent", { a: spec.ratedBalanceCurrent })} />
                <Row
                  label={t("interfaces")}
                  value={(["bluetooth", "rs485", "can", "ntc"] as const)
                    .filter((k) => spec.interfaces[k])
                    .map((k) => (k === "bluetooth" ? "BLE" : k.toUpperCase()))
                    .join(" · ")}
                />
              </>
            )}
            {profile && <p className="muted small">{t("evidence")}: {profile.protocolEvidence}</p>}
            {s.profile && <p className="muted small">{s.profile.reason}</p>}
          </Card>
          <Card title={t("groupConnection")}>
            <Row label={t("state")} value={s.connection} />
            <Row label={t("frames")} value={String(s.framesReceived)} />
            <Row label={t("parserErrors")} value={String(s.parserErrors.length)} />
            <Row label="ID" value={s.device?.id ?? "-"} />
          </Card>
        </>
      )}
    </div>
  );
}
