import { FRAME_TYPE_DEVICE_INFO, RESPONSE_HEADER } from "./constants";

/**
 * Decoded JK04 device-info frame (response frame type 0x03).
 *
 * Field offsets are taken from the field-validated JK04/JK-B2A16S example in
 * `syssi/esphome-jk-bms` (tag 3.0.0). This frame is verified in
 * fixtures/jk-b2a16s/device-info/hw3-sw3.3.0.upstream.hex.
 */
export interface JkDeviceInfo {
  /** Vendor / model string, e.g. "JK-B2A16S". */
  readonly vendorId: string;
  /** Hardware version string, e.g. "3.0". */
  readonly hardwareVersion: string;
  /** Software version string, e.g. "3.3.0". */
  readonly softwareVersion: string;
  /** Uptime in seconds (uint32 LE at offset 38). */
  readonly uptimeSeconds: number;
  /** Power-on count (uint32 LE at offset 42). */
  readonly powerOnCount: number;
  /** Device name, e.g. "BMS". */
  readonly deviceName: string;
  /** Device passcode as reported by the fixture (NOT a universal default). */
  readonly devicePasscode: string;
  /** Manufacturing date string, empty when the device does not report one. */
  readonly manufacturingDate: string;
  /** Serial number string, empty when the device does not report one. */
  readonly serialNumber: string;
  /** User data string. */
  readonly userData: string;
}

const OFFSETS = {
  vendorId: 6,
  hardwareVersion: 22,
  softwareVersion: 30,
  uptimeSeconds: 38,
  powerOnCount: 42,
  deviceName: 46,
  devicePasscode: 62,
  manufacturingDate: 78,
  serialNumber: 86,
  userData: 102,
} as const;

function readCString(frame: Uint8Array, offset: number, maxLength: number): string {
  let end = offset;
  const limit = Math.min(offset + maxLength, frame.length);
  while (end < limit && frame[end] !== 0x00) {
    end += 1;
  }
  let out = "";
  for (let i = offset; i < end; i += 1) {
    out += String.fromCharCode(frame[i]);
  }
  return out;
}

function readUint32LE(frame: Uint8Array, offset: number): number {
  const view = new DataView(frame.buffer, frame.byteOffset + offset, 4);
  return view.getUint32(0, true);
}

/** True when `frame` is a complete JK04 device-info frame (header + type 0x03). */
export function isDeviceInfoFrame(frame: Uint8Array): boolean {
  return (
    frame.length >= 5 &&
    frame[0] === RESPONSE_HEADER[0] &&
    frame[1] === RESPONSE_HEADER[1] &&
    frame[2] === RESPONSE_HEADER[2] &&
    frame[3] === RESPONSE_HEADER[3] &&
    frame[4] === FRAME_TYPE_DEVICE_INFO
  );
}

/**
 * Decode a JK04 device-info frame.
 *
 * @throws Error when the frame is not a device-info frame.
 */
export function decodeDeviceInfo(frame: Uint8Array): JkDeviceInfo {
  if (!isDeviceInfoFrame(frame)) {
    throw new Error("decodeDeviceInfo: not a JK04 device-info frame (expected 55 AA EB 90 03)");
  }
  return {
    vendorId: readCString(frame, OFFSETS.vendorId, 16),
    hardwareVersion: readCString(frame, OFFSETS.hardwareVersion, 8),
    softwareVersion: readCString(frame, OFFSETS.softwareVersion, 8),
    uptimeSeconds: readUint32LE(frame, OFFSETS.uptimeSeconds),
    powerOnCount: readUint32LE(frame, OFFSETS.powerOnCount),
    deviceName: readCString(frame, OFFSETS.deviceName, 16),
    devicePasscode: readCString(frame, OFFSETS.devicePasscode, 16),
    manufacturingDate: readCString(frame, OFFSETS.manufacturingDate, 8),
    serialNumber: readCString(frame, OFFSETS.serialNumber, 11),
    userData: readCString(frame, OFFSETS.userData, 16),
  };
}
