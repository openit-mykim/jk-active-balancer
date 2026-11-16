/**
 * Design tokens - the single definition both apps reference (wiki
 * "모바일 앱 개발 표준" 5.5 / 5.7). Values outside these tables are rejected by
 * tests/design-tokens.test.ts (5.7.2: "표 밖 크기 사용은 자동 검사로 막는다").
 */

/** 5.7.2 type scale (sp / px). lineHeight = 1.4-1.6x, Korean letterSpacing 0. */
export const TYPE = {
  display: { size: 28, lineHeight: 40 },
  title: { size: 22, lineHeight: 32 },
  heading: { size: 18, lineHeight: 26 },
  body: { size: 16, lineHeight: 24 },
  label: { size: 14, lineHeight: 20 },
  caption: { size: 12, lineHeight: 18 },
  micro: { size: 11, lineHeight: 16 },
} as const;
export type TypeRole = keyof typeof TYPE;
export const ALLOWED_FONT_SIZES: readonly number[] = [11, 12, 14, 16, 18, 22, 28];

/** 5.7.6 spacing - multiples of 4 only; screen side margin is 16. */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const ALLOWED_SPACING: readonly number[] = [0, 4, 8, 12, 16, 24, 32];
export const SCREEN_MARGIN = SPACE.lg;

/** 5.7.7 component sizes (dp / px). */
export const SIZE = {
  appBar: 56,
  tabBar: 56,
  listItemMin: 56,
  buttonPrimary: 52,
  buttonSecondary: 44,
  touchMin: 48,
  input: 52,
  badge: 24,
  chip: 32,
  /** Icon box (not typography). */
  icon: 24,
  /** Empty-state illustration box (not typography). */
  illustration: 72,
  radius: 8,
  radiusCard: 12,
} as const;

/** Maximum OS font scale for fixed-size controls (5.7.2 Dynamic Type). */
export const MAX_FONT_SCALE_FIXED = 1.3;
