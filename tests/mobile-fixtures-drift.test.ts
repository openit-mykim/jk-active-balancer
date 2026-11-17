import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Read as text: importing from apps/mobile would make Vite load its tsconfig,
// which extends a package only present after `npm ci` in apps/mobile.
const generated = readFileSync(resolve(process.cwd(), "apps/mobile/src/fixtures.generated.ts"), "utf8");
const value = (key: string): string | undefined => new RegExp(`\\b${key}: "([0-9A-F ]+)"`).exec(generated)?.[1];
const read = (file: string): string =>
  readFileSync(resolve(process.cwd(), "fixtures", "jk-b2a16s", file), "utf8").trim().split(/\s+/).join(" ");

describe("apps/mobile generated fixtures", () => {
  it("match fixtures/jk-b2a16s (run `npm run gen:fixtures` in apps/mobile if this fails)", () => {
    expect(value("deviceInfo")).toBe(read("device-info/hw3-sw3.3.0.upstream.hex"));
    expect(value("settings")).toBe(read("settings/default.upstream.hex"));
    expect(value("balanced")).toBe(read("status/16s-balanced.upstream.hex"));
    expect(value("unbalanced")).toBe(read("status/16s-unbalanced.synthetic.hex"));
  });
});
