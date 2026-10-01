import { describe, expect, it } from "vitest";
import {
  CHARACTERISTIC_UUID,
  COMMAND_CELL_INFO,
  COMMAND_DEVICE_INFO,
  FRAME_TYPE_CELL_INFO,
  FRAME_TYPE_DEVICE_INFO,
  FRAME_TYPE_NAMES,
  FRAME_TYPE_SETTINGS,
  MAX_RESPONSE_SIZE,
  MIN_RESPONSE_SIZE,
  RESPONSE_FRAME_SIZE,
  SERVICE_SHORT_UUID,
  SERVICE_UUID,
} from "../src/jk04/constants";

describe("JK04 constants", () => {
  it("exposes the JK-B2A16S GATT UUIDs", () => {
    expect(SERVICE_UUID).toBe("0000FFE0-0000-1000-8000-00805F9B34FB");
    expect(CHARACTERISTIC_UUID).toBe("0000FFE1-0000-1000-8000-00805F9B34FB");
    expect(SERVICE_SHORT_UUID).toBe(0xffe0);
  });

  it("defines the command and frame-type bytes", () => {
    expect(COMMAND_DEVICE_INFO).toBe(0x97);
    expect(COMMAND_CELL_INFO).toBe(0x96);
    expect(FRAME_TYPE_SETTINGS).toBe(0x01);
    expect(FRAME_TYPE_CELL_INFO).toBe(0x02);
    expect(FRAME_TYPE_DEVICE_INFO).toBe(0x03);
  });

  it("matches the upstream response-size window", () => {
    expect(MIN_RESPONSE_SIZE).toBe(300);
    expect(MAX_RESPONSE_SIZE).toBe(400);
    expect(RESPONSE_FRAME_SIZE).toBe(300);
  });

  it("names the frame types", () => {
    expect(FRAME_TYPE_NAMES[FRAME_TYPE_DEVICE_INFO]).toBe("DEVICE_INFO");
    expect(FRAME_TYPE_NAMES[FRAME_TYPE_CELL_INFO]).toBe("CELL_INFO");
    expect(FRAME_TYPE_NAMES[FRAME_TYPE_SETTINGS]).toBe("SETTINGS");
  });
});
