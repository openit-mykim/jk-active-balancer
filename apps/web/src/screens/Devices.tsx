import type { ReactElement } from "react";
import { DEFAULT_TARGET_PROFILE, KNOWN_PROFILES } from "@jk-active-balancer/jk-protocol";
import { Icon } from "../icons";
import { EmptyState, ListItem } from "../ui";
import type { ScreenProps } from "./context";

/**
 * 장치: full-screen device selection opened from the app bar
 * (jbd-bms-manager "장치" screen): real Bluetooth first, then demos and the
 * per-product layout previews.
 */
export function Devices(p: ScreenProps & { error: string | null }): ReactElement {
  const { t, snapshot: s, handle } = p;
  const connected = s.connection !== "IDLE";
  return (
    <div className="screen list-screen">
      {connected && (
        <ListItem
          icon={<Icon name="control" />}
          title={s.device?.name ?? s.device?.id ?? "-"}
          body={s.connection}
          trailing={
            <button type="button" className="btn-outlined" onClick={() => void handle.session.disconnect()}>
              {t("disconnect")}
            </button>
          }
        />
      )}

      <div className="group-title">Bluetooth</div>
      {p.webBluetooth ? (
        s.connection === "SCANNING" ? (
          <EmptyState icon={<Icon name="bluetoothSearch" size={72} />} title={t("scanning")} body={t("scanHint")} />
        ) : (
          <ListItem
            icon={<Icon name="bluetoothSearch" />}
            title={t("scan")}
            body={t("scanHint")}
            onClick={() => p.startMode("web-bluetooth")}
          />
        )
      ) : (
        <p className="muted pad">{t("webBluetoothUnsupported")}</p>
      )}
      {p.error && <p className="error-text pad">{p.error}</p>}

      <div className="group-title">{t("demoAndPreview")}</div>
      <ListItem icon={<Icon name="play" />} title={t("demoFixture")} onClick={() => p.startMode("demo")} />
      <ListItem icon={<Icon name="play" />} title={t("demoCapture")} body={t("syntheticNote")} onClick={() => p.startMode("demo-b4a24s")} />

      <div className="group-title">{t("supportedProducts")}</div>
      {KNOWN_PROFILES.map((profile) => {
        const spec = profile.spec;
        const extras = [spec.interfaces.rs485 && "RS485", spec.interfaces.can && "CAN", spec.interfaces.ntc && "NTC"].filter(Boolean);
        const tags = [
          profile.id === DEFAULT_TARGET_PROFILE.id ? t("default") : null,
          handle.mode === `preview:${profile.id}` ? t("previewing") : null,
        ].filter(Boolean);
        return (
          <ListItem
            key={profile.id}
            icon={<Icon name="chip" />}
            title={`${spec.model}${tags.length ? ` · ${tags.join(" · ")}` : ""}`}
            body={`${spec.minCells}-${spec.maxCells}S · ${spec.ratedBalanceCurrent} A${extras.length ? ` · ${extras.join("/")}` : ""} · ${
              profile.protocol === "UNKNOWN" ? t("protocolPending") : t("protocolUpstream", { p: profile.protocol })
            }`}
            trailing={
              <button type="button" className="btn-text" onClick={() => p.startMode(`preview:${profile.id}`)}>
                {t("preview")}
              </button>
            }
          />
        );
      })}
      <p className="muted small pad">{t("syntheticNote")}</p>
    </div>
  );
}
