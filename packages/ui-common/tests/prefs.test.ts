import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, PREFS_SCHEMA_VERSION, parsePrefs, serializePrefs } from "../src/prefs";

describe("preferences storage (wiki standard 5.4: schema version, discard, never crash)", () => {
  it("round-trips with a schema version", () => {
    const prefs = { ...DEFAULT_PREFS, language: "en" as const, loggerEnabled: true, thresholds: { warnDeviation: 0.02, alertDeviation: 0.05 } };
    const raw = serializePrefs(prefs);
    expect(JSON.parse(raw).schemaVersion).toBe(PREFS_SCHEMA_VERSION);
    expect(parsePrefs(raw)).toEqual({ prefs, status: "loaded" });
  });

  it("uses defaults when nothing is stored", () => {
    expect(parsePrefs(null)).toEqual({ prefs: DEFAULT_PREFS, status: "default" });
  });

  it("discards an old (pre-schema) cache written by an earlier build", () => {
    // Shape stored by the web app before schemaVersion existed.
    const legacy = JSON.stringify({ language: "ko", thresholds: { warnDeviation: 0.01, alertDeviation: 0.03 }, namePrefixFallback: false, loggerEnabled: true });
    expect(parsePrefs(legacy)).toEqual({ prefs: DEFAULT_PREFS, status: "discarded" });
  });

  it("discards corrupt JSON and records from a newer schema", () => {
    expect(parsePrefs("{not json").status).toBe("discarded");
    expect(parsePrefs(JSON.stringify({ schemaVersion: PREFS_SCHEMA_VERSION + 1, language: "en" })).status).toBe("discarded");
    expect(parsePrefs("42").status).toBe("discarded");
  });

  it("replaces invalid fields with defaults instead of failing", () => {
    const raw = JSON.stringify({ schemaVersion: PREFS_SCHEMA_VERSION, language: "fr", loggerEnabled: "yes", thresholds: { warnDeviation: -1, alertDeviation: 0.001 } });
    const { prefs, status } = parsePrefs(raw);
    expect(status).toBe("loaded");
    expect(prefs.language).toBe("system");
    expect(prefs.loggerEnabled).toBe(false);
    expect(prefs.thresholds.warnDeviation).toBe(DEFAULT_PREFS.thresholds.warnDeviation);
    expect(prefs.thresholds.alertDeviation).toBeGreaterThan(prefs.thresholds.warnDeviation);
  });
});
