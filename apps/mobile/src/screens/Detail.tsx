import { type ReactElement, useState } from "react";
import { Share, View } from "react-native";
import { historyToCsv } from "@jk-active-balancer/device-model";
import { formatDuration, freshnessLabel, stateLabel } from "@jk-active-balancer/ui-common";
import { BarChart, Button, Card, EmptyState, Illustration, Row, Segmented, Txt, st } from "../ui";
import { type ScreenProps, modeLabel } from "./context";

type Series = "pack" | "delta" | "current";

/** 상세 (jbd-bms-manager Detail). */
export function Detail(p: ScreenProps): ReactElement {
  const { snapshot: snap, t, language } = p;
  const [series, setSeries] = useState<Series>("delta");
  const items = p.handle.history.items;
  const info = snap.deviceInfo;
  const profile = snap.profile?.profile;
  const spec = profile?.spec;
  const values = items.map((h) => (series === "pack" ? h.totalVoltage : series === "delta" ? h.deltaCellVoltage * 1000 : h.balancingCurrent));
  const last = values[values.length - 1];
  const unit = series === "pack" ? "V" : series === "delta" ? "mV" : "A";

  return (
    <View style={st.screen}>
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
          <Txt role="label" color="onSurfaceMuted">
            {t("historyEmpty")}
          </Txt>
        ) : (
          <>
            <Txt role="caption" color="onSurfaceMuted" tabular>
              {last?.toFixed(series === "delta" ? 1 : 3)} {unit} · {items.length}
            </Txt>
            <BarChart label={`${t("historyTitle")} ${unit}`} values={values} />
          </>
        )}
        <Txt role="caption" color="onSurfaceMuted">
          {t("historyNote")}
        </Txt>
        <Button
          label={`${t("exportCsv")} (${items.length})`}
          disabled={items.length === 0}
          onPress={() => void Share.share({ title: "jk-active-balancer history", message: historyToCsv(items) })}
        />
      </Card>

      {!info ? (
        <EmptyState illustration={<Illustration name="info" />} title={t("noDataTitle")} body={t("noDataBody")} />
      ) : (
        <>
          <Card title={t("groupDevice")}>
            <Row label={t("model")} value={info.vendorId} />
            <Row label={t("hwSw")} value={`${info.hardwareVersion} / ${info.softwareVersion}`} />
            <Row label={t("name")} value={info.deviceName || "-"} />
            <Row label={t("uptime")} value={formatDuration(language, info.uptimeSeconds)} />
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
            {profile && (
              <Txt role="caption" color="onSurfaceMuted">
                {t("evidence")}: {profile.protocolEvidence}
              </Txt>
            )}
          </Card>
          <Card title={t("groupConnection")}>
            <Row label={t("state")} value={stateLabel(language, snap.connection)} />
            <Row label={t("frames")} value={`${snap.framesReceived} · ${freshnessLabel(language, snap.freshness)}`} />
            <Row label={t("parserErrors")} value={String(snap.parserErrors.length)} />
            <Row label={t("deviceId")} value={snap.device?.id ?? "-"} />
          </Card>
        </>
      )}
    </View>
  );
}
