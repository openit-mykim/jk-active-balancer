import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { resolveActiveCellCount } from "@jk-active-balancer/device-model";
import { SPACE, SIZE, THEME, cellBand, classifyCellVoltage, computeCellGridLayout } from "@jk-active-balancer/ui-common";
import { BarChart, Card, EmptyState, Illustration, Metric, MetricGrid, Row, ToggleRow, Txt, fmt, st } from "../ui";
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
        illustration={<Illustration name="balance" />}
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
  const band = (index: number) => cellBand(classifyCellVoltage(info.cells[index - 1]?.voltage ?? 0, info.averageCellVoltage, p.prefs.thresholds));
  const counts = { normal: 0, caution: 0, danger: 0 };
  grid.placements.forEach((pl) => (counts[band(pl.index)] += 1));
  const columns = Array.from({ length: grid.columns }, (_v, c) => grid.placements.filter((pl) => pl.column === c));
  const compact = grid.columns === 3;
  const legend: Array<["normal" | "caution" | "danger", string]> = [
    ["normal", t("bandNormal")],
    ["caution", t("bandCaution")],
    ["danger", t("bandDanger")],
  ];

  return (
    <View style={st.screen}>
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
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.md, alignItems: "center" }}>
          {legend.map(([b, label]) => (
            <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: SPACE.xs }}>
              <View style={{ width: SPACE.md, height: SPACE.md, borderRadius: SPACE.sm, backgroundColor: THEME.band[b] }} />
              <Txt role="caption" color="onSurfaceMuted">
                {label} {counts[b]}
              </Txt>
            </View>
          ))}
          {info.balancer !== "idle" && (
            <Txt role="caption" color="onWarningContainer">
              {t("balancing")}
            </Txt>
          )}
        </View>
      </Card>

      <Card dim={stale} title={`${t("cellVoltages")} · ${spec ? t("ofRange", { n: activeCells, min: spec.minCells, max: spec.maxCells }) : `${activeCells}S`}`}>
        {snap.profile?.profile?.capabilities.cellWireResistance && (
          <ToggleRow label={t("showWireResistance")} value={showResistance} onChange={setShowResistance} />
        )}
        <View style={{ flexDirection: "row", gap: SPACE.sm }}>
          {columns.map((column, c) => (
            <View key={c} style={{ flex: 1, gap: SPACE.xs }}>
              {column.map((pl) => {
                const cell = info.cells[pl.index - 1];
                const v = cell?.voltage ?? 0;
                const flag = pl.index === info.maxCellIndex ? " ▲" : pl.index === info.minCellIndex ? " ▼" : "";
                const b = band(pl.index);
                return (
                  <Pressable
                    key={pl.index}
                    accessibilityRole="button"
                    accessibilityLabel={`${t("cellN", { n: pl.index })} ${v.toFixed(3)} V, ${t(b === "normal" ? "bandNormal" : b === "caution" ? "bandCaution" : "bandDanger")}`}
                    onPress={() => setSelected(selected === pl.index ? null : pl.index)}
                    style={{
                      minHeight: SIZE.touchMin,
                      backgroundColor: THEME.surfaceVariant,
                      borderLeftWidth: SPACE.xs,
                      borderLeftColor: THEME.band[b],
                      borderRadius: SIZE.radius,
                      paddingVertical: SPACE.xs,
                      paddingHorizontal: SPACE.sm,
                      flexDirection: compact ? "column" : "row",
                      justifyContent: compact ? "center" : "space-between",
                      alignItems: compact ? "flex-start" : "center",
                      borderWidth: selected === pl.index ? 1 : 0,
                      borderColor: THEME.primary,
                    }}
                  >
                    <Txt role="caption" color="onSurfaceMuted" fixed>
                      {String(pl.index).padStart(2, "0")}
                      {flag}
                    </Txt>
                    <Txt role={compact ? "label" : "body"} tabular fixed>
                      {v.toFixed(3)}
                    </Txt>
                    {showResistance && cell ? (
                      <Txt role="micro" color="onSurfaceMuted" fixed>
                        {(cell.resistance * 1000).toFixed(0)}mΩ
                      </Txt>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </Card>

      {selected !== null && (
        <Card title={t("cellN", { n: String(selected).padStart(2, "0") })}>
          <Row label={t("cellVoltages")} value={`${(info.cells[selected - 1]?.voltage ?? 0).toFixed(4)} V`} />
          <Row label={t("deltaVoltage")} value={`${(((info.cells[selected - 1]?.voltage ?? 0) - info.averageCellVoltage) * 1000).toFixed(1)} mV`} />
          <Row label={t("wireResistance")} value={`${((info.cells[selected - 1]?.resistance ?? 0) * 1000).toFixed(1)} mΩ`} />
          {p.handle.history.items.length > 1 && (
            <BarChart
              label={t("historyTitle")}
              values={p.handle.history.series(info.cells.slice(0, selected).filter((c) => c.voltage > 0).length).map((pt) => pt.voltage)}
            />
          )}
        </Card>
      )}
    </View>
  );
}
