/**
 * Colours taken from jbd-bms-manager so both apps look like one family:
 * dark surfaces, a light-blue app bar, and the green / orange / red bands
 * (`res/values/cell_band_colors.xml`, `soc_band_colors.xml`).
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
  onSurface: "#e8eaed",
  onSurfaceMuted: "#9aa0a6",
  band: {
    normal: "#2e7d32",
    caution: "#ef6c00",
    danger: "#c62828",
  },
} as const;

export type Band = keyof typeof THEME.band;
