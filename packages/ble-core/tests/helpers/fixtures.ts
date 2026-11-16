import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseHex } from "@jk-active-balancer/jk-protocol";

export function loadFixture(relativePath: string): Uint8Array {
  return parseHex(readFileSync(resolve(process.cwd(), "fixtures", "jk-b2a16s", relativePath), "utf8"));
}

export const DEVICE_INFO = loadFixture("device-info/hw3-sw3.3.0.upstream.hex");
export const SETTINGS = loadFixture("settings/default.upstream.hex");
export const BALANCED = loadFixture("status/16s-balanced.upstream.hex");
export const UNBALANCED = loadFixture("status/16s-unbalanced.synthetic.hex");
export const BAD_CHECKSUM = loadFixture("malformed/bad-checksum.synthetic.hex");
