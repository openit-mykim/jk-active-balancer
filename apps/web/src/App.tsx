import { type ReactElement, useState } from "react";
import { WebBluetoothAdapter } from "@jk-active-balancer/ble-web";
import { JK_B2A16S_PROFILE, SERVICE_UUID, CHARACTERISTIC_UUID } from "@jk-active-balancer/jk-protocol";
import { computeCellGridLayout } from "@jk-active-balancer/ui-common";
import { type CellState, computeCellStats } from "@jk-active-balancer/device-model";

// Demonstration data only. No hardware is attached in Phase 1 CI; these values
// are synthetic and are labelled as such in the UI.
const DEMO_CELLS: readonly CellState[] = Array.from({ length: 16 }, (_unused, i) => ({
  index: i + 1,
  voltage: 3.3 + i * 0.005,
  active: true,
}));

export function App(): ReactElement {
  const [supported] = useState(() => WebBluetoothAdapter.isSupported());
  const stats = computeCellStats(DEMO_CELLS);
  const grid = computeCellGridLayout(DEMO_CELLS.length);

  return (
    <main className="app">
      <header>
        <h1>jk-active-balancer</h1>
        <p className="subtitle">
          {JK_B2A16S_PROFILE.id} / {JK_B2A16S_PROFILE.protocol} / max {JK_B2A16S_PROFILE.maxCells}S - Web Bluetooth PWA
        </p>
      </header>

      <section className="panel">
        <h2>Connection</h2>
        <p>
          Web Bluetooth: <strong>{supported ? "supported" : "not available in this browser"}</strong>
        </p>
        <p className="muted">iOS Safari/Chrome do not support Web Bluetooth; use the native app on iPhone.</p>
      </section>

      <section className="panel">
        <h2>Device info</h2>
        <dl>
          <dt>Service</dt>
          <dd>{SERVICE_UUID}</dd>
          <dt>Characteristic</dt>
          <dd>{CHARACTERISTIC_UUID}</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>Cells (demo data, not a device reading)</h2>
        <p className="muted">
          avg {stats.averageCellVoltage.toFixed(4)} V / delta {stats.deltaCellVoltage.toFixed(4)} V
        </p>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(grid.columns, 1)}, 1fr)` }}>
          {grid.placements.map((placement) => {
            const cell = DEMO_CELLS[placement.index - 1];
            return (
              <span key={placement.index} className="cell">
                <span className="cell-index">Cell {String(placement.index).padStart(2, "0")}</span>
                <span className="cell-value">{cell ? cell.voltage.toFixed(3) : "-"} V</span>
              </span>
            );
          })}
        </div>
      </section>
    </main>
  );
}
