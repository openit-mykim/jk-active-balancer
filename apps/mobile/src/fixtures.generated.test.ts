import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_HEX } from "./fixtures.generated";

const read = (file: string): string =>
  readFileSync(resolve(process.cwd(), "fixtures", "jk-b2a16s", file), "utf8").trim().split(/\s+/).join(" ");

describe("apps/mobile generated fixtures", () => {
  it("match fixtures/jk-b2a16s (run `npm run gen:fixtures` in apps/mobile if this fails)", () => {
    expect(FIXTURE_HEX.deviceInfo).toBe(read("device-info/hw3-sw3.3.0.upstream.hex"));
    expect(FIXTURE_HEX.settings).toBe(read("settings/default.upstream.hex"));
    expect(FIXTURE_HEX.balanced).toBe(read("status/16s-balanced.upstream.hex"));
    expect(FIXTURE_HEX.unbalanced).toBe(read("status/16s-unbalanced.synthetic.hex"));
  });
});
