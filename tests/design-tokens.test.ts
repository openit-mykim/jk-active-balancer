import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ALLOWED_FONT_SIZES, ALLOWED_SPACING, SIZE, SPACE, THEME, TYPE, contrastRatio } from "../packages/ui-common/src/index";

/**
 * Wiki "모바일 앱 개발 표준" 5.7: sizes outside the tables are rejected by an
 * automatic check, colours are referenced by role, contrast meets WCAG AA.
 */
const ROOT = process.cwd();

/** Split a CSS value on top-level whitespace (keeps calc(...) / var(...) whole). */
function cssParts(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value.trim()) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

function files(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full, ext));
    else if (ext.test(name)) out.push(full);
  }
  return out;
}

describe("design tokens", () => {
  it("type scale and spacing use only the standard values", () => {
    for (const t of Object.values(TYPE)) {
      expect(ALLOWED_FONT_SIZES).toContain(t.size);
      expect(t.lineHeight / t.size).toBeGreaterThanOrEqual(1.4);
      expect(t.lineHeight / t.size).toBeLessThanOrEqual(1.6);
    }
    for (const v of Object.values(SPACE)) expect(ALLOWED_SPACING).toContain(v);
    expect(SIZE.touchMin).toBeGreaterThanOrEqual(48);
    expect(SIZE.appBar).toBe(56);
    expect(SIZE.tabBar).toBe(56);
  });

  it("text / background pairs meet WCAG AA (4.5:1)", () => {
    const pairs: Array<[string, string, string]> = [
      ["onSurface/background", THEME.onSurface, THEME.background],
      ["onSurface/surface", THEME.onSurface, THEME.surface],
      ["onSurfaceMuted/surface", THEME.onSurfaceMuted, THEME.surface],
      ["onSurfaceMuted/surfaceVariant", THEME.onSurfaceMuted, THEME.surfaceVariant],
      ["onSurfaceVariant/bottomBar", THEME.onSurfaceVariant, THEME.bottomBar],
      ["primary/surface", THEME.primary, THEME.surface],
      ["primary/bottomBar", THEME.primary, THEME.bottomBar],
      ["onAppBar/appBar", THEME.onAppBar, THEME.appBar],
      ["onPrimary/primary", THEME.onPrimary, THEME.primary],
      ["error/surface", THEME.error, THEME.surface],
      ["onWarningContainer/warningContainer", THEME.onWarningContainer, THEME.warningContainer],
      ["band normal", THEME.onBand.normal, THEME.band.normal],
      ["band caution", THEME.onBand.caution, THEME.band.caution],
      ["band danger", THEME.onBand.danger, THEME.band.danger],
    ];
    for (const [name, fg, bg] of pairs) {
      expect(contrastRatio(fg, bg), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("no literal sizes or colours in app code (5.7.2 automatic check)", () => {
  const mobile = files(resolve(ROOT, "apps/mobile/src"), /\.tsx?$/).filter((f) => !f.endsWith("fixtures.generated.ts"));
  const webTsx = files(resolve(ROOT, "apps/web/src"), /\.tsx?$/);

  it("mobile: no numeric fontSize, no hex colour, spacing only from the scale", () => {
    for (const file of mobile) {
      const src = readFileSync(file, "utf8");
      expect(src.match(/fontSize:\s*\d/g), `${file}: literal fontSize`).toBeNull();
      expect(src.match(/["']#[0-9a-fA-F]{3,8}["']/g), `${file}: hex colour`).toBeNull();
      for (const m of src.matchAll(/\b(?:padding|margin|gap)(?:Horizontal|Vertical|Top|Bottom|Left|Right)?:\s*(-?\d+)\b/g)) {
        expect(ALLOWED_SPACING, `${file}: spacing ${m[0]}`).toContain(Number(m[1]));
      }
    }
  });

  it("web: CSS uses token variables for font size, spacing and colour", () => {
    const css = readFileSync(resolve(ROOT, "apps/web/src/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/font-size:\s*([^;]+);/g)) {
      expect(m[1].trim(), "font-size must be a --fs token").toMatch(/^var\(--fs-[a-z]+\)$/);
    }
    for (const m of css.matchAll(/\b(?:padding|margin|gap)(?:-[a-z]+)?:\s*([^;]+);/g)) {
      for (const part of cssParts(m[1])) {
        expect(part, `spacing "${m[0]}"`).toMatch(/^(0|auto|var\(--(sp|size)-[a-z-]+\)|calc\(.+\)|max\(.+\))$/);
      }
    }
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g), "hex colour in CSS").toBeNull();
  });

  it("web: no hex colour literals in components", () => {
    for (const file of webTsx) {
      expect(readFileSync(file, "utf8").match(/["']#[0-9a-fA-F]{3,8}["']/g), file).toBeNull();
    }
  });
});

describe("app version has one source (wiki standard 0 / 7)", () => {
  it("Android reads package.json and iOS matches it", () => {
    const { version } = JSON.parse(readFileSync(resolve(ROOT, "apps/mobile/package.json"), "utf8")) as { version: string };
    const gradle = readFileSync(resolve(ROOT, "apps/mobile/android/app/build.gradle"), "utf8");
    expect(gradle).toMatch(/JsonSlurper\(\)\.parse\(file\("\.\.\/\.\.\/package\.json"\)\)/);
    expect(gradle).toMatch(/versionName appVersionName/);
    const pbx = readFileSync(resolve(ROOT, "apps/mobile/ios/jkActiveBalancer.xcodeproj/project.pbxproj"), "utf8");
    for (const m of pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)) expect(m[1]).toBe(version);
  });
});
