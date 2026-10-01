import { describe, expect, it } from "vitest";
import { COMMAND_FRAME_SIZE } from "../src/jk04/constants";
import { buildCellInfoCommand, buildCommand, buildDeviceInfoCommand } from "../src/jk04/frame-builder";
import { computeCommandChecksum } from "../src/jk04/crc";
import { fromHex, toHex } from "./helpers/fixtures";

// Golden command frames, reproducing upstream `write_register(address, 0, 0)`
// exactly (syssi/esphome-jk-bms@3.0.0, components/jk_bms_ble/jk_bms_ble.cpp).
const DEVICE_INFO_GOLDEN = "AA 55 90 EB 97 00 00 00 00 00 00 00 00 00 00 00 00 00 00 11";
const CELL_INFO_GOLDEN = "AA 55 90 EB 96 00 00 00 00 00 00 00 00 00 00 00 00 00 00 10";

describe("buildCommand", () => {
  it("produces a 20-byte frame", () => {
    expect(buildDeviceInfoCommand()).toHaveLength(COMMAND_FRAME_SIZE);
  });

  it("builds the device-info command byte-for-byte", () => {
    expect(toHex(buildDeviceInfoCommand())).toBe(DEVICE_INFO_GOLDEN);
  });

  it("builds the cell-info command byte-for-byte", () => {
    expect(toHex(buildCellInfoCommand())).toBe(CELL_INFO_GOLDEN);
  });

  it("encodes the value little-endian at offsets 6..9", () => {
    const frame = buildCommand({ register: 0xa1, value: 0x11223344, length: 4 });
    expect(Array.from(frame.slice(6, 10))).toEqual([0x44, 0x33, 0x22, 0x11]);
    expect(frame[5]).toBe(4);
  });

  it("defaults the length byte to 4 when a value is present", () => {
    expect(buildCommand({ register: 0xa1, value: 1 })[5]).toBe(4);
  });

  it("defaults the length byte to 0 when the value is zero", () => {
    expect(buildCommand({ register: 0xa1 })[5]).toBe(0);
  });

  it("places the sum8 checksum in the final byte", () => {
    const frame = buildCommand({ register: 0x97 });
    expect(frame[19]).toBe(computeCommandChecksum(frame));
    expect(frame[19]).toBe(fromHex(DEVICE_INFO_GOLDEN)[19]);
  });

  it("starts with the command preamble AA 55 90 EB", () => {
    expect(Array.from(buildDeviceInfoCommand().slice(0, 4))).toEqual([0xaa, 0x55, 0x90, 0xeb]);
  });
});
