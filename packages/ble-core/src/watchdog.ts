/** Freshness of the last valid frame (design section 20). */
export type Freshness = "none" | "fresh" | "stale" | "stalled";

/** `< 5 s` fresh. */
export const STALE_AFTER_MS = 5000;
/** `> 15 s` disconnected / stalled. */
export const STALLED_AFTER_MS = 15000;

/**
 * Classify the age of the last valid frame. Values are never zeroed when data
 * goes stale; the UI shows a STALE badge instead (design section 20).
 */
export function classifyFreshness(lastValidFrameAt: number | undefined, now: number): Freshness {
  if (lastValidFrameAt === undefined) {
    return "none";
  }
  const age = now - lastValidFrameAt;
  if (age < STALE_AFTER_MS) {
    return "fresh";
  }
  if (age <= STALLED_AFTER_MS) {
    return "stale";
  }
  return "stalled";
}
