import { toHex } from "@jk-active-balancer/jk-protocol";

/** One raw packet log line (design section 29). */
export interface PacketLogEntry {
  /** ISO-8601 timestamp. */
  readonly timestamp: string;
  /** TX = command written, RX = notification fragment, FRAME = assembled frame. */
  readonly direction: "TX" | "RX" | "FRAME";
  readonly hex: string;
  /** Assembled frame type name (FRAME entries). */
  readonly frame?: string;
  /** Short decode summary (FRAME entries). */
  readonly decoded?: string;
  readonly error?: string;
}

export interface RawPacketLoggerOptions {
  /** Production default is OFF (design section 29). */
  readonly enabled?: boolean;
  /** Ring-buffer size. Defaults to 1000 entries. */
  readonly maxEntries?: number;
  readonly now?: () => number;
}

/** Bounded, opt-in raw packet logger for diagnostics. */
export class RawPacketLogger {
  enabled: boolean;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly items: PacketLogEntry[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(options: RawPacketLoggerOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.maxEntries = options.maxEntries ?? 1000;
    this.now = options.now ?? Date.now;
  }

  get entries(): readonly PacketLogEntry[] {
    return this.items;
  }

  log(
    direction: PacketLogEntry["direction"],
    bytes: Uint8Array,
    extra: { frame?: string; decoded?: string; error?: string } = {},
  ): void {
    if (!this.enabled) {
      return;
    }
    this.items.push({ timestamp: new Date(this.now()).toISOString(), direction, hex: toHex(bytes), ...extra });
    if (this.items.length > this.maxEntries) {
      this.items.splice(0, this.items.length - this.maxEntries);
    }
    for (const listener of this.listeners) {
      listener();
    }
  }

  clear(): void {
    this.items.length = 0;
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Plain-text dump in the design section 29 layout. */
  toText(): string {
    return this.items
      .map((entry) => {
        const lines = [`${entry.timestamp} ${entry.direction}`, entry.hex];
        if (entry.frame) lines.push(`FRAME=${entry.frame}`);
        if (entry.decoded) lines.push(entry.decoded);
        if (entry.error) lines.push(`ERROR=${entry.error}`);
        return lines.join("\n");
      })
      .join("\n\n");
  }
}
