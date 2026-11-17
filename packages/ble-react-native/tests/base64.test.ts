import { describe, expect, it } from "vitest";
import { fromBase64, toBase64 } from "../src/react-native-ble-plx-adapter";

describe("base64 wire helpers", () => {
  it("round-trips a command frame", () => {
    const frame = Uint8Array.from([0xaa, 0x55, 0x90, 0xeb, 0x96, 0x00]);
    expect(Array.from(fromBase64(toBase64(frame)))).toEqual(Array.from(frame));
  });
});

describe("base64 without btoa/atob", () => {
  it("matches Node's encoder for every length remainder", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 20, 300]) {
      const bytes = Uint8Array.from({ length }, (_v, i) => (i * 37 + 11) & 0xff);
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
      expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
    }
  });
});
