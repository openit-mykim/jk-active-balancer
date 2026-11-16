import { describe, expect, it } from "vitest";
import { fragment, replayFragments } from "../src/packet-pipeline";
import { classifyFreshness } from "../src/watchdog";
import { BAD_CHECKSUM, BALANCED, DEVICE_INFO, SETTINGS } from "./helpers/fixtures";

describe("packet watchdog thresholds (design section 20)", () => {
  it("classifies frame age", () => {
    expect(classifyFreshness(undefined, 0)).toBe("none");
    expect(classifyFreshness(0, 4999)).toBe("fresh");
    expect(classifyFreshness(0, 5000)).toBe("stale");
    expect(classifyFreshness(0, 15000)).toBe("stale");
    expect(classifyFreshness(0, 15001)).toBe("stalled");
  });
});

describe("fixture replay (design section 25)", () => {
  it("replays fragmented fixtures in order and drops the corrupt one", () => {
    const stream = [DEVICE_INFO, BAD_CHECKSUM, SETTINGS, BALANCED].flatMap((f) => fragment(f, 23));
    const kinds = replayFragments(stream).map((d) => d.kind);
    expect(kinds).toEqual(["device-info", "settings", "cell-info"]);
  });
});
