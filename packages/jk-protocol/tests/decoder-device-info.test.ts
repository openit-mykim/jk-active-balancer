import { describe, expect, it } from "vitest";
import { decodeDeviceInfo, isDeviceInfoFrame } from "../src/jk04/decoder-device-info";
import { loadFixture } from "./helpers/fixtures";

const DEVICE_INFO = loadFixture("device-info/hw3-sw3.3.0.upstream.hex");
const CELL_INFO = loadFixture("status/16s-balanced.upstream.hex");

describe("decodeDeviceInfo", () => {
  it("decodes the real upstream JK-B2A16S device-info frame", () => {
    const info = decodeDeviceInfo(DEVICE_INFO);
    expect(info.vendorId).toBe("JK-B2A16S");
    expect(info.hardwareVersion).toBe("3.0");
    expect(info.softwareVersion).toBe("3.3.0");
    expect(info.deviceName).toBe("BMS");
    expect(info.devicePasscode).toBe("1234");
    expect(info.uptimeSeconds).toBe(36867600);
    expect(info.powerOnCount).toBe(19);
    // The example device reports no manufacturing date or serial number.
    expect(info.manufacturingDate).toBe("");
    expect(info.serialNumber).toBe("");
  });

  it("recognises a device-info frame by header and type", () => {
    expect(isDeviceInfoFrame(DEVICE_INFO)).toBe(true);
  });

  it("rejects a cell-info frame", () => {
    expect(isDeviceInfoFrame(CELL_INFO)).toBe(false);
    expect(() => decodeDeviceInfo(CELL_INFO)).toThrow(/device-info/);
  });

  it("rejects a frame that is too short", () => {
    expect(isDeviceInfoFrame(DEVICE_INFO.slice(0, 3))).toBe(false);
    expect(() => decodeDeviceInfo(DEVICE_INFO.slice(0, 3))).toThrow();
  });
});
