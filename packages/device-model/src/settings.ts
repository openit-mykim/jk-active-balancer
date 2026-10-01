/**
 * Balancer settings read from the device.
 *
 * Phase 1 only reads these. Writing them is Phase 2 and whitelist-only
 * (design section 15); the intended write interface lives in
 * `@jk-active-balancer/jk-protocol` as `JkSettingsWriter`.
 */
export interface BalancerSettings {
  readonly balancerEnabled?: boolean;
  readonly balanceStartVoltage?: number;
  readonly balanceDeltaVoltage?: number;
}
