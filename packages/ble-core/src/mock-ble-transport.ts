import { COMMAND_CELL_INFO, COMMAND_DEVICE_INFO, sum8 } from "@jk-active-balancer/jk-protocol";
import { DisconnectListeners, NotificationQueue, type BleDevice, type BleTransport } from "./interface";

/** Raw frame fixtures keyed by the command that produces them. */
export interface MockScenario {
  readonly devices?: readonly BleDevice[];
  readonly deviceInfoFrames?: readonly Uint8Array[];
  /** Emitted after 0x96, before the cell-info frames (upstream order). */
  readonly settingsFrames?: readonly Uint8Array[];
  readonly cellInfoFrames?: readonly Uint8Array[];
  /** Fragment size used to simulate BLE MTU splitting. Defaults to no split. */
  readonly fragmentSize?: number;
  /**
   * When set, keep streaming the cell-info frames (cycled) at this interval
   * after 0x96, like a real device. Each emission gets a new frame counter so
   * duplicate suppression does not swallow it.
   */
  readonly streamIntervalMs?: number;
  /** Number of initial connect() calls that fail (reconnect tests). */
  readonly connectFailures?: number;
}

/** Return a copy of `frame` with byte 5 (frame counter) set and the checksum fixed. */
export function withFrameCounter(frame: Uint8Array, counter: number): Uint8Array {
  const copy = Uint8Array.from(frame);
  if (copy.length >= 300) {
    copy[5] = counter & 0xff;
    copy[299] = sum8(copy.subarray(0, 299));
  }
  return copy;
}

/**
 * In-memory BLE transport for CI and UI work without hardware (design section
 * 28). Writing 0x97 emits the device-info fixture(s); writing 0x96 emits the
 * settings fixture(s) then the cell-info fixture(s).
 */
export class MockBleTransport implements BleTransport {
  private readonly scenario: MockScenario;
  private readonly queue = new NotificationQueue();
  private readonly disconnects = new DisconnectListeners();
  private connected = false;
  private failuresLeft: number;
  private streamTimer: ReturnType<typeof setInterval> | undefined;
  private counter = 0;
  /** Commands observed on write(), for assertions. */
  readonly written: Uint8Array[] = [];
  /** Number of connect() calls (including failed ones). */
  connectCalls = 0;

  constructor(scenario: MockScenario = {}) {
    this.scenario = scenario;
    this.failuresLeft = scenario.connectFailures ?? 0;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async scan(): Promise<readonly BleDevice[]> {
    return this.scenario.devices ?? [{ id: "mock-jk-b2a16s", name: "JK-B2A16S" }];
  }

  async connect(_deviceId?: string): Promise<void> {
    this.connectCalls += 1;
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new Error("MockBleTransport: simulated connect failure");
    }
    this.queue.reopen();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.stopStream();
    this.connected = false;
    this.queue.close();
  }

  /** Simulate an unexpected link loss (Bluetooth OFF, out of range). */
  simulateDisconnect(): void {
    if (!this.connected) {
      return;
    }
    this.stopStream();
    this.connected = false;
    this.queue.close();
    this.disconnects.emit(new Error("MockBleTransport: simulated link loss"));
  }

  /** Stop answering / streaming without dropping the link (watchdog tests). */
  pauseStream(): void {
    this.stopStream();
  }

  onDisconnect(listener: (error?: Error) => void): () => void {
    return this.disconnects.add(listener);
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new Error("MockBleTransport: write before connect()");
    }
    this.written.push(Uint8Array.from(data));
    if (data[4] === COMMAND_DEVICE_INFO) {
      for (const frame of this.scenario.deviceInfoFrames ?? []) this.enqueue(frame);
    } else if (data[4] === COMMAND_CELL_INFO) {
      for (const frame of this.scenario.settingsFrames ?? []) this.enqueue(this.next(frame));
      for (const frame of this.scenario.cellInfoFrames ?? []) this.enqueue(this.next(frame));
      this.startStream();
    }
  }

  /** Push arbitrary bytes as if notified by the device (corrupt-frame tests). */
  inject(bytes: Uint8Array): void {
    this.queue.push(Uint8Array.from(bytes));
  }

  notifications(): AsyncIterable<Uint8Array> {
    return this.queue.iterable();
  }

  private next(frame: Uint8Array): Uint8Array {
    this.counter = (this.counter + 1) & 0xff;
    return withFrameCounter(frame, this.counter);
  }

  private startStream(): void {
    const interval = this.scenario.streamIntervalMs;
    const frames = this.scenario.cellInfoFrames ?? [];
    if (interval === undefined || frames.length === 0 || this.streamTimer !== undefined) {
      return;
    }
    let i = 0;
    this.streamTimer = setInterval(() => {
      if (!this.connected) return;
      this.enqueue(this.next(frames[i % frames.length]));
      i += 1;
    }, interval);
  }

  private stopStream(): void {
    if (this.streamTimer !== undefined) {
      clearInterval(this.streamTimer);
      this.streamTimer = undefined;
    }
  }

  private enqueue(frame: Uint8Array): void {
    const size = this.scenario.fragmentSize ?? frame.length;
    for (let offset = 0; offset < frame.length; offset += size) {
      this.queue.push(frame.slice(offset, offset + size));
    }
  }
}
