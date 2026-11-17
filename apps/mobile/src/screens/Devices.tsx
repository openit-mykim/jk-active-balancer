import type { ReactElement } from "react";
import { Linking, View } from "react-native";
import type { BleDevice } from "@jk-active-balancer/ble-core";
import { DEFAULT_TARGET_PROFILE, KNOWN_PROFILES } from "@jk-active-balancer/jk-protocol";
import { SPACE, stateLabel } from "@jk-active-balancer/ui-common";
import { Button, EmptyState, GroupTitle, Illustration, ListItem, Txt } from "../ui";
import type { ScreenProps } from "./context";

/** 장치: device selection screen (jbd-bms-manager "장치"). */
export function Devices(
  p: ScreenProps & {
    scanning: boolean;
    found: readonly BleDevice[];
    error: string | null;
    permissionDenied: boolean;
    scan: () => void;
    connect: (d: BleDevice) => void;
  },
): ReactElement {
  const { t, snapshot: snap, handle, language } = p;
  return (
    <View>
      {snap.connection !== "IDLE" && (
        <ListItem
          glyph="bluetooth"
          title={snap.device?.name ?? snap.device?.id ?? "-"}
          body={stateLabel(language, snap.connection)}
          trailing={<Button label={t("disconnect")} onPress={() => void handle.session.disconnect()} />}
        />
      )}

      <GroupTitle>{t("bluetooth")}</GroupTitle>
      {p.scanning ? (
        <EmptyState illustration={<Illustration name="bluetooth" />} title={t("scanning")} body={t("scanHint")} />
      ) : (
        <ListItem glyph="bluetooth" title={t("scan")} body={t("scanHint")} onPress={p.scan} />
      )}
      {p.found.map((d) => (
        <ListItem
          key={d.id}
          glyph="chip"
          title={d.name ?? t("noName")}
          body={`${d.id}${d.rssi !== undefined ? ` · ${d.rssi} dBm` : ""}`}
          onPress={() => p.connect(d)}
        />
      ))}
      {/* 5.8: permission denied -> explain, offer settings, keep demos usable; never re-request in a loop. */}
      {p.permissionDenied && (
        <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, gap: SPACE.sm }}>
          <Txt role="label" color="error">
            {t("permissionDenied")}
          </Txt>
          <Button label={t("openAppSettings")} onPress={() => void Linking.openSettings()} />
        </View>
      )}
      {p.error && !p.permissionDenied ? (
        <Txt role="label" color="error" style={{ paddingHorizontal: SPACE.lg }}>
          {p.error}
        </Txt>
      ) : null}

      <GroupTitle>{t("demoAndPreview")}</GroupTitle>
      <ListItem glyph="play" title={t("demoFixture")} onPress={() => p.startMode("demo")} />
      <ListItem glyph="play" title={t("demoCapture")} body={t("syntheticNote")} onPress={() => p.startMode("demo-b4a24s")} />

      <GroupTitle>{t("supportedProducts")}</GroupTitle>
      {KNOWN_PROFILES.map((profile) => {
        const spec = profile.spec;
        const extras = [spec.interfaces.rs485 && "RS485", spec.interfaces.can && "CAN", spec.interfaces.ntc && "NTC"].filter(Boolean);
        const tags = [profile.id === DEFAULT_TARGET_PROFILE.id ? t("default") : null, handle.mode === `preview:${profile.id}` ? t("previewing") : null].filter(Boolean);
        return (
          <ListItem
            key={profile.id}
            glyph="chip"
            title={`${spec.model}${tags.length ? ` · ${tags.join(" · ")}` : ""}`}
            body={`${spec.minCells}-${spec.maxCells}S · ${spec.ratedBalanceCurrent} A${extras.length ? ` · ${extras.join("/")}` : ""} · ${
              profile.protocol === "UNKNOWN" ? t("protocolPending") : t("protocolUpstream", { p: profile.protocol })
            }`}
            trailing={<Button variant="text" label={t("preview")} onPress={() => p.startMode(`preview:${profile.id}`)} />}
          />
        );
      })}
      <Txt role="caption" color="onSurfaceMuted" style={{ padding: SPACE.lg }}>
        {t("syntheticNote")}
      </Txt>
    </View>
  );
}
