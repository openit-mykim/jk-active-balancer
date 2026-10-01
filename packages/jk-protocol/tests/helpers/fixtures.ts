import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_ROOT = resolve(process.cwd(), "fixtures", "jk-b2a16s");

/** Load a whitespace-separated hex fixture (see fixtures/jk-b2a16s/README.md). */
export function loadFixture(relativePath: string): Uint8Array {
  const text = readFileSync(resolve(FIXTURE_ROOT, relativePath), "utf8");
  const bytes = text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => Number.parseInt(token, 16));
  return Uint8Array.from(bytes);
}

/** Parse an inline "AA 55 90 EB" hex string. */
export function fromHex(hex: string): Uint8Array {
  const bytes = hex
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => Number.parseInt(token, 16));
  return Uint8Array.from(bytes);
}

/** Format bytes as upper-case space-separated hex. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}
