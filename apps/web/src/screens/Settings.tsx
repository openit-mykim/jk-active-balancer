import type { ReactElement } from "react";
import type { LanguagePreference } from "@jk-active-balancer/ui-common";
import { Icon } from "../icons";
import { ListItem, Toggle } from "../ui";
import type { ScreenProps } from "./context";

/** 설정: the app itself, never the device (jbd-bms-manager Settings). */
export function Settings(p: ScreenProps): ReactElement {
  const { t, prefs, setPrefs } = p;
  const th = prefs.thresholds;
  const num = (v: string, fallback: number): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return (
    <div className="screen list-screen">
      <div className="group-title">{t("groupInterface")}</div>
      <ListItem
        icon={<Icon name="globe" />}
        title={t("language")}
        body={prefs.language === "system" ? t("langSystem") : prefs.language === "ko" ? "한국어" : "English"}
        trailing={
          <select
            value={prefs.language}
            aria-label={t("language")}
            onChange={(e) => setPrefs({ language: e.target.value as LanguagePreference })}
          >
            <option value="system">{t("langSystem")}</option>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        }
      />
      <ListItem
        icon={<Icon name="palette" />}
        title={t("cellThresholds")}
        body={`${t("caution")} ≥ ${(th.warnDeviation * 1000).toFixed(0)} mV · ${t("danger")} ≥ ${(th.alertDeviation * 1000).toFixed(0)} mV`}
        trailing={
          <span className="threshold-inputs">
            <input
              type="number"
              min="1"
              step="1"
              aria-label={t("caution")}
              value={Math.round(th.warnDeviation * 1000)}
              onChange={(e) => setPrefs({ thresholds: { ...th, warnDeviation: num(e.target.value, th.warnDeviation * 1000) / 1000 } })}
            />
            <input
              type="number"
              min="1"
              step="1"
              aria-label={t("danger")}
              value={Math.round(th.alertDeviation * 1000)}
              onChange={(e) => setPrefs({ thresholds: { ...th, alertDeviation: num(e.target.value, th.alertDeviation * 1000) / 1000 } })}
            />
          </span>
        }
      />

      <div className="group-title">{t("groupDeveloper")}</div>
      <ListItem
        icon={<Icon name="bluetoothSearch" />}
        title={t("namePrefixFallback")}
        body={t("namePrefixFallbackBody")}
        trailing={
          <Toggle
            checked={prefs.namePrefixFallback}
            onChange={(v) => setPrefs({ namePrefixFallback: v })}
            label={t("namePrefixFallback")}
          />
        }
      />
      <ListItem
        icon={<Icon name="code" />}
        title={t("rawLogger")}
        trailing={<Toggle checked={prefs.loggerEnabled} onChange={(v) => setPrefs({ loggerEnabled: v })} label={t("rawLogger")} />}
      />

      <div className="group-title">{t("groupOther")}</div>
      <ListItem icon={<Icon name="info" />} title={t("appInfo")} body={`v0.1.0 · ${t("appInfoBody")} · MIT`} />
    </div>
  );
}
