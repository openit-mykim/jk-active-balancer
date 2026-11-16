/**
 * Cell colour classification. Thresholds live in the UI layer and are user
 * configurable (design section 14.2: no colour thresholds in protocol code).
 */
export interface CellColorThresholds {
  /** Deviation from the average (V) that is still "ok". */
  readonly warnDeviation: number;
  /** Deviation from the average (V) treated as "alert". */
  readonly alertDeviation: number;
}

export const DEFAULT_CELL_COLOR_THRESHOLDS: CellColorThresholds = {
  warnDeviation: 0.01,
  alertDeviation: 0.03,
};

export type CellColorClass = "ok" | "warn" | "alert";

export function classifyCellVoltage(
  voltage: number,
  average: number,
  thresholds: CellColorThresholds = DEFAULT_CELL_COLOR_THRESHOLDS,
): CellColorClass {
  const deviation = Math.abs(voltage - average);
  if (deviation >= thresholds.alertDeviation) return "alert";
  if (deviation >= thresholds.warnDeviation) return "warn";
  return "ok";
}

/** Map the colour class to the jbd-bms-manager band names. */
export function cellBand(cls: CellColorClass): "normal" | "caution" | "danger" {
  return cls === "alert" ? "danger" : cls === "warn" ? "caution" : "normal";
}
