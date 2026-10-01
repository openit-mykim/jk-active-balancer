import type { BalancerState } from "./balancer";
import type { CellState } from "./cells";

/** A point-in-time view of the pack. */
export interface BatterySnapshot {
  readonly timestamp: number;
  readonly cells: readonly CellState[];
  readonly minCellVoltage: number;
  readonly maxCellVoltage: number;
  readonly deltaCellVoltage: number;
  readonly averageCellVoltage: number;
  readonly packVoltage?: number;
  readonly balancer: BalancerState;
}
