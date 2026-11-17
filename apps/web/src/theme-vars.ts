import { SIZE, SPACE, THEME, TYPE } from "@jk-active-balancer/ui-common";

/**
 * Publish the shared design tokens as CSS custom properties, so styles.css
 * references the same values as the mobile app (wiki standard 5.7.6: names
 * and values shared across platforms) instead of a second copy.
 */
export function applyThemeVars(root: HTMLElement = document.documentElement): void {
  const set = (name: string, value: string): void => root.style.setProperty(name, value);
  const kebab = (s: string): string => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  for (const [k, v] of Object.entries(THEME)) {
    if (typeof v === "string") set(`--c-${kebab(k)}`, v);
  }
  for (const [k, v] of Object.entries(THEME.band)) set(`--c-band-${k}`, v);
  for (const [k, v] of Object.entries(THEME.onBand)) set(`--c-on-band-${k}`, v);
  for (const [k, v] of Object.entries(TYPE)) {
    set(`--fs-${k}`, `${v.size}px`);
    set(`--lh-${k}`, `${v.lineHeight}px`);
  }
  for (const [k, v] of Object.entries(SPACE)) set(`--sp-${k}`, `${v}px`);
  for (const [k, v] of Object.entries(SIZE)) set(`--size-${kebab(k)}`, `${v}px`);
}
