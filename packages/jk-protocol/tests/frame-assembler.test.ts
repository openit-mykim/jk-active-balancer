import { describe, expect, it } from "vitest";
import { FrameAssembler } from "../src/jk04/frame-assembler";
import { toHex, loadFixture } from "./helpers/fixtures";

const DEVICE_INFO = loadFixture("device-info/hw3-sw3.3.0.upstream.hex");

describe("FrameAssembler", () => {
  it("emits a complete frame delivered in a single notification", () => {
    const frame = new FrameAssembler().push(DEVICE_INFO);
    expect(frame).not.toBeNull();
    expect(toHex(frame as Uint8Array)).toBe(toHex(DEVICE_INFO));
  });

  it("reassembles a frame split across three fragments", () => {
    const assembler = new FrameAssembler();
    expect(assembler.push(DEVICE_INFO.slice(0, 100))).toBeNull();
    expect(assembler.push(DEVICE_INFO.slice(100, 200))).toBeNull();
    const frame = assembler.push(DEVICE_INFO.slice(200));
    expect(frame).not.toBeNull();
    expect(toHex(frame as Uint8Array)).toBe(toHex(DEVICE_INFO));
  });

  it("keeps a sub-MIN_RESPONSE_SIZE buffer pending instead of emitting", () => {
    const assembler = new FrameAssembler();
    expect(assembler.push(DEVICE_INFO.slice(0, 299))).toBeNull();
    expect(assembler.bufferedBytes).toBe(299);
    const frame = assembler.push(DEVICE_INFO.slice(299));
    expect(frame).not.toBeNull();
  });

  it("drops a consecutive duplicate notification by default", () => {
    const assembler = new FrameAssembler();
    expect(assembler.push(DEVICE_INFO)).not.toBeNull();
    expect(assembler.push(DEVICE_INFO)).toBeNull();
  });

  it("emits duplicates when duplicate suppression is disabled (upstream parity)", () => {
    const assembler = new FrameAssembler({ dropConsecutiveDuplicates: false });
    expect(assembler.push(DEVICE_INFO)).not.toBeNull();
    expect(assembler.push(DEVICE_INFO)).not.toBeNull();
  });

  it("recovers from an out-of-order fragment via the preamble flush", () => {
    const assembler = new FrameAssembler();
    // A stray tail arrives first and cannot form a frame.
    expect(assembler.push(DEVICE_INFO.slice(290))).toBeNull();
    // The next fragment starts with the response header, so the buffer flushes
    // and a clean frame is assembled.
    const frame = assembler.push(DEVICE_INFO);
    expect(frame).not.toBeNull();
    expect(toHex(frame as Uint8Array)).toBe(toHex(DEVICE_INFO));
  });

  it("never emits a truncated frame", () => {
    expect(new FrameAssembler().push(loadFixture("malformed/truncated.synthetic.hex"))).toBeNull();
  });

  it("rejects a frame whose header byte is corrupted", () => {
    expect(new FrameAssembler().push(loadFixture("malformed/bad-header.synthetic.hex"))).toBeNull();
  });

  it("rejects a frame whose checksum is wrong and clears the buffer", () => {
    const assembler = new FrameAssembler();
    expect(assembler.push(loadFixture("malformed/bad-checksum.synthetic.hex"))).toBeNull();
    expect(assembler.bufferedBytes).toBe(0);
  });

  it("survives an oversized buffer and still assembles the next valid frame", () => {
    const assembler = new FrameAssembler();
    const garbage = new Uint8Array(500).fill(0x11);
    expect(assembler.push(garbage)).toBeNull();
    const frame = assembler.push(DEVICE_INFO);
    expect(frame).not.toBeNull();
  });

  it("reset() clears buffered bytes", () => {
    const assembler = new FrameAssembler();
    assembler.push(DEVICE_INFO.slice(0, 50));
    assembler.reset();
    expect(assembler.bufferedBytes).toBe(0);
  });
});
