import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCellInfoCommand, buildDeviceInfoCommand } from "@jk-active-balancer/jk-protocol";
import { MockBleTransport } from "../src/mock-ble-transport";
import { PacketPipeline } from "../src/packet-pipeline";

function loadFixture(relativePath: string): Uint8Array {
  const text = readFileSync(resolve(process.cwd(), "fixtures", "jk-b2a16s", relativePath), "utf8");
  return Uint8Array.from(
    text
      .trim()
      .split(/\s+/)
      .map((token) => Number.parseInt(token, 16)),
  );
}

describe("PacketPipeline", () => {
  it("decodes a device-info frame split into 20-byte fragments", () => {
    const pipeline = new PacketPipeline();
    const frame = loadFixture("device-info/hw3-sw3.3.0.upstream.hex");
    let decoded = null as ReturnType<PacketPipeline["push"]>;
    for (let offset = 0; offset < frame.length; offset += 20) {
      const result = pipeline.push(frame.slice(offset, offset + 20));
      if (result) {
        decoded = result;
      }
    }
    expect(decoded).not.toBeNull();
    expect(decoded?.kind).toBe("device-info");
    if (decoded?.kind === "device-info") {
      expect(decoded.value.vendorId).toBe("JK-B2A16S");
      expect(decoded.value.hardwareVersion).toBe("3.0");
    }
  });

  it("decodes a cell-info frame", () => {
    const decoded = new PacketPipeline().push(loadFixture("status/16s-balanced.upstream.hex"));
    expect(decoded?.kind).toBe("cell-info");
    if (decoded?.kind === "cell-info") {
      expect(decoded.value.activeCells).toBe(16);
    }
  });

  it("drives MockBleTransport end-to-end without hardware", async () => {
    const transport = new MockBleTransport({
      deviceInfoFrames: [loadFixture("device-info/hw3-sw3.3.0.upstream.hex")],
      fragmentSize: 64,
    });
    const pipeline = new PacketPipeline();
    await transport.connect();
    const iterator = transport.notifications()[Symbol.asyncIterator]();
    await transport.write(buildDeviceInfoCommand());

    let decoded = null as ReturnType<PacketPipeline["push"]>;
    for (let i = 0; i < 16 && decoded === null; i += 1) {
      const { value, done } = await iterator.next();
      if (done) {
        break;
      }
      decoded = pipeline.push(value as Uint8Array);
    }

    expect(decoded?.kind).toBe("device-info");
    await transport.disconnect();
  });

  it("records written command frames", async () => {
    const transport = new MockBleTransport();
    await transport.connect();
    await transport.write(buildCellInfoCommand());
    expect(transport.written).toHaveLength(1);
    expect(transport.written[0][4]).toBe(0x96);
  });
});
