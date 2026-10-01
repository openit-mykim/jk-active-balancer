/** Exponential reconnect backoff, capped at 30 s (design section 19). */
export const RECONNECT_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000, 15000, 30000];
/** Backoff cap. */
export const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Backoff delay for a 1-based reconnect attempt. Attempts beyond the table
 * stay at the cap.
 */
export function reconnectDelayMs(attempt: number): number {
  if (attempt < 1) {
    return RECONNECT_DELAYS_MS[0];
  }
  const index = Math.min(attempt - 1, RECONNECT_DELAYS_MS.length - 1);
  return RECONNECT_DELAYS_MS[index];
}
