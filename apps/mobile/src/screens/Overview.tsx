import type { ReactElement } from "react";
import { View } from "react-native";
import { checkCellRange } from "@jk-active-balancer/device-model";
import { SIZE, SPACE, THEME, cellRangeMessage, stateLabel } from "@jk-active-balancer/ui-common";
import { Badge, Button, Card, EmptyState, Illustration, Metric, MetricGrid, Txt, fmt, st } from "../ui";
import { type ScreenProps, hasDevice, modeLabel } from "./context";

/** 개요 (jbd-bms-manager Overview). */
export function Overview(p: ScreenProps): ReactElement {
  const { snapshot: snap, t, language } = p;
  if (!hasDevice(snap)) {
    return (
      <EmptyState illustration={<Illustration name="bluetooth" />} title={t("placeholderTitle")} body={t("placeholderBody")}>
        <Button variant="filled" label={t("selectDevice")} onPress={p.openDevices} />
      </EmptyState>
    );
  }
  const info = snap.cellInfo;
  const spec = snap.profile?.profile?.spec;
  const stale = snap.freshness === "stale" || snap.freshness === "stalled";
  const range = info && spec ? checkCellRange(snap.settings?.cellCount ?? info.activeCells, spec) : ({ ok: true } as const);
  const mode = snap.profile?.mode;

  return (
    <View style={st.screen}>
      {snap.connection === "RECONNECT_WAIT" && (
        <View style={st.banner} accessibilityRole="alert">
          <Txt bold>{t("reconnectBannerTitle")}</Txt>
          <Txt role="label" color="onWarningContainer">
            {t("reconnectIn", { s: Math.max(0, Math.ceil(((snap.nextReconnectAt ?? p.now) - p.now) / 1000)), n: snap.reconnectAttempt })}
          </Txt>
          <View style={st.btnRow}>
            <Button variant="text" label={t("cancelReconnect")} onPress={() => void p.handle.session.disconnect()} />
            <Button variant="tonal" label={t("reconnectNow")} onPress={() => void p.handle.session.reconnectNow()} />
          </View>
        </View>
      )}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACE.sm }}>
          <Txt role="heading" bold>
            {snap.deviceInfo?.vendorId ?? snap.device?.name ?? "-"}
          </Txt>
          {mode && <Badge band={mode === "verified" ? "normal" : "caution"}>{modeLabel(t, mode)}</Badge>}
          {stale && <Badge band="caution">{t("stale")}</Badge>}
        </View>
        <Txt role="caption" color="onSurfaceMuted">
          {stateLabel(language, snap.connection)}
          {spec ? ` · ${spec.minCells}-${spec.maxCells}S · ${t("ratedCurrent", { a: spec.ratedBalanceCurrent })}` : ""}
        </Txt>
        {mode === "preview" && (
          <Txt role="caption" color="onWarningContainer">
            {t("syntheticNote")}
          </Txt>
        )}
      </Card>

      {info ? (
        <>
          <Card dim={stale}>
            <Txt role="caption" color="onSurfaceMuted">
              {t("packVoltage")}
            </Txt>
            <Txt role="display" tabular>
              {fmt(info.totalVoltage, 2)} V
            </Txt>
            <MetricGrid>
              <Metric label={t("averageVoltage")} value={`${fmt(info.averageCellVoltage)} V`} />
              <Metric label={t("deltaVoltage")} value={`${(info.deltaCellVoltage * 1000).toFixed(1)} mV`} />
              <Metric label={`${t("maxVoltage")} #${info.maxCellIndex}`} value={`${fmt(info.maxCellVoltage)} V`} />
              <Metric label={`${t("minVoltage")} #${info.minCellIndex}`} value={`${fmt(info.minCellVoltage)} V`} />
            </MetricGrid>
          </Card>
          <Card dim={stale}>
            <MetricGrid>
              <Metric label={t("balancer")} value={snap.settings ? (snap.settings.balancerEnabled ? t("enabled") : t("disabled")) : "-"} />
              <Metric label={t("balancing")} value={info.balancer === "idle" ? t("idle") : t("active")} band={info.balancer === "idle" ? undefined : "caution"} />
              <Metric
                label={t("balanceCurrent")}
                value={`${fmt(info.balancingCurrent, 2)} A`}
                sub={spec ? t("ratedCurrent", { a: spec.ratedBalanceCurrent }) : undefined}
              />
              <Metric label={t("cellCount")} value={`${snap.settings?.cellCount ?? info.activeCells}S`} />
            </MetricGrid>
            {spec && (
              <View style={{ height: SPACE.sm, backgroundColor: THEME.surfaceVariant, borderRadius: SPACE.xs, overflow: "hidden" }} importantForAccessibility="no">
                <View
                  style={{
                    height: SPACE.sm,
                    width: `${Math.min(100, (Math.abs(info.balancingCurrent) / spec.ratedBalanceCurrent) * 100)}%`,
                    backgroundColor: THEME.primary,
                  }}
                />
              </View>
            )}
            {!range.ok && (
              <Txt role="label" color="error">
                {cellRangeMessage(language, range)}
              </Txt>
            )}
            {spec?.interfaces.ntc && (
              <Txt role="caption" color="onSurfaceMuted">
                {t("ntcNote")}
              </Txt>
            )}
          </Card>
        </>
      ) : (
        mode === "diagnostic" && (
          <Card>
            <Txt role="label" color="onSurfaceMuted">
              {t("captureOnlyBody")}
            </Txt>
          </Card>
        )
      )}
      <View style={{ height: SIZE.badge }} />
    </View>
  );
}
