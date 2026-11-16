import { type ReactElement, useState } from "react";
import { resolveActiveCellCount } from "@jk-active-balancer/device-model";
import { cellBand, classifyCellVoltage, computeCellGridLayout } from "@jk-active-balancer/ui-common";
import { Icon } from "../icons";
import { Sparkline } from "../Sparkline";
import { Card, EmptyState, Metric, Row, Toggle, fmt } from "../ui";
import type { ScreenProps } from "./context";

/** 밸런스: every cell, min / max / average / delta, band colours (read-oriented). */
export function Balance(p: ScreenProps): ReactElement {
  const { snapshot: s, t } = p;
  const [selected, setSelected] = useState<number | null>(null);
  const [showResistance, setShowResistance] = useState(false);
  const info = s.cellInfo;
  if (!info) {
    return (
      <EmptyState
        icon={<Icon name="balance" size={96} />}
        title={t("tab_balance")}
        body={s.profile?.mode === "diagnostic" ? t("captureOnlyBody") : t("emptyCells")}
      />
    );
  }
  const spec = s.profile?.profile?.spec;
  const activeCells = resolveActiveCellCount({
    settingsCellCount: s.settings?.cellCount,
    reportingCells: info.activeCells,
    profileMaxCells: s.profile?.profile?.maxCells,
  });
  const grid = computeCellGridLayout(activeCells);
  const stale = s.freshness === "stale" || s.freshness === "stalled";
  const counts = { normal: 0, caution: 0, danger: 0 };
  const bands = grid.placements.map((pl) => {
    const v = info.cells[pl.index - 1]?.voltage ?? 0;
    const band = cellBand(classifyCellVoltage(v, info.averageCellVoltage, p.prefs.thresholds));
    counts[band] += 1;
    return band;
  });

  return (
    <div className={`screen ${stale ? "is-stale" : ""}`}>
      <Card>
        <div className="metric-grid four">
          <Metric label={t("minVoltage")} value={`${fmt(info.minCellVoltage)} V`} sub={`#${info.minCellIndex}`} />
          <Metric label={t("maxVoltage")} value={`${fmt(info.maxCellVoltage)} V`} sub={`#${info.maxCellIndex}`} />
          <Metric label={t("averageVoltage")} value={`${fmt(info.averageCellVoltage)} V`} />
          <Metric
            label={t("deltaVoltage")}
            value={`${(info.deltaCellVoltage * 1000).toFixed(1)} mV`}
            band={counts.danger > 0 ? "danger" : counts.caution > 0 ? "caution" : "normal"}
          />
        </div>
        <div className="legend">
          <span className="dot band-bg-normal" /> {t("bandNormal")} {counts.normal}
          <span className="dot band-bg-caution" /> {t("bandCaution")} {counts.caution}
          <span className="dot band-bg-danger" /> {t("bandDanger")} {counts.danger}
          {info.balancer !== "idle" && <span className="chip chip-caution">{t("balancing")}</span>}
        </div>
      </Card>

      <Card title={`${t("cellVoltages")} · ${spec ? t("ofRange", { n: activeCells, min: spec.minCells, max: spec.maxCells }) : `${activeCells}S`}`}>
        {s.profile?.profile?.capabilities.cellWireResistance && (
          <div className="inline-toggle">
            <span className="muted small">{t("showWireResistance")}</span>
            <Toggle checked={showResistance} onChange={setShowResistance} label={t("showWireResistance")} />
          </div>
        )}
        <div className="cell-grid" style={{ gridTemplateColumns: `repeat(${Math.max(grid.columns, 1)}, minmax(0, 1fr))` }}>
          {grid.placements.map((pl, i) => {
            const cell = info.cells[pl.index - 1];
            const v = cell?.voltage ?? 0;
            const flag = pl.index === info.maxCellIndex ? "▲" : pl.index === info.minCellIndex ? "▼" : "";
            return (
              <button
                type="button"
                key={pl.index}
                className={`cell band-${bands[i]} ${selected === pl.index ? "selected" : ""}`}
                style={{ gridColumn: pl.column + 1, gridRow: pl.row + 1 }}
                onClick={() => setSelected(selected === pl.index ? null : pl.index)}
              >
                <span className="cell-index">
                  {String(pl.index).padStart(2, "0")}
                  {flag && <span className="cell-flag">{flag}</span>}
                </span>
                <span className="cell-value">
                  {v.toFixed(3)}
                  {showResistance && cell ? <small> {(cell.resistance * 1000).toFixed(0)}mΩ</small> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {selected !== null && (
        <Card title={t("cellN", { n: String(selected).padStart(2, "0") })}>
          <Row label={t("cellVoltages")} value={`${(info.cells[selected - 1]?.voltage ?? 0).toFixed(4)} V`} />
          <Row
            label={t("deltaVoltage")}
            value={`${(((info.cells[selected - 1]?.voltage ?? 0) - info.averageCellVoltage) * 1000).toFixed(1)} mV`}
          />
          <Row label={t("wireResistance")} value={`${((info.cells[selected - 1]?.resistance ?? 0) * 1000).toFixed(1)} mΩ`} />
          <Sparkline
            label="V"
            points={p.handle.history
              .series(info.cells.slice(0, selected).filter((c) => c.voltage > 0).length)
              .map((pt) => ({ x: pt.timestamp, y: pt.voltage }))}
          />
        </Card>
      )}
    </div>
  );
}
