import type { ReactElement, ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { THEME } from "@jk-active-balancer/ui-common";

/** Text glyph icons (no native SVG dependency); `︎` forces text style. */
export const GLYPH: Record<string, string> = {
  overview: "▦",
  detail: "☰",
  balance: "▮",
  control: "ᛒ",
  settings: "⚙︎",
  menu: "☰",
  back: "←",
  bluetooth: "ᛒ",
  info: "ⓘ",
  play: "▶︎",
  chip: "▣",
  globe: "◎",
  palette: "◧",
  code: "‹›",
};

export function Card({ title, children, dim }: { title?: string; children: ReactNode; dim?: boolean }): ReactElement {
  return (
    <View style={[s.card, dim && s.dim]}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function EmptyState({ glyph, title, body, children }: { glyph: ReactNode; title: string; body: string; children?: ReactNode }): ReactElement {
  return (
    <View style={s.empty}>
      {typeof glyph === "string" ? <Text style={s.emptyGlyph}>{glyph}</Text> : glyph}
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {children ? <View style={{ alignSelf: "center", marginTop: 6 }}>{children}</View> : null}
    </View>
  );
}

/** Monochrome padlock drawn with Views (the text glyph renders as a colour emoji). */
export function LockIcon({ size = 72, open = false }: { size?: number; open?: boolean }): ReactElement {
  const color = "#bdc1c6";
  const w = size * 0.7;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "flex-end" }}>
      <View
        style={{
          width: w * 0.62,
          height: size * 0.42,
          borderWidth: size * 0.075,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: w * 0.31,
          borderTopRightRadius: w * 0.31,
          marginBottom: -1,
          transform: open ? [{ translateX: w * 0.18 }, { translateY: -size * 0.06 }] : [],
        }}
      />
      <View style={{ width: w, height: size * 0.5, backgroundColor: color, borderRadius: size * 0.06 }} />
    </View>
  );
}

export function Metric({ label, value, sub, band }: { label: string; value: string; sub?: string; band?: "normal" | "caution" | "danger" }): ReactElement {
  return (
    <View style={[s.metric, band && { borderLeftColor: THEME.band[band] }]}>
      <Text style={s.muted}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      {sub ? <Text style={s.mutedSmall}>{sub}</Text> : null}
    </View>
  );
}

export function MetricGrid({ children }: { children: ReactNode }): ReactElement {
  return <View style={s.metricGrid}>{children}</View>;
}

export function Row({ label, value }: { label: string; value: ReactNode }): ReactElement {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      {typeof value === "string" ? <Text style={s.rowValue}>{value}</Text> : value}
    </View>
  );
}

export function ListItem(props: { glyph: string; title: string; body?: string; trailing?: ReactNode; onPress?: () => void }): ReactElement {
  const inner = (
    <>
      <Text style={s.liGlyph}>{props.glyph}</Text>
      <View style={s.liText}>
        <Text style={s.liTitle}>{props.title}</Text>
        {props.body ? <Text style={s.mutedSmall}>{props.body}</Text> : null}
      </View>
      {props.trailing}
    </>
  );
  return props.onPress ? (
    <Pressable style={({ pressed }) => [s.listItem, pressed && s.pressed]} onPress={props.onPress}>
      {inner}
    </Pressable>
  ) : (
    <View style={s.listItem}>{inner}</View>
  );
}

export function GroupTitle({ children }: { children: string }): ReactElement {
  return <Text style={s.groupTitle}>{children}</Text>;
}

type Variant = "filled" | "tonal" | "outlined" | "text";
export function Button({ label, onPress, variant = "outlined", disabled }: { label: string; onPress: () => void; variant?: Variant; disabled?: boolean }): ReactElement {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.btn, s[`btn_${variant}`], pressed && s.pressed, disabled && s.disabled]}
    >
      <Text style={[s.btnText, variant === "filled" && { color: THEME.onAppBar, fontWeight: "700" }, variant === "text" && { color: THEME.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }): ReactElement {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: "#5f6368", true: THEME.primary }}
      thumbColor="#e8eaed"
    />
  );
}

export function Segmented<V extends string>(props: { value: V; options: ReadonlyArray<{ value: V; label: string }>; onChange: (v: V) => void }): ReactElement {
  return (
    <View style={s.segmented}>
      {props.options.map((o, i) => {
        const on = o.value === props.value;
        return (
          <Pressable key={o.value} onPress={() => props.onChange(o.value)} style={[s.segment, i > 0 && s.segmentDivider, on && s.segmentOn]}>
            <Text style={[s.segmentText, on && { color: THEME.primary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Minimal bar chart from Views (no SVG dependency). */
export function BarChart({ values }: { values: readonly number[] }): ReactElement {
  const last = values.slice(-60);
  const min = Math.min(...last);
  const max = Math.max(...last);
  const span = max - min || 1;
  return (
    <View style={s.chart}>
      {last.map((v, i) => (
        <View key={i} style={[s.chartBar, { height: `${8 + ((v - min) / span) * 92}%` }]} />
      ))}
    </View>
  );
}

export const fmt = (value: number | undefined, digits = 3): string => (value === undefined ? "-" : value.toFixed(digits));

export const s = StyleSheet.create({
  screen: { padding: 12, gap: 12 },
  card: { backgroundColor: THEME.surface, borderColor: THEME.outline, borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  cardTitle: { color: THEME.onSurface, fontSize: 16, fontWeight: "600", marginBottom: 4 },
  dim: { opacity: 0.6 },
  text: { color: THEME.onSurface, fontSize: 14 },
  muted: { color: THEME.onSurfaceMuted, fontSize: 12 },
  mutedSmall: { color: THEME.onSurfaceMuted, fontSize: 11 },
  error: { color: "#ff8a80", fontSize: 13 },
  empty: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 24, gap: 10 },
  emptyGlyph: { color: "#bdc1c6", fontSize: 72 },
  emptyTitle: { color: THEME.onSurface, fontSize: 24 },
  emptyBody: { color: THEME.onSurfaceMuted, fontSize: 15, textAlign: "center" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { backgroundColor: THEME.surfaceVariant, borderRadius: 8, padding: 9, width: "48.5%", borderLeftWidth: 4, borderLeftColor: "transparent" },
  metricValue: { color: THEME.onSurface, fontSize: 18, fontVariant: ["tabular-nums"] },
  primaryMetric: { color: THEME.onSurface, fontSize: 40, fontVariant: ["tabular-nums"], marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: THEME.surfaceVariant },
  rowLabel: { color: THEME.onSurfaceMuted, fontSize: 14 },
  rowValue: { color: THEME.onSurface, fontSize: 14, textAlign: "right", flexShrink: 1 },
  listItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: THEME.surfaceVariant },
  liGlyph: { color: "#bdc1c6", fontSize: 20, width: 26, textAlign: "center" },
  liText: { flex: 1, gap: 2 },
  liTitle: { color: THEME.onSurface, fontSize: 16 },
  groupTitle: { color: THEME.onSurface, fontSize: 15, fontWeight: "600", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  btn: { borderRadius: 6, paddingVertical: 9, paddingHorizontal: 14, alignSelf: "flex-start", borderWidth: 1, borderColor: "transparent" },
  btn_filled: { backgroundColor: THEME.primary },
  btn_tonal: { backgroundColor: "#33415c" },
  btn_outlined: { borderColor: THEME.outline },
  btn_text: {},
  btnText: { color: THEME.onSurface, fontSize: 14 },
  segmented: { flexDirection: "row", borderWidth: 1, borderColor: THEME.outline, borderRadius: 6, overflow: "hidden", marginBottom: 8 },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center" },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: THEME.outline },
  segmentOn: { backgroundColor: "#1e3a5f" },
  segmentText: { color: THEME.onSurfaceMuted, fontSize: 13 },
  chart: { height: 110, flexDirection: "row", alignItems: "flex-end", gap: 1, backgroundColor: THEME.surfaceVariant, borderRadius: 8, padding: 6 },
  chartBar: { flex: 1, backgroundColor: THEME.primary, borderRadius: 1 },
  chip: { color: "#fff", fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  inlineToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
});
