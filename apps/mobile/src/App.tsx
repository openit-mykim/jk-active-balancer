import { createElement, useMemo } from "react";
import { computeCellGridLayout } from "@jk-active-balancer/ui-common";
import { computeCellStats, type CellState } from "@jk-active-balancer/device-model";

// react-native primitives are provided by the native runtime. They are declared
// here as opaque element types so this Phase 1 skeleton stays free of a
// react-native import (which is not installed until the native build phase).
const View = "View";
const Text = "Text";

// Demonstration data only - no hardware reading in Phase 1.
const DEMO_CELLS: readonly CellState[] = Array.from({ length: 16 }, (_unused, i) => ({
  index: i + 1,
  voltage: 3.3 + i * 0.005,
  active: true,
}));

export function App() {
  const stats = useMemo(() => computeCellStats(DEMO_CELLS), []);
  const grid = useMemo(() => computeCellGridLayout(DEMO_CELLS.length), []);

  return createElement(
    View,
    null,
    createElement(Text, null, "jk-active-balancer / IDLE"),
    createElement(Text, null, `avg ${stats.averageCellVoltage.toFixed(4)} V / delta ${stats.deltaCellVoltage.toFixed(4)} V`),
    createElement(Text, null, `grid: ${grid.columns} column(s), ${grid.placements.length} cells`),
  );
}
