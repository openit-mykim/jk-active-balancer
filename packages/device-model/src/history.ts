/** One recorded sample for the history chart / CSV export (design section 35 Should). */
export interface HistorySample {
  readonly timestamp: number;
  readonly totalVoltage: number;
  readonly deltaCellVoltage: number;
  readonly balancingCurrent: number;
  /** Voltages of the active cells, cell 1 first. */
  readonly cellVoltages: readonly number[];
}

/** Bounded in-memory history (oldest samples are dropped first). */
export class CellHistory {
  private readonly samples: HistorySample[] = [];

  constructor(
    readonly capacity = 3600,
    /** Minimum spacing between stored samples, in ms. */
    readonly minIntervalMs = 1000,
  ) {}

  get items(): readonly HistorySample[] {
    return this.samples;
  }

  /** Record a sample; returns false when it was throttled. */
  add(sample: HistorySample): boolean {
    const last = this.samples[this.samples.length - 1];
    if (last !== undefined && sample.timestamp - last.timestamp < this.minIntervalMs) {
      return false;
    }
    this.samples.push(sample);
    if (this.samples.length > this.capacity) {
      this.samples.splice(0, this.samples.length - this.capacity);
    }
    return true;
  }

  clear(): void {
    this.samples.length = 0;
  }

  /** Voltages of one cell over time (1-based index). */
  series(cellIndex: number): Array<{ timestamp: number; voltage: number }> {
    return this.samples
      .filter((s) => s.cellVoltages.length >= cellIndex)
      .map((s) => ({ timestamp: s.timestamp, voltage: s.cellVoltages[cellIndex - 1] }));
  }
}

/** Render samples as CSV (ISO timestamp, pack, delta, current, cell_01..cell_NN). */
export function historyToCsv(samples: readonly HistorySample[]): string {
  const cellCount = samples.reduce((max, s) => Math.max(max, s.cellVoltages.length), 0);
  const header = ["timestamp", "total_voltage_v", "delta_cell_voltage_v", "balancing_current_a"];
  for (let i = 1; i <= cellCount; i += 1) {
    header.push(`cell_${String(i).padStart(2, "0")}_v`);
  }
  const rows = samples.map((s) => {
    const row = [
      new Date(s.timestamp).toISOString(),
      s.totalVoltage.toFixed(3),
      s.deltaCellVoltage.toFixed(4),
      s.balancingCurrent.toFixed(3),
    ];
    for (let i = 0; i < cellCount; i += 1) {
      const v = s.cellVoltages[i];
      row.push(v === undefined ? "" : v.toFixed(4));
    }
    return row.join(",");
  });
  return [header.join(","), ...rows].join("\n") + "\n";
}
