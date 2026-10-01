import { describe, expect, it } from "vitest";
import { computeCommandChecksum, sum8, verifyFrameChecksum } from "../src/jk04/crc";
import { buildDeviceInfoCommand } from "../src/jk04/frame-builder";
import { fromHex, loadFixture } from "./helpers/fixtures";

describe("sum8", () => {
  it("adds bytes without wrapping below 256", () => {
    expect(sum8([0xaa, 0x55])).toBe(0xff);
  });

  it("wraps modulo 256", () => {
    expect(sum8([0xff, 0x02])).toBe(0x01);
  });

  it("returns 0 for an empty input", () => {
    expect(sum8([])).toBe(0);
  });
});

describe("command checksum", () => {
  it("matches the upstream sum8 for the device-info command (0x97)", () => {
    expect(computeCommandChecksum(buildDeviceInfoCommand())).toBe(0x11);
  });

  it("matches the upstream sum8 for the cell-info command (0x96)", () => {
    const frame = fromHex("AA 55 90 EB 96 00 00 00 00 00 00 00 00 00 00 00 00 00 00 10");
    expect(computeCommandChecksum(frame)).toBe(0x10);
  });
});

describe("verifyFrameChecksum", () => {
  it("accepts the real upstream device-info frame", () => {
    expect(verifyFrameChecksum(loadFixture("device-info/hw3-sw3.3.0.upstream.hex"))).toBe(true);
  });

  it("rejects a frame with a corrupted trailing byte", () => {
    expect(verifyFrameChecksum(loadFixture("malformed/bad-checksum.synthetic.hex"))).toBe(false);
  });

  it("rejects inputs shorter than two bytes", () => {
    expect(verifyFrameChecksum(Uint8Array.from([0x01]))).toBe(false);
  });
});
