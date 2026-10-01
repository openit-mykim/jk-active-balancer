import { COMMAND_CELL_INFO, COMMAND_DEVICE_INFO } from "@jk-active-balancer/jk-protocol";
import type { BleDevice, BleTransport } from "./interface";

/** Raw frame fixtures keyed by the command that produces them. */
export interface MockScenario {
  readonly devices?: readonly BleDevice[];
  readonly deviceInfoFrames?: readonly Uint8Array[];
  readonly cellInfoFrames?: readonly Uint8Array[];
  /** Fragment size used to simulate BLE MTU splitting. Defaults to no split. */
  readonly fragmentSize?: number;
}

/**
 * In-memory BLE transport for CI and UI work without hardware (design section
 * 28). Writing 0x97 emits the device-info fixture(s); writing 0x96 emits the
 * cell-info fixture(s).
 */
export class MockBleTransport implements BleTransport {
  private readonly scenario: MockScenario;
  private readonly queue: Uint8Array[] = [];
  private readonly waiters: Array<(value: IteratorResult<Uint8Array>) => void> = [];
  private closed = false;
  private connected = false;
  /** Commands observed on write(), for assertions. */
  readonly written: Uint8Array[] = [];

  constructor(scenario: MockScenario = {}) {
    this.scenario = scenario;
  }

  async scan(): Promise<readonly BleDevice[]> {
    return this.scenario.devices ?? [{ id: "mock-jk-b2a16s", name: "JK-B2A16S" }];
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.closed = true;
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new Error("MockBleTransport: write before connect()");
    }
    this.written.push(Uint8Array.from(data));
    const frames =
      data[4] === COMMAND_DEVICE_INFO
        ? this.scenario.deviceInfoFrames
        : data[4] === COMMAND_CELL_INFO
          ? this.scenario.cellInfoFrames
          : undefined;
    for (const frame of frames ?? []) {
      this.enqueue(frame);
    }
  }

  private enqueue(frame: Uint8Array): void {
    const size = this.scenario.fragmentSize ?? frame.length;
    for (let offset = 0; offset < frame.length; offset += size) {
      this.deliver(frame.slice(offset, offset + size));
    }
  }

  private deliver(fragment: Uint8Array): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: fragment, done: false });
    } else {
      this.queue.push(fragment);
    }
  }

  notifications(): AsyncIterable<Uint8Array> {
    const next = (): Promise<IteratorResult<Uint8Array>> => {
      const queued = this.queue.shift();
      if (queued) {
        return Promise.resolve({ value: queued, done: false });
      }
      if (this.closed) {
        return Promise.resolve({ value: undefined, done: true });
      }
      return new Promise((resolve) => this.waiters.push(resolve));
    };
    const iterator: AsyncIterator<Uint8Array> = { next };
    return { [Symbol.asyncIterator]: () => iterator };
  }
}
