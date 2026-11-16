import { describe, expect, it } from "vitest";
import { TABS, connectionStatusKey, resolveLanguage, tabLabel, translate } from "../src/index";

describe("navigation + i18n (jbd-bms-manager structure)", () => {
  it("has the five jbd-bms-manager destinations in order", () => {
    expect(TABS).toEqual(["overview", "detail", "balance", "control", "settings"]);
    expect(TABS.map((t) => tabLabel("ko", t))).toEqual(["개요", "상세", "밸런스", "제어", "설정"]);
    expect(TABS.map((t) => tabLabel("en", t))).toEqual(["Overview", "Detail", "Balance", "Control", "Settings"]);
  });

  it("resolves the language from preference or locale and fills placeholders", () => {
    expect(resolveLanguage("system", "ko-KR")).toBe("ko");
    expect(resolveLanguage("system", "en-US")).toBe("en");
    expect(resolveLanguage("en", "ko-KR")).toBe("en");
    expect(translate("ko", "reconnectIn", { s: 4, n: 3 })).toBe("4초 후 재연결합니다 (시도 3)");
  });

  it("maps connection state to the app-bar status", () => {
    expect(connectionStatusKey("IDLE", "none")).toBe("disconnected");
    expect(connectionStatusKey("STREAMING", "fresh")).toBe("connected");
    expect(connectionStatusKey("STREAMING", "stale")).toBe("stale");
    expect(connectionStatusKey("RECONNECT_WAIT", "stalled")).toBe("reconnectWait");
    expect(connectionStatusKey("IDENTIFYING", "none")).toBe("connecting");
  });
});
