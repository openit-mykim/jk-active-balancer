import { type ReactElement, useState, useSyncExternalStore } from "react";
import { Share, View } from "react-native";
import { buildDebugExport } from "@jk-active-balancer/ble-core";
import { cellLayoutHint, parseHex } from "@jk-active-balancer/jk-protocol";
import { SPACE, freshnessLabel } from "@jk-active-balancer/ui-common";
import { Button, Card, EmptyState, LockIcon, Row, ToggleRow, Txt, fmt, st } from "../ui";
import { clearCrashes, getCrashes, subscribeCrashes } from "../crash-store";
import type { ScreenProps } from "./context";

/** 제어: locked maintenance workspace (jbd-bms-manager Control). */
export function Control(p: ScreenProps): ReactElement {
  const { snapshot: snap, t, handle, language } = p;
  const [unlocked, setUnlocked] = useState(false);
  const [includeRaw, setIncludeRaw] = useState(false);
  const [busy, setBusy] = useState(false);
  const crashes = useSyncExternalStore(subscribeCrashes, getCrashes);

  if (!unlocked) {
    return (
      <EmptyState illustration={<LockIcon />} title={t("maintenanceTitle")} body={t("maintenanceBody")}>
        <Button variant="filled" label={t("unlock")} onPress={() => setUnlocked(true)} />
      </EmptyState>
    );
  }

  const share = (raw: boolean): void => {
    const report = buildDebugExport({
      environment: { appVersion: p.appVersion, platform: `mobile/${handle.mode}` },
      snapshot: snap,
      events: handle.session.events,
      packetLog: handle.logger.entries,
      includeRawFrames: raw,
      crashes,
    });
    void Share.share({ title: "jk-active-balancer debug", message: JSON.stringify(report, null, 2) });
  };
  const frames = Object.entries(snap.capturedFrames);
  const cell = snap.capturedFrames.CELL_INFO;
  const hint = cell ? cellLayoutHint(parseHex(cell.hex)) : null;
  const settings = snap.settings;
  const setLogger = (v: boolean): void => {
    handle.logger.enabled = v;
    p.setPrefs({ loggerEnabled: v });
  };

  return (
    <View style={st.screen}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACE.sm }}>
          <LockIcon size={SPACE.lg} open />
          <Txt role="label" color="onSurfaceMuted">
            {t("maintenanceTitle")}
          </Txt>
        </View>
        <Button variant="text" label={t("lock")} onPress={() => setUnlocked(false)} />
      </View>

      {snap.profile?.mode === "diagnostic" && (
        <Card title={t("protocolCapture")}>
          <Txt role="label" color="onSurfaceMuted">
            {t("captureBody")}
          </Txt>
          {frames.map(([type, f]) => (
            <Row key={type} label={type} value={String(f.count)} />
          ))}
          {hint && <Row label={t("layoutHint")} value={`${hint.likely} (JK04 ${hint.jk04PlausibleCells} / JK02 ${hint.jk02PlausibleCells})`} />}
          <Button variant="filled" label={t("exportCapture")} disabled={frames.length === 0} onPress={() => share(false)} />
        </Card>
      )}

      <Card title={t("balancerSettings")}>
        {settings ? (
          <>
            <Row label={t("balancerSwitch")} value={settings.balancerEnabled ? t("enabled") : t("disabled")} />
            <Row label={t("cellCount")} value={`${settings.cellCount}S`} />
            <Row label={t("startVoltage")} value={`${fmt(settings.balanceStartVoltage)} V`} />
            <Row label={t("triggerDelta")} value={`${fmt(settings.balanceTriggerDeltaVoltage)} V`} />
            <Row label={t("maxBalanceCurrent")} value={`${fmt(settings.maxBalanceCurrent, 1)} A`} />
            <Row label={t("powerOffVoltage")} value={`${fmt(settings.powerOffVoltage)} V`} />
          </>
        ) : (
          <Txt role="label" color="onSurfaceMuted">
            {snap.profile?.mode === "diagnostic" ? t("settingsNotDecoded") : t("noDataBody")}
          </Txt>
        )}
        <Txt role="caption" color="onSurfaceMuted">
          {t("writeDisabled")}
        </Txt>
        <Button
          label={t("readSettings")}
          disabled={busy || !settings || !["READY", "STREAMING"].includes(snap.connection)}
          onPress={() => {
            setBusy(true);
            void handle.session
              .readSettings()
              .catch(() => undefined)
              .finally(() => setBusy(false));
          }}
        />
      </Card>

      <Card title={t("crashLog")}>
        {crashes.length === 0 ? (
          <Txt role="label" color="onSurfaceMuted">
            {t("crashLogEmpty")}
          </Txt>
        ) : (
          crashes
            .slice(-3)
            .reverse()
            .map((c) => <Row key={c.at + c.message} label={`${c.at.slice(0, 16).replace("T", " ")} · ${c.kind}${c.fatal ? " · fatal" : ""}`} value={c.message} />)
        )}
        <Txt role="caption" color="onSurfaceMuted">
          {t("crashLogNote")}
        </Txt>
        {crashes.length > 0 && <Button variant="text" label={t("clearCrashLog")} onPress={clearCrashes} />}
      </Card>

      <Card title={t("diagnostics")}>
        <Row label={t("frames")} value={`${snap.framesReceived} · ${freshnessLabel(language, snap.freshness)}`} />
        <Row label={t("parserErrors")} value={String(snap.parserErrors.length)} />
        <ToggleRow label={t("rawLogger")} value={p.prefs.loggerEnabled} onChange={setLogger} />
        <ToggleRow label={t("includeRaw")} value={includeRaw} onChange={setIncludeRaw} />
        <View style={st.btnRow}>
          <Button label={t("exportDebug")} onPress={() => share(includeRaw)} />
          <Button variant="text" label={t("clearLog")} onPress={() => handle.logger.clear()} />
        </View>
        {p.prefs.loggerEnabled && (
          <Txt role="micro" mono color="logText">
            {handle.logger.entries
              .slice(-30)
              .reverse()
              .map((e) => `${e.timestamp.slice(11, 23)} ${e.direction}${e.frame ? ` ${e.frame}` : ""} ${e.hex.slice(0, 47)}`)
              .join("\n") || "—"}
          </Txt>
        )}
      </Card>
    </View>
  );
}
