import type { ReactElement } from "react";
import { Text, View } from "react-native";
import type { BleDevice } from "@jk-active-balancer/ble-core";
import { DEFAULT_TARGET_PROFILE, KNOWN_PROFILES } from "@jk-active-balancer/jk-protocol";
import { Button, EmptyState, GLYPH, GroupTitle, ListItem, s } from "../ui";
import type { ScreenProps } from "./context";

/** 장치: device selection screen (jbd-bms-manager "장치"). */
export function Devices(
  p: ScreenProps & { scanning: boolean; found: readonly BleDevice[]; error: string | null; scan: () => void; connect: (d: BleDevice) => void },
): ReactElement {
  const { t, snapshot: snap, handle } = p;
  return (
    <View>
      {snap.connection !== "IDLE" && (
        <ListItem
          glyph={GLYPH.bluetooth}
          title={snap.device?.name ?? snap.device?.id ?? "-"}
          body={snap.connection}
          trailing={<Button label={t("disconnect")} onPress={() => void handle.session.disconnect()} />}
        />
      )}

      <GroupTitle>Bluetooth</GroupTitle>
      {p.scanning ? (
        <EmptyState glyph={GLYPH.bluetooth} title={t("scanning")} body={t("scanHint")} />
      ) : (
        <ListItem glyph={GLYPH.bluetooth} title={t("scan")} body={t("scanHint")} onPress={p.scan} />
      )}
      {p.found.map((d) => (
        <ListItem
          key={d.id}
          glyph={GLYPH.chip}
          title={d.name ?? "(no name)"}
          body={`${d.id}${d.rssi !== undefined ? ` · ${d.rssi} dBm` : ""}`}
          onPress={() => p.connect(d)}
        />
      ))}
      {p.error ? <Text style={[s.error, { paddingHorizontal: 16 }]}>{p.error}</Text> : null}

      <GroupTitle>{t("demoAndPreview")}</GroupTitle>
      <ListItem glyph={GLYPH.play} title={t("demoFixture")} onPress={() => p.startMode("demo")} />
      <ListItem glyph={GLYPH.play} title={t("demoCapture")} body={t("syntheticNote")} onPress={() => p.startMode("demo-b4a24s")} />

      <GroupTitle>{t("supportedProducts")}</GroupTitle>
      {KNOWN_PROFILES.map((profile) => {
        const spec = profile.spec;
        const extras = [spec.interfaces.rs485 && "RS485", spec.interfaces.can && "CAN", spec.interfaces.ntc && "NTC"].filter(Boolean);
        const tags = [profile.id === DEFAULT_TARGET_PROFILE.id ? t("default") : null, handle.mode === `preview:${profile.id}` ? t("previewing") : null].filter(Boolean);
        return (
          <ListItem
            key={profile.id}
            glyph={GLYPH.chip}
            title={`${spec.model}${tags.length ? ` · ${tags.join(" · ")}` : ""}`}
            body={`${spec.minCells}-${spec.maxCells}S · ${spec.ratedBalanceCurrent} A${extras.length ? ` · ${extras.join("/")}` : ""} · ${
              profile.protocol === "UNKNOWN" ? t("protocolPending") : t("protocolUpstream", { p: profile.protocol })
            }`}
            trailing={<Button variant="text" label={t("preview")} onPress={() => p.startMode(`preview:${profile.id}`)} />}
          />
        );
      })}
      <Text style={[s.mutedSmall, { padding: 16 }]}>{t("syntheticNote")}</Text>
    </View>
  );
}
