import { type ReactElement, useState } from "react";
import { Share, Text, View } from "react-native";
import { buildDebugExport } from "@jk-active-balancer/ble-core";
import { cellLayoutHint, parseHex } from "@jk-active-balancer/jk-protocol";
import { Button, Card, EmptyState, LockIcon, Row, Toggle, fmt, s } from "../ui";
import type { ScreenProps } from "./context";

/** 제어: locked maintenance workspace (jbd-bms-manager Control). */
export function Control(p: ScreenProps): ReactElement {
  const { snapshot: snap, t, handle } = p;
  const [unlocked, setUnlocked] = useState(false);
  const [includeRaw, setIncludeRaw] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!unlocked) {
    return (
      <EmptyState glyph={<LockIcon />} title={t("maintenanceTitle")} body={t("maintenanceBody")}>
        <Button variant="filled" label={t("unlock")} onPress={() => setUnlocked(true)} />
      </EmptyState>
    );
  }

  const share = (raw: boolean): void => {
    const report = buildDebugExport({
      environment: { appVersion: "0.1.0", platform: `mobile/${handle.mode}` },
      snapshot: snap,
      events: handle.session.events,
      packetLog: handle.logger.entries,
      includeRawFrames: raw,
    });
    void Share.share({ title: "jk-active-balancer debug", message: JSON.stringify(report, null, 2) });
  };
  const frames = Object.entries(snap.capturedFrames);
  const cell = snap.capturedFrames.CELL_INFO;
  const hint = cell ? cellLayoutHint(parseHex(cell.hex)) : null;
  const st = snap.settings;

  return (
    <View style={s.screen}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LockIcon size={18} open />
          <Text style={s.muted}>{t("maintenanceTitle")}</Text>
        </View>
        <Button variant="text" label={t("lock")} onPress={() => setUnlocked(false)} />
      </View>

      {snap.profile?.mode === "diagnostic" && (
        <Card title={t("protocolCapture")}>
          <Text style={s.muted}>{t("captureBody")}</Text>
          {frames.map(([type, f]) => (
            <Row key={type} label={type} value={String(f.count)} />
          ))}
          {hint && <Row label={t("layoutHint")} value={`${hint.likely} (JK04 ${hint.jk04PlausibleCells} / JK02 ${hint.jk02PlausibleCells})`} />}
          <Button variant="filled" label={t("exportCapture")} disabled={frames.length === 0} onPress={() => share(false)} />
        </Card>
      )}

      <Card title={t("balancerSettings")}>
        {st ? (
          <>
            <Row label={t("balancerSwitch")} value={st.balancerEnabled ? t("enabled") : t("disabled")} />
            <Row label={t("cellCount")} value={`${st.cellCount}S`} />
            <Row label={t("startVoltage")} value={`${fmt(st.balanceStartVoltage)} V`} />
            <Row label={t("triggerDelta")} value={`${fmt(st.balanceTriggerDeltaVoltage)} V`} />
            <Row label={t("maxBalanceCurrent")} value={`${fmt(st.maxBalanceCurrent, 1)} A`} />
            <Row label={t("powerOffVoltage")} value={`${fmt(st.powerOffVoltage)} V`} />
          </>
        ) : (
          <Text style={s.muted}>{snap.profile?.mode === "diagnostic" ? t("settingsNotDecoded") : t("noDataBody")}</Text>
        )}
        <Text style={s.mutedSmall}>{t("writeDisabled")}</Text>
        <Button
          label={t("readSettings")}
          disabled={busy || !st || !["READY", "STREAMING"].includes(snap.connection)}
          onPress={() => {
            setBusy(true);
            void handle.session
              .readSettings()
              .catch(() => undefined)
              .finally(() => setBusy(false));
          }}
        />
      </Card>

      <Card title={t("diagnostics")}>
        <Row label={t("frames")} value={`${snap.framesReceived} · ${snap.freshness}`} />
        <Row label={t("parserErrors")} value={String(snap.parserErrors.length)} />
        <View style={s.inlineToggle}>
          <Text style={s.text}>{t("rawLogger")}</Text>
          <Toggle
            value={p.prefs.loggerEnabled}
            onChange={(v) => {
              handle.logger.enabled = v;
              p.setPrefs({ loggerEnabled: v });
            }}
          />
        </View>
        <View style={s.inlineToggle}>
          <Text style={s.text}>{t("includeRaw")}</Text>
          <Toggle value={includeRaw} onChange={setIncludeRaw} />
        </View>
        <View style={s.btnRow}>
          <Button label={t("exportDebug")} onPress={() => share(includeRaw)} />
          <Button variant="text" label={t("clearLog")} onPress={() => handle.logger.clear()} />
        </View>
        {p.prefs.loggerEnabled && (
          <Text style={{ color: "#9fb3cf", fontFamily: "monospace", fontSize: 10 }}>
            {handle.logger.entries
              .slice(-30)
              .reverse()
              .map((e) => `${e.timestamp.slice(11, 23)} ${e.direction}${e.frame ? ` ${e.frame}` : ""} ${e.hex.slice(0, 47)}`)
              .join("\n") || "—"}
          </Text>
        )}
      </Card>
    </View>
  );
}
