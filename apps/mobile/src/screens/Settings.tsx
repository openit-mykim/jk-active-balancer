import type { ReactElement } from "react";
import { Pressable, TextInput, View } from "react-native";
import { MAX_FONT_SCALE_FIXED, SIZE, SPACE, THEME, TYPE, type LanguagePreference } from "@jk-active-balancer/ui-common";
import { GroupTitle, ListItem, ToggleRow, Txt } from "../ui";
import type { ScreenProps } from "./context";

/** 설정: the app itself (jbd-bms-manager Settings). Values persist (AsyncStorage). */
export function Settings(p: ScreenProps & { prefsReset: boolean }): ReactElement {
  const { t, prefs, setPrefs } = p;
  const th = prefs.thresholds;
  const langs: ReadonlyArray<{ value: LanguagePreference; label: string }> = [
    { value: "system", label: t("langAuto") },
    { value: "ko", label: "한국어" },
    { value: "en", label: "English" },
  ];
  const input = (label: string, value: number, onChange: (mv: number) => void): ReactElement => (
    <TextInput
      accessibilityLabel={label}
      keyboardType="number-pad"
      defaultValue={String(Math.round(value * 1000))}
      onEndEditing={(e) => {
        const n = Number(e.nativeEvent.text);
        if (Number.isFinite(n) && n > 0) onChange(n);
      }}
      maxFontSizeMultiplier={MAX_FONT_SCALE_FIXED}
      style={{
        color: THEME.onSurface,
        backgroundColor: THEME.surfaceVariant,
        borderRadius: SIZE.radius,
        minHeight: SIZE.touchMin,
        minWidth: SIZE.buttonPrimary + SPACE.sm,
        paddingHorizontal: SPACE.sm,
        fontSize: TYPE.body.size,
        textAlign: "center",
      }}
    />
  );
  return (
    <View>
      {p.prefsReset && (
        <Txt role="label" color="onWarningContainer" style={{ padding: SPACE.lg }}>
          {t("prefsReset")}
        </Txt>
      )}
      <GroupTitle>{t("groupInterface")}</GroupTitle>
      <ListItem
        glyph="globe"
        title={t("language")}
        body={prefs.language === "system" ? t("langSystem") : prefs.language === "ko" ? "한국어" : "English"}
      />
      <View style={{ flexDirection: "row", gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md }} accessibilityRole="radiogroup">
        {langs.map((l) => {
          const on = prefs.language === l.value;
          return (
            <Pressable
              key={l.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={l.label}
              onPress={() => setPrefs({ language: l.value })}
              style={{
                flex: 1,
                minHeight: SIZE.touchMin,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: SIZE.radius,
                borderWidth: 1,
                borderColor: on ? THEME.primary : THEME.outline,
                backgroundColor: on ? THEME.primaryContainer : undefined,
              }}
            >
              <Txt role="label" fixed color={on ? "primary" : "onSurfaceMuted"}>
                {l.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <ListItem
        glyph="palette"
        title={t("cellThresholds")}
        body={`${t("caution")} / ${t("danger")} (mV)`}
        trailing={
          <View style={{ flexDirection: "row", gap: SPACE.sm }}>
            {input(t("caution"), th.warnDeviation, (mv) => setPrefs({ thresholds: { ...th, warnDeviation: mv / 1000 } }))}
            {input(t("danger"), th.alertDeviation, (mv) => setPrefs({ thresholds: { ...th, alertDeviation: mv / 1000 } }))}
          </View>
        }
      />
      <GroupTitle>{t("groupDeveloper")}</GroupTitle>
      <ToggleRow
        glyph="code"
        label={t("rawLogger")}
        value={prefs.loggerEnabled}
        onChange={(v) => {
          p.handle.logger.enabled = v;
          setPrefs({ loggerEnabled: v });
        }}
      />
      <GroupTitle>{t("groupOther")}</GroupTitle>
      <ListItem glyph="shield" title={t("privacyTitle")} body={t("privacyBody")} />
      <ListItem glyph="info" title={t("appInfo")} body={`${t("version")} ${p.appVersion} · ${t("appInfoBody")} · MIT`} />
    </View>
  );
}
