/** A discovered BLE peripheral. */
export interface BleDevice {
  /** Stable, platform-scoped identifier (never assume a MAC address). */
  readonly id: string;
  /** Advertised name, when present. */
  readonly name?: string;
  /** Signal strength in dBm, when the platform reports it. */
  readonly rssi?: number;
}

/**
 * Transport abstraction (design section 28). Implemented by the Web Bluetooth
 * and react-native-ble-plx adapters, and by {@link MockBleTransport}.
 *
 * Contract:
 * - `connect()` performs GATT discovery and subscribes to FFE1 notifications;
 *   it may be called again after a disconnect (reconnect).
 * - `notifications()` yields the fragments of the current connection and
 *   completes when that connection ends.
 * - `onDisconnect()` fires when the link drops without `disconnect()` being
 *   called (out of range, Bluetooth OFF, device reset).
 */
export interface BleTransport {
  scan(): Promise<readonly BleDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  /** Write a command frame to the FFE1 characteristic. */
  write(data: Uint8Array): Promise<void>;
  /** Notification fragments streamed from FFE1. */
  notifications(): AsyncIterable<Uint8Array>;
  /** Register an unexpected-disconnect listener; returns an unsubscribe function. */
  onDisconnect(listener: (error?: Error) => void): () => void;
}

/**
 * Single-consumer async queue used by transports to turn callback-style
 * notifications into an `AsyncIterable`. `close()` ends the current iteration;
 * `reopen()` starts a fresh one (reconnect).
 */
export class NotificationQueue {
  private queue: Uint8Array[] = [];
  private waiters: Array<(value: IteratorResult<Uint8Array>) => void> = [];
  private closed = false;

  push(fragment: Uint8Array): void {
    if (this.closed) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: fragment, done: false });
    } else {
      this.queue.push(fragment);
    }
  }

  close(): void {
    this.closed = true;
    this.queue = [];
    for (const waiter of this.waiters.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  reopen(): void {
    this.close();
    this.closed = false;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  iterable(): AsyncIterable<Uint8Array> {
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
    return { [Symbol.asyncIterator]: () => ({ next }) };
  }
}

/** Small listener registry shared by transports. */
export class DisconnectListeners {
  private readonly listeners = new Set<(error?: Error) => void>();

  add(listener: (error?: Error) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(error?: Error): void {
    for (const listener of this.listeners) {
      listener(error);
    }
  }
}
