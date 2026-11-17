import { type ReactElement, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { resolveActiveCellCount } from "@jk-active-balancer/device-model";
import { THEME, cellBand, classifyCellVoltage, computeCellGridLayout } from "@jk-active-balancer/ui-common";
import { BarChart, Card, EmptyState, GLYPH, Metric, MetricGrid, Row, Toggle, fmt, s } from "../ui";
import type { ScreenProps } from "./context";

/** 밸런스 (jbd-bms-manager Balance). */
export function Balance(p: ScreenProps): ReactElement {
  const { snapshot: snap, t } = p;
  const [selected, setSelected] = useState<number | null>(null);
  const [showResistance, setShowResistance] = useState(false);
  const info = snap.cellInfo;
  if (!info) {
    return (
      <EmptyState
        glyph={GLYPH.balance}
        title={t("tab_balance")}
        body={snap.profile?.mode === "diagnostic" ? t("captureOnlyBody") : t("emptyCells")}
      />
    );
  }
  const spec = snap.profile?.profile?.spec;
  const activeCells = resolveActiveCellCount({
    settingsCellCount: snap.settings?.cellCount,
    reportingCells: info.activeCells,
    profileMaxCells: snap.profile?.profile?.maxCells,
  });
  const grid = computeCellGridLayout(activeCells);
  const stale = snap.freshness === "stale" || snap.freshness === "stalled";
  const counts = { normal: 0, caution: 0, danger: 0 };
  const band = (index: number) => {
    const b = cellBand(classifyCellVoltage(info.cells[index - 1]?.voltage ?? 0, info.averageCellVoltage, p.prefs.thresholds));
    return b;
  };
  grid.placements.forEach((pl) => (counts[band(pl.index)] += 1));
  const columns = Array.from({ length: grid.columns }, (_v, c) => grid.placements.filter((pl) => pl.column === c));
  const compact = grid.columns === 3;

  return (
    <View style={s.screen}>
      <Card dim={stale}>
        <MetricGrid>
          <Metric label={t("minVoltage")} value={`${fmt(info.minCellVoltage)} V`} sub={`#${info.minCellIndex}`} />
          <Metric label={t("maxVoltage")} value={`${fmt(info.maxCellVoltage)} V`} sub={`#${info.maxCellIndex}`} />
          <Metric label={t("averageVoltage")} value={`${fmt(info.averageCellVoltage)} V`} />
          <Metric
            label={t("deltaVoltage")}
            value={`${(info.deltaCellVoltage * 1000).toFixed(1)} mV`}
            band={counts.danger > 0 ? "danger" : counts.caution > 0 ? "caution" : "normal"}
          />
        </MetricGrid>
        <Text style={s.muted}>
          <Text style={{ color: THEME.band.normal }}>● </Text>
          {t("bandNormal")} {counts.normal}   <Text style={{ color: THEME.band.caution }}>● </Text>
          {t("bandCaution")} {counts.caution}   <Text style={{ color: THEME.band.danger }}>● </Text>
          {t("bandDanger")} {counts.danger}
          {info.balancer !== "idle" ? `   · ${t("balancing")}` : ""}
        </Text>
      </Card>

      <Card
        dim={stale}
        title={`${t("cellVoltages")} · ${spec ? t("ofRange", { n: activeCells, min: spec.minCells, max: spec.maxCells }) : `${activeCells}S`}`}
      >
        {snap.profile?.profile?.capabilities.cellWireResistance && (
          <View style={s.inlineToggle}>
            <Text style={s.muted}>{t("showWireResistance")}</Text>
            <Toggle value={showResistance} onChange={setShowResistance} />
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {columns.map((column, c) => (
            <View key={c} style={{ flex: 1, gap: 5 }}>
              {column.map((pl) => {
                const cell = info.cells[pl.index - 1];
                const flag = pl.index === info.maxCellIndex ? " ▲" : pl.index === info.minCellIndex ? " ▼" : "";
                return (
                  <Pressable
                    key={pl.index}
                    onPress={() => setSelected(selected === pl.index ? null : pl.index)}
                    style={{
                      backgroundColor: THEME.surfaceVariant,
                      borderLeftWidth: 4,
                      borderLeftColor: THEME.band[band(pl.index)],
                      borderRadius: 6,
                      paddingVertical: 6,
                      paddingHorizontal: 7,
                      flexDirection: compact ? "column" : "row",
                      justifyContent: "space-between",
                      borderWidth: selected === pl.index ? 1 : 0,
                      borderColor: THEME.primary,
                    }}
                  >
                    <Text style={[s.muted, compact && { fontSize: 11 }]}>
                      {String(pl.index).padStart(2, "0")}
                      <Text style={{ color: THEME.primary }}>{flag}</Text>
                    </Text>
                    <Text style={[s.text, { fontVariant: ["tabular-nums"] }, compact && { fontSize: 13 }]}>
                      {(cell?.voltage ?? 0).toFixed(3)}
                    </Text>
                    {showResistance && cell ? (
                      <Text style={s.mutedSmall}>{(cell.resistance * 1000).toFixed(0)}mΩ</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </Card>

      {selected !== null && (
        <Card title={`Cell ${String(selected).padStart(2, "0")}`}>
          <Row label={t("cellVoltages")} value={`${(info.cells[selected - 1]?.voltage ?? 0).toFixed(4)} V`} />
          <Row label={t("deltaVoltage")} value={`${(((info.cells[selected - 1]?.voltage ?? 0) - info.averageCellVoltage) * 1000).toFixed(1)} mV`} />
          <Row label={t("wireResistance")} value={`${((info.cells[selected - 1]?.resistance ?? 0) * 1000).toFixed(1)} mΩ`} />
          {p.handle.history.items.length > 1 && (
            <BarChart
              values={p.handle.history
                .series(info.cells.slice(0, selected).filter((c) => c.voltage > 0).length)
                .map((pt) => pt.voltage)}
            />
          )}
        </Card>
      )}
    </View>
  );
}
