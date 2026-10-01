import { describe, expect, it } from "vitest";
import { WebBluetoothAdapter, WebBluetoothUnsupportedError } from "../src/web-bluetooth-adapter";

describe("WebBluetoothAdapter", () => {
  it("reports support from the presence of navigator.bluetooth", () => {
    // Node has no navigator.bluetooth, so the adapter must report unsupported.
    expect(WebBluetoothAdapter.isSupported()).toBe(false);
  });

  it("throws WebBluetoothUnsupportedError when scanning without the API", async () => {
    await expect(new WebBluetoothAdapter().scan()).rejects.toBeInstanceOf(WebBluetoothUnsupportedError);
  });

  it("refuses to write before connecting", async () => {
    await expect(new WebBluetoothAdapter().write(Uint8Array.from([0xaa]))).rejects.toThrow(/before connect/);
  });
});
