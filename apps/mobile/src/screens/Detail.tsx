import { type ReactElement, useState } from "react";
import { Share, Text, View } from "react-native";
import { historyToCsv } from "@jk-active-balancer/device-model";
import { BarChart, Button, Card, EmptyState, GLYPH, Row, Segmented, s } from "../ui";
import { type ScreenProps, modeLabel } from "./context";

type Series = "pack" | "delta" | "current";

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/** 상세 (jbd-bms-manager Detail). */
export function Detail(p: ScreenProps): ReactElement {
  const { snapshot: snap, t } = p;
  const [series, setSeries] = useState<Series>("delta");
  const items = p.handle.history.items;
  const info = snap.deviceInfo;
  const profile = snap.profile?.profile;
  const spec = profile?.spec;
  const values = items.map((h) => (series === "pack" ? h.totalVoltage : series === "delta" ? h.deltaCellVoltage * 1000 : h.balancingCurrent));
  const last = values[values.length - 1];

  return (
    <View style={s.screen}>
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
          <Text style={s.muted}>{t("historyEmpty")}</Text>
        ) : (
          <>
            <Text style={s.mutedSmall}>
              {last?.toFixed(series === "delta" ? 1 : 3)} {series === "pack" ? "V" : series === "delta" ? "mV" : "A"} · {items.length}
            </Text>
            <BarChart values={values} />
          </>
        )}
        <Text style={s.mutedSmall}>{t("historyNote")}</Text>
        <Button
          label={`${t("exportCsv")} (${items.length})`}
          disabled={items.length === 0}
          onPress={() => void Share.share({ title: "jk-active-balancer history", message: historyToCsv(items) })}
        />
      </Card>

      {!info ? (
        <EmptyState glyph={GLYPH.info} title={t("noDataTitle")} body={t("noDataBody")} />
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
            <Row label={t("profile")} value={modeLabel(t, snap.profile?.mode)} />
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
            {profile && <Text style={s.mutedSmall}>{t("evidence")}: {profile.protocolEvidence}</Text>}
          </Card>
          <Card title={t("groupConnection")}>
            <Row label={t("state")} value={snap.connection} />
            <Row label={t("frames")} value={String(snap.framesReceived)} />
            <Row label={t("parserErrors")} value={String(snap.parserErrors.length)} />
            <Row label="ID" value={snap.device?.id ?? "-"} />
          </Card>
        </>
      )}
    </View>
  );
}
