import { describe, expect, it } from "vitest";
import {
  MAX_RECONNECT_DELAY_MS,
  RECONNECT_DELAYS_MS,
  reconnectDelayMs,
} from "../src/reconnect-policy";

describe("reconnectDelayMs", () => {
  it("follows the documented 1/2/4/8/15/30 s schedule", () => {
    expect(RECONNECT_DELAYS_MS).toEqual([1000, 2000, 4000, 8000, 15000, 30000]);
    expect([1, 2, 3, 4, 5, 6].map(reconnectDelayMs)).toEqual([1000, 2000, 4000, 8000, 15000, 30000]);
  });

  it("caps at 30 s after the last step", () => {
    expect(reconnectDelayMs(7)).toBe(MAX_RECONNECT_DELAY_MS);
    expect(reconnectDelayMs(999)).toBe(MAX_RECONNECT_DELAY_MS);
  });

  it("falls back to the first delay for attempts below 1", () => {
    expect(reconnectDelayMs(0)).toBe(1000);
  });
});
