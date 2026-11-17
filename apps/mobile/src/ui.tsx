import type { ReactElement, ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, type TextStyle, View } from "react-native";
import { MAX_FONT_SCALE_FIXED, SIZE, SPACE, THEME, TYPE, type TypeRole } from "@jk-active-balancer/ui-common";

/**
 * Mobile UI primitives. Wiki "모바일 앱 개발 표준" 5.7: every text uses a type
 * role, every size / gap a token, every colour a role - no literals in screens
 * (enforced by tests/design-tokens.test.ts).
 */

type ColorRole = "onSurface" | "onSurfaceMuted" | "onSurfaceVariant" | "primary" | "error" | "onAppBar" | "onWarningContainer" | "logText";

export function Txt(props: {
  role?: TypeRole;
  color?: ColorRole;
  bold?: boolean;
  center?: boolean;
  mono?: boolean;
  tabular?: boolean;
  fixed?: boolean;
  lines?: number;
  style?: TextStyle;
  children: ReactNode;
}): ReactElement {
  const t = TYPE[props.role ?? "body"];
  return (
    <Text
      numberOfLines={props.lines}
      maxFontSizeMultiplier={props.fixed ? MAX_FONT_SCALE_FIXED : undefined}
      style={[
        {
          fontSize: t.size,
          lineHeight: t.lineHeight,
          color: THEME[props.color ?? "onSurface"],
          fontWeight: props.bold ? "700" : "400",
          textAlign: props.center ? "center" : undefined,
          fontFamily: props.mono ? "monospace" : undefined,
          fontVariant: props.tabular ? ["tabular-nums"] : undefined,
        },
        props.style,
      ]}
    >
      {props.children}
    </Text>
  );
}

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
  shield: "◈",
};

/** Icon glyph in a 24 dp box (icons are not typography). */
export function Glyph({ name, color = "onSurfaceVariant", box = SIZE.icon }: { name: string; color?: ColorRole; box?: number }): ReactElement {
  return (
    <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }} importantForAccessibility="no">
      <Text allowFontScaling={false} style={{ fontSize: box * 0.83, lineHeight: box, color: THEME[color] }}>
        {GLYPH[name] ?? name}
      </Text>
    </View>
  );
}

export function Card({ title, children, dim }: { title?: string; children: ReactNode; dim?: boolean }): ReactElement {
  return (
    <View style={[st.card, dim && st.dim]}>
      {title ? (
        <Txt role="heading" bold>
          {title}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

export function EmptyState({ illustration, title, body, children }: { illustration: ReactNode; title: string; body: string; children?: ReactNode }): ReactElement {
  return (
    <View style={st.empty}>
      {illustration}
      <Txt role="title" center>
        {title}
      </Txt>
      <Txt color="onSurfaceMuted" center>
        {body}
      </Txt>
      {children ? <View style={{ alignSelf: "center", marginTop: SPACE.sm }}>{children}</View> : null}
    </View>
  );
}

export function Illustration({ name }: { name: string }): ReactElement {
  return <Glyph name={name} box={SIZE.illustration} />;
}

/** Monochrome padlock drawn with Views (the text glyph renders as a colour emoji). */
export function LockIcon({ size = SIZE.illustration, open = false }: { size?: number; open?: boolean }): ReactElement {
  const color = THEME.onSurfaceVariant;
  const w = size * 0.7;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "flex-end" }} importantForAccessibility="no">
      <View
        style={{
          width: w * 0.62,
          height: size * 0.42,
          borderWidth: size * 0.075,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: w * 0.31,
          borderTopRightRadius: w * 0.31,
          marginBottom: 0,
          transform: open ? [{ translateX: w * 0.18 }, { translateY: -size * 0.06 }] : [],
        }}
      />
      <View style={{ width: w, height: size * 0.5, backgroundColor: color, borderRadius: size * 0.06 }} />
    </View>
  );
}

export function Metric({ label, value, sub, band }: { label: string; value: string; sub?: string; band?: "normal" | "caution" | "danger" }): ReactElement {
  return (
    <View style={[st.metric, band && { borderLeftColor: THEME.band[band] }]} accessible accessibilityLabel={`${label} ${value}${sub ? ` ${sub}` : ""}`}>
      <Txt role="caption" color="onSurfaceMuted">
        {label}
      </Txt>
      <Txt role="heading" tabular>
        {value}
      </Txt>
      {sub ? (
        <Txt role="caption" color="onSurfaceMuted">
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}

export function MetricGrid({ children }: { children: ReactNode }): ReactElement {
  return <View style={st.metricGrid}>{children}</View>;
}

export function Row({ label, value }: { label: string; value: ReactNode }): ReactElement {
  return (
    <View style={st.row} accessible={typeof value === "string"} accessibilityLabel={typeof value === "string" ? `${label} ${value}` : undefined}>
      <Txt role="label" color="onSurfaceMuted">
        {label}
      </Txt>
      {typeof value === "string" ? (
        <Txt role="label" tabular style={{ flexShrink: 1, textAlign: "right" }}>
          {value}
        </Txt>
      ) : (
        value
      )}
    </View>
  );
}

export function ListItem(props: { glyph: string; title: string; body?: string; trailing?: ReactNode; onPress?: () => void; a11yHint?: string }): ReactElement {
  const inner = (
    <>
      <Glyph name={props.glyph} />
      <View style={st.liText}>
        <Txt>{props.title}</Txt>
        {props.body ? (
          <Txt role="caption" color="onSurfaceMuted">
            {props.body}
          </Txt>
        ) : null}
      </View>
      {props.trailing}
    </>
  );
  return props.onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.title}
      accessibilityHint={props.a11yHint ?? props.body}
      style={({ pressed }) => [st.listItem, pressed && st.pressed]}
      onPress={props.onPress}
    >
      {inner}
    </Pressable>
  ) : (
    <View style={st.listItem}>{inner}</View>
  );
}

export function GroupTitle({ children }: { children: string }): ReactElement {
  return (
    <Txt role="label" bold color="primary" style={st.groupTitle}>
      {children}
    </Txt>
  );
}

type Variant = "filled" | "tonal" | "outlined" | "text";

/** 5.7.7: primary 52 dp (filled), secondary 44 dp visual / 48 dp touch. */
export function Button({ label, onPress, variant = "outlined", disabled }: { label: string; onPress: () => void; variant?: Variant; disabled?: boolean }): ReactElement {
  const primary = variant === "filled";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={primary ? undefined : (SIZE.touchMin - SIZE.buttonSecondary) / 2}
      style={({ pressed }) => [
        st.btn,
        primary ? st.btnPrimary : st.btnSecondary,
        variant === "tonal" && { backgroundColor: THEME.secondaryContainer },
        variant === "outlined" && { borderColor: THEME.outline },
        primary && { backgroundColor: THEME.primary },
        pressed && st.pressed,
        disabled && st.disabled,
      ]}
    >
      <Txt role="label" bold={primary} fixed color={primary ? "onAppBar" : variant === "text" ? "primary" : "onSurface"}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }): ReactElement {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: THEME.switchTrackOff, true: THEME.primary }}
      thumbColor={THEME.onSurface}
    />
  );
}

/** Badge (non-interactive, 24 dp, Micro 11). */
export function Badge({ band, children }: { band: "normal" | "caution" | "danger"; children: string }): ReactElement {
  return (
    <View style={[st.badge, { backgroundColor: THEME.band[band] }]}>
      <Txt role="micro" bold fixed style={{ color: THEME.onBand[band] }}>
        {children}
      </Txt>
    </View>
  );
}

export function Segmented<V extends string>(props: { value: V; options: ReadonlyArray<{ value: V; label: string }>; onChange: (v: V) => void }): ReactElement {
  return (
    <View style={st.segmented} accessibilityRole="tablist">
      {props.options.map((o, i) => {
        const on = o.value === props.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => props.onChange(o.value)}
            style={[st.segment, i > 0 && st.segmentDivider, on && { backgroundColor: THEME.primaryContainer }]}
          >
            <Txt role="label" fixed color={on ? "primary" : "onSurfaceMuted"} lines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Minimal bar chart from Views (no SVG dependency). */
export function BarChart({ values, label }: { values: readonly number[]; label: string }): ReactElement {
  const last = values.slice(-60);
  const min = Math.min(...last);
  const max = Math.max(...last);
  const span = max - min || 1;
  return (
    <View style={st.chart} accessible accessibilityLabel={label}>
      {last.map((v, i) => (
        <View key={i} style={[st.chartBar, { height: `${8 + ((v - min) / span) * 92}%` }]} />
      ))}
    </View>
  );
}

export const fmt = (value: number | undefined, digits = 3): string => (value === undefined ? "-" : value.toFixed(digits));

export const st = StyleSheet.create({
  screen: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.md },
  card: { backgroundColor: THEME.surface, borderColor: THEME.outline, borderWidth: 1, borderRadius: SIZE.radiusCard, padding: SPACE.lg, gap: SPACE.sm },
  dim: { opacity: 0.6 },
  empty: { alignItems: "center", paddingVertical: SPACE.xxl * 2, paddingHorizontal: SPACE.xl, gap: SPACE.md },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  metric: { backgroundColor: THEME.surfaceVariant, borderRadius: SIZE.radius, padding: SPACE.md, flexBasis: "47%", flexGrow: 1, borderLeftWidth: SPACE.xs, borderLeftColor: "transparent" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACE.md, minHeight: SIZE.touchMin, borderBottomWidth: 1, borderBottomColor: THEME.surfaceVariant },
  listItem: { flexDirection: "row", alignItems: "center", gap: SPACE.lg, minHeight: SIZE.listItemMin + SPACE.sm, paddingVertical: SPACE.sm, paddingHorizontal: SPACE.lg, borderBottomWidth: 1, borderBottomColor: THEME.surfaceVariant },
  liText: { flex: 1, gap: SPACE.xs },
  groupTitle: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.xl, paddingBottom: SPACE.sm },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  btn: { borderRadius: SIZE.radius, borderWidth: 1, borderColor: "transparent", alignSelf: "flex-start", justifyContent: "center", alignItems: "center" },
  btnPrimary: { minHeight: SIZE.buttonPrimary, paddingHorizontal: SPACE.xl },
  btnSecondary: { minHeight: SIZE.buttonSecondary, paddingHorizontal: SPACE.lg },
  badge: { minHeight: SIZE.badge, paddingHorizontal: SPACE.sm, borderRadius: SIZE.badge / 2, justifyContent: "center" },
  segmented: { flexDirection: "row", borderWidth: 1, borderColor: THEME.outline, borderRadius: SIZE.radius, overflow: "hidden" },
  segment: { flex: 1, minHeight: SIZE.touchMin, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACE.xs },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: THEME.outline },
  chart: { height: 112, flexDirection: "row", alignItems: "flex-end", gap: 0, backgroundColor: THEME.surfaceVariant, borderRadius: SIZE.radius, padding: SPACE.sm },
  chartBar: { flex: 1, backgroundColor: THEME.primary, borderRightWidth: 1, borderRightColor: THEME.surfaceVariant },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  inlineToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: SIZE.touchMin },
  banner: { backgroundColor: THEME.warningContainer, borderColor: THEME.band.caution, borderWidth: 1, borderRadius: SIZE.radiusCard, padding: SPACE.md, gap: SPACE.sm },
});
