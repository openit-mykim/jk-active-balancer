import { describe, expect, it } from "vitest";
import { CRASH_LOG_MAX, appendCrash, makeCrashRecord, parseCrashLog, serializeCrashLog } from "../src/crash-log";

describe("local crash log", () => {
  it("records, bounds, round-trips", () => {
    let list = [] as ReturnType<typeof parseCrashLog>;
    for (let i = 0; i < CRASH_LOG_MAX + 3; i += 1) {
      list = appendCrash(list, makeCrashRecord(new TypeError(`boom ${i}`), "js", i % 2 === 0, "0.1.0", 0));
    }
    expect(list).toHaveLength(CRASH_LOG_MAX);
    expect(list[list.length - 1].message).toBe(`TypeError: boom ${CRASH_LOG_MAX + 2}`);
    expect(parseCrashLog(serializeCrashLog(list))).toEqual(list);
  });

  it("accepts non-Error throws and trims stacks", () => {
    const r = makeCrashRecord("plain string", "promise", false, "0.1.0");
    expect(r.message).toBe("Error: plain string");
    const big = new Error("x");
    big.stack = "s".repeat(5000);
    expect(makeCrashRecord(big, "render", true, "0.1.0").stack?.length).toBe(1500);
  });

  it("drops unknown versions and malformed entries instead of throwing", () => {
    expect(parseCrashLog("garbage")).toEqual([]);
    expect(parseCrashLog(JSON.stringify({ schemaVersion: 99, crashes: [] }))).toEqual([]);
    expect(parseCrashLog(JSON.stringify({ schemaVersion: 1, crashes: [{ at: 1 }, { at: "t", message: "m", kind: "js" }] }))).toHaveLength(1);
  });
});
