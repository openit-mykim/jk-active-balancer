/**
 * Colour roles (wiki standard 5.7.6: components reference roles, never hex).
 * Values follow jbd-bms-manager so both apps read as one family: dark
 * surfaces, a light-blue app bar, green / orange / red bands
 * (`res/values/cell_band_colors.xml`). Background is #121212, not #000.
 * Contrast (WCAG AA) is checked in tests/design-tokens.test.ts.
 */
export const THEME = {
  background: "#121212",
  surface: "#1e1f22",
  surfaceVariant: "#2a2c30",
  outline: "#3a3d42",
  appBar: "#8ab4f8",
  onAppBar: "#0b1a33",
  bottomBar: "#303134",
  primary: "#8ab4f8",
  onPrimary: "#0b1a33",
  primaryContainer: "#1e3a5f",
  secondaryContainer: "#33415c",
  onSurface: "#e8eaed",
  onSurfaceMuted: "#9aa0a6",
  onSurfaceVariant: "#bdc1c6",
  error: "#ff8a80",
  warningContainer: "#3b2a12",
  onWarningContainer: "#ffcc80",
  switchTrackOff: "#5f6368",
  logText: "#9fb3cf",
  band: {
    normal: "#2e7d32",
    caution: "#ef6c00",
    danger: "#c62828",
  },
  /** Text colour on top of each band (caution needs dark text for 4.5:1). */
  onBand: {
    normal: "#ffffff",
    caution: "#1a1a1a",
    danger: "#ffffff",
  },
} as const;

export type Band = keyof typeof THEME.band;

/** WCAG relative-luminance contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string): number => {
    const v = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = v.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
