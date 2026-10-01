import { describe, expect, it } from "vitest";
import { fromBase64, toBase64 } from "../src/react-native-ble-plx-adapter";

describe("base64 wire helpers", () => {
  it("round-trips a command frame", () => {
    const frame = Uint8Array.from([0xaa, 0x55, 0x90, 0xeb, 0x96, 0x00]);
    expect(Array.from(fromBase64(toBase64(frame)))).toEqual(Array.from(frame));
  });
});
