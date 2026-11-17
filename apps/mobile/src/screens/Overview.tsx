import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { checkCellRange } from "@jk-active-balancer/device-model";
import { THEME } from "@jk-active-balancer/ui-common";
import { Button, Card, EmptyState, GLYPH, Metric, MetricGrid, fmt, s } from "../ui";
import { type ScreenProps, hasDevice, modeLabel } from "./context";

/** 개요 (jbd-bms-manager Overview). */
export function Overview(p: ScreenProps): ReactElement {
  const { snapshot: snap, t } = p;
  if (!hasDevice(snap)) {
    return (
      <EmptyState glyph={GLYPH.bluetooth} title={t("placeholderTitle")} body={t("placeholderBody")}>
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
    <View style={s.screen}>
      {snap.connection === "RECONNECT_WAIT" && (
        <View style={{ backgroundColor: "#3b2a12", borderColor: THEME.band.caution, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
          <Text style={[s.text, { fontWeight: "700" }]}>{t("reconnectBannerTitle")}</Text>
          <Text style={{ color: "#ffcc80", fontSize: 13 }}>
            {t("reconnectIn", { s: Math.max(0, Math.ceil(((snap.nextReconnectAt ?? p.now) - p.now) / 1000)), n: snap.reconnectAttempt })}
          </Text>
          <View style={s.btnRow}>
            <Button variant="text" label={t("cancelReconnect")} onPress={() => void p.handle.session.disconnect()} />
            <Button variant="tonal" label={t("reconnectNow")} onPress={() => void p.handle.session.reconnectNow()} />
          </View>
        </View>
      )}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text style={[s.text, { fontSize: 18, fontWeight: "600" }]}>{snap.deviceInfo?.vendorId ?? snap.device?.name ?? "-"}</Text>
          {mode && (
            <Text style={[s.chip, { backgroundColor: mode === "verified" ? THEME.band.normal : THEME.band.caution }]}>{modeLabel(t, mode)}</Text>
          )}
          {stale && <Text style={[s.chip, { backgroundColor: THEME.band.caution }]}>{t("stale")}</Text>}
        </View>
        <Text style={s.muted}>
          {snap.connection}
          {spec ? ` · ${spec.minCells}-${spec.maxCells}S · ${t("ratedCurrent", { a: spec.ratedBalanceCurrent })}` : ""}
        </Text>
        {mode === "preview" && <Text style={{ color: "#ffb74d", fontSize: 12 }}>{t("syntheticNote")}</Text>}
      </Card>

      {info ? (
        <>
          <Card dim={stale}>
            <Text style={s.muted}>{t("packVoltage")}</Text>
            <Text style={s.primaryMetric}>{fmt(info.totalVoltage, 2)} V</Text>
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
              <Metric
                label={t("balancing")}
                value={info.balancer === "idle" ? t("idle") : t("active")}
                band={info.balancer === "idle" ? undefined : "caution"}
              />
              <Metric
                label={t("balanceCurrent")}
                value={`${fmt(info.balancingCurrent, 2)} A`}
                sub={spec ? t("ratedCurrent", { a: spec.ratedBalanceCurrent }) : undefined}
              />
              <Metric label={t("cellCount")} value={`${snap.settings?.cellCount ?? info.activeCells}S`} />
            </MetricGrid>
            {spec && (
              <View style={{ height: 6, backgroundColor: THEME.surfaceVariant, borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
                <View
                  style={{
                    height: 6,
                    width: `${Math.min(100, (Math.abs(info.balancingCurrent) / spec.ratedBalanceCurrent) * 100)}%`,
                    backgroundColor: THEME.primary,
                  }}
                />
              </View>
            )}
            {!range.ok && <Text style={s.error}>{range.message}</Text>}
            {spec?.interfaces.ntc && <Text style={s.mutedSmall}>{t("ntcNote")}</Text>}
          </Card>
        </>
      ) : (
        mode === "diagnostic" && (
          <Card>
            <Text style={s.muted}>{t("captureOnlyBody")}</Text>
          </Card>
        )
      )}
    </View>
  );
}
