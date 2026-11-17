import type { ReactElement } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { THEME, type LanguagePreference } from "@jk-active-balancer/ui-common";
import { GLYPH, GroupTitle, ListItem, Toggle, s } from "../ui";
import type { ScreenProps } from "./context";

const LANGS: ReadonlyArray<{ value: LanguagePreference; label: string }> = [
  { value: "system", label: "Auto" },
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
];

/** 설정: the app itself (jbd-bms-manager Settings). */
export function Settings(p: ScreenProps): ReactElement {
  const { t, prefs, setPrefs } = p;
  const th = prefs.thresholds;
  const input = (value: number, onChange: (mv: number) => void): ReactElement => (
    <TextInput
      keyboardType="number-pad"
      defaultValue={String(Math.round(value * 1000))}
      onEndEditing={(e) => {
        const n = Number(e.nativeEvent.text);
        if (Number.isFinite(n) && n > 0) onChange(n);
      }}
      style={{ color: THEME.onSurface, backgroundColor: THEME.surfaceVariant, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 48, textAlign: "center" }}
    />
  );
  return (
    <View>
      <GroupTitle>{t("groupInterface")}</GroupTitle>
      <ListItem
        glyph={GLYPH.globe}
        title={t("language")}
        body={prefs.language === "system" ? t("langSystem") : prefs.language === "ko" ? "한국어" : "English"}
        trailing={
          <View style={{ flexDirection: "row", gap: 4 }}>
            {LANGS.map((l) => (
              <Pressable
                key={l.value}
                onPress={() => setPrefs({ language: l.value })}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: prefs.language === l.value ? THEME.primary : THEME.outline,
                }}
              >
                <Text style={[s.mutedSmall, prefs.language === l.value && { color: THEME.primary }]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        }
      />
      <ListItem
        glyph={GLYPH.palette}
        title={t("cellThresholds")}
        body={`${t("caution")} / ${t("danger")} (mV)`}
        trailing={
          <View style={{ flexDirection: "row", gap: 6 }}>
            {input(th.warnDeviation, (mv) => setPrefs({ thresholds: { ...th, warnDeviation: mv / 1000 } }))}
            {input(th.alertDeviation, (mv) => setPrefs({ thresholds: { ...th, alertDeviation: mv / 1000 } }))}
          </View>
        }
      />
      <GroupTitle>{t("groupDeveloper")}</GroupTitle>
      <ListItem
        glyph={GLYPH.code}
        title={t("rawLogger")}
        trailing={
          <Toggle
            value={prefs.loggerEnabled}
            onChange={(v) => {
              p.handle.logger.enabled = v;
              setPrefs({ loggerEnabled: v });
            }}
          />
        }
      />
      <GroupTitle>{t("groupOther")}</GroupTitle>
      <ListItem glyph={GLYPH.info} title={t("appInfo")} body={`v0.1.0 · ${t("appInfoBody")} · MIT`} />
    </View>
  );
}
