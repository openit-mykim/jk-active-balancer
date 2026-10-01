/** Active-balancer state for a pack. */
export interface BalancerState {
  readonly enabled: boolean;
  readonly active: boolean;
  /** Balancing current in amps, when the protocol reports it. */
  readonly current?: number;
  /** Configured balance start voltage, when known. */
  readonly startVoltage?: number;
  /** Configured balance delta voltage, when known. */
  readonly deltaVoltage?: number;
}
