import {
  toHex,
  buildCellInfoCommand,
  buildDeviceInfoCommand,
  createSettingsWriter,
  resolveProfile,
  type JkCellInfo,
  type JkDeviceInfo,
  type JkSettings,
  type JkSettingsWriter,
  type DeviceIdentity,
  type ProfileResolution,
} from "@jk-active-balancer/jk-protocol";
import { ConnectionStateMachine, type ConnectionState } from "./connection-manager";
import type { BleDevice, BleTransport } from "./interface";
import { RawPacketLogger } from "./packet-logger";
import { PacketPipeline, frameTypeName, type DecodedFrame } from "./packet-pipeline";
import { reconnectDelayMs } from "./reconnect-policy";
import { STALLED_AFTER_MS, classifyFreshness, type Freshness } from "./watchdog";

/** One connection-lifecycle event, kept for the debug export. */
export interface SessionEvent {
  readonly timestamp: string;
  readonly state: ConnectionState;
  readonly detail?: string;
}

/** A parser / decoder failure (the frame was discarded, state kept). */
export interface ParserError {
  readonly timestamp: string;
  readonly frameType: string;
  readonly error: string;
}

/** Immutable view of the session for the UI. */
export interface SessionSnapshot {
  readonly connection: ConnectionState;
  readonly device?: BleDevice;
  readonly deviceInfo?: JkDeviceInfo;
  readonly profile?: ProfileResolution;
  readonly cellInfo?: JkCellInfo;
  readonly cellInfoAt?: number;
  readonly settings?: JkSettings;
  readonly settingsAt?: number;
  readonly lastValidFrameAt?: number;
  readonly freshness: Freshness;
  readonly reconnectAttempt: number;
  readonly nextReconnectAt?: number;
  readonly lastError?: string;
  readonly parserErrors: readonly ParserError[];
  readonly framesReceived: number;
  /**
   * Latest checksum-valid raw frame per frame type (e.g. "CELL_INFO"), always
   * kept - this is what a diagnostic-mode capture exports (design section 44).
   */
  readonly capturedFrames: Readonly<Record<string, { readonly hex: string; readonly count: number; readonly at: number }>>;
}

export interface BmsSessionOptions {
  readonly transport: BleTransport;
  readonly logger?: RawPacketLogger;
  /** Wait for the 0x97 device-info answer. Default 5 s. */
  readonly identifyTimeoutMs?: number;
  /** Re-send 0x96 at this interval until cell info arrives (upstream `update()`). Default 5 s. */
  readonly statusRetryMs?: number;
  /** Watchdog tick. Default 1 s. */
  readonly watchdogIntervalMs?: number;
  /** Reconnect automatically after an unexpected disconnect. Default true. */
  readonly autoReconnect?: boolean;
  readonly now?: () => number;
  /**
   * Profile resolution. Defaults to `resolveProfile` from jk-protocol; only
   * demos inject `previewProfile` (labelled PREVIEW in the UI).
   */
  readonly resolveProfile?: (identity: DeviceIdentity) => ProfileResolution;
}

const MAX_EVENTS = 200;
const MAX_PARSER_ERRORS = 50;

type Waiter<T> = { resolve: (value: T) => void; reject: (error: Error) => void };

/**
 * Orchestrates one BMS connection (design sections 17-20):
 *
 * ```text
 * CONNECTING -> DISCOVERING -> SUBSCRIBING -> IDENTIFYING (0x97, device info,
 * profile) -> READY (0x96) -> STREAMING (cell info / settings frames)
 * failure: ERROR -> RECONNECT_WAIT (1,2,4,8,15,30 s) -> CONNECTING
 * ```
 *
 * Corrupt frames are discarded and counted; the previous valid state is kept.
 * The watchdog marks data stale after 5 s and treats > 15 s without a valid
 * frame as a stalled link (reconnect).
 */
export class BmsSession {
  private readonly transport: BleTransport;
  readonly logger: RawPacketLogger;
  private readonly identifyTimeoutMs: number;
  private readonly statusRetryMs: number;
  private readonly watchdogIntervalMs: number;
  private readonly autoReconnect: boolean;
  private readonly now: () => number;
  private readonly resolve: (identity: DeviceIdentity) => ProfileResolution;

  private readonly machine = new ConnectionStateMachine();
  private readonly pipeline = new PacketPipeline();
  private readonly listeners = new Set<(snapshot: SessionSnapshot) => void>();
  private readonly eventLog: SessionEvent[] = [];

  private state: SessionSnapshot = {
    connection: "IDLE",
    freshness: "none",
    reconnectAttempt: 0,
    parserErrors: [],
    framesReceived: 0,
    capturedFrames: {},
  };

  /** Bumped on every (re)connect so stale async work can bail out. */
  private generation = 0;
  private userDisconnected = true;
  private deviceInfoWaiters: Waiter<JkDeviceInfo>[] = [];
  private settingsWaiters: Waiter<JkSettings>[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private statusTimer: ReturnType<typeof setInterval> | undefined;
  private watchdogTimer: ReturnType<typeof setInterval> | undefined;
  private unsubscribeDisconnect: (() => void) | undefined;

  constructor(options: BmsSessionOptions) {
    this.transport = options.transport;
    this.logger = options.logger ?? new RawPacketLogger();
    this.identifyTimeoutMs = options.identifyTimeoutMs ?? 5000;
    this.statusRetryMs = options.statusRetryMs ?? 5000;
    this.watchdogIntervalMs = options.watchdogIntervalMs ?? 1000;
    this.autoReconnect = options.autoReconnect ?? true;
    this.now = options.now ?? Date.now;
    this.resolve = options.resolveProfile ?? resolveProfile;
    this.unsubscribeDisconnect = this.transport.onDisconnect((error) => this.handleLinkLoss(error));
  }

  get snapshot(): SessionSnapshot {
    return this.state;
  }

  get events(): readonly SessionEvent[] {
    return this.eventLog;
  }

  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Scan for devices (on the web this opens the browser device picker). */
  async scan(): Promise<readonly BleDevice[]> {
    this.transition("SCANNING");
    try {
      const devices = await this.transport.scan();
      this.transition("IDLE", `${devices.length} device(s) found`);
      return devices;
    } catch (error) {
      this.transition("IDLE", `scan failed: ${describe(error)}`);
      this.update({ lastError: describe(error) });
      throw error;
    }
  }

  /** Connect to `device` and start streaming. Resolves once identified. */
  async connect(device: BleDevice): Promise<void> {
    const current = this.machine.current;
    if (current !== "IDLE" && current !== "SCANNING" && current !== "RECONNECT_WAIT") {
      await this.disconnect();
    }
    this.userDisconnected = false;
    this.clearReconnectTimer();
    this.update({ device, reconnectAttempt: 0, nextReconnectAt: undefined, lastError: undefined });
    await this.establish();
  }

  /** User-initiated disconnect: stops auto reconnect. */
  async disconnect(): Promise<void> {
    this.userDisconnected = true;
    this.generation += 1;
    this.clearTimers();
    this.rejectWaiters(new Error("disconnected"));
    try {
      await this.transport.disconnect();
    } finally {
      this.transition("IDLE", "user disconnect");
      this.update({ nextReconnectAt: undefined, reconnectAttempt: 0 });
    }
  }

  /** Manual reconnect: retry immediately, skipping the backoff (design section 19). */
  async reconnectNow(): Promise<void> {
    if (this.state.device === undefined) {
      throw new Error("reconnectNow: no device selected");
    }
    this.userDisconnected = false;
    this.clearReconnectTimer();
    if (this.machine.current === "READY" || this.machine.current === "STREAMING") {
      return;
    }
    if (this.machine.current !== "IDLE" && this.machine.current !== "RECONNECT_WAIT") {
      this.transition("ERROR", "manual reconnect");
      this.transition("RECONNECT_WAIT");
    }
    await this.establish().catch(() => undefined);
  }

  /**
   * Re-validate the link, e.g. on `visibilitychange` where background tabs
   * throttle timers (design section 19). Triggers a reconnect when stalled.
   */
  checkHealth(): void {
    this.tickWatchdog();
    const due = this.state.nextReconnectAt === undefined || this.now() >= this.state.nextReconnectAt;
    if (!this.userDisconnected && this.machine.current === "RECONNECT_WAIT" && (this.reconnectTimer === undefined || due)) {
      void this.reconnectNow();
    }
  }

  /** Request a fresh settings frame (0x96) and wait for it. */
  async readSettings(timeoutMs = 5000): Promise<JkSettings> {
    const waiting = this.waitFor(this.settingsWaiters, timeoutMs, "settings frame");
    await this.send(buildCellInfoCommand());
    return waiting;
  }

  /**
   * Settings writer bound to this session. Writes are only possible for a
   * `verified` profile whose capabilities allow it (Phase 1: never).
   */
  settingsWriter(): JkSettingsWriter {
    const resolution = this.state.profile;
    return createSettingsWriter({
      profile: resolution?.mode === "verified" ? resolution.profile : null,
      send: (frame) => this.send(frame),
      readSettings: () => this.readSettings(),
    });
  }

  /** Stop timers and detach from the transport. */
  dispose(): void {
    this.userDisconnected = true;
    this.generation += 1;
    this.clearTimers();
    this.rejectWaiters(new Error("disposed"));
    this.unsubscribeDisconnect?.();
    this.unsubscribeDisconnect = undefined;
    this.listeners.clear();
  }

  // --- internals ---------------------------------------------------------

  private async establish(): Promise<void> {
    const device = this.state.device;
    if (device === undefined) {
      throw new Error("establish: no device");
    }
    const generation = ++this.generation;
    this.clearTimers();
    this.pipeline.reset();

    try {
      this.transition("CONNECTING", device.name ?? device.id);
      await this.transport.connect(device.id);
      this.assertGeneration(generation);
      // Discovery and subscription happen inside transport.connect(); the
      // states are still walked so the lifecycle matches design section 18.
      this.transition("DISCOVERING");
      this.transition("SUBSCRIBING");
      void this.pump(generation);

      this.transition("IDENTIFYING", "request device info (0x97)");
      const waiting = this.waitFor(this.deviceInfoWaiters, this.identifyTimeoutMs, "device info frame");
      await this.send(buildDeviceInfoCommand());
      const info = await waiting;
      this.assertGeneration(generation);

      const profile = this.resolve(info);
      this.update({ profile });
      this.transition("READY", profile.reason);

      this.update({ reconnectAttempt: 0, nextReconnectAt: undefined, lastError: undefined });
      await this.send(buildCellInfoCommand());
      this.startTimers(generation);
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      this.failAndScheduleReconnect(error);
      throw error;
    }
  }

  private async pump(generation: number): Promise<void> {
    try {
      for await (const fragment of this.transport.notifications()) {
        if (generation !== this.generation) {
          return;
        }
        this.logger.log("RX", fragment);
        const decoded = this.pipeline.push(fragment);
        if (decoded !== null) {
          this.handleFrame(decoded);
        }
      }
    } catch (error) {
      if (generation === this.generation) {
        this.handleLinkLoss(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private handleFrame(decoded: DecodedFrame): void {
    const at = this.now();
    const type = decoded.kind === "unknown" || decoded.kind === "error" ? decoded.frameType : decoded.frame[4];
    const name = frameTypeName(type);

    if (decoded.kind === "error") {
      this.logger.log("FRAME", decoded.frame, { frame: name, error: decoded.error });
      const parserErrors = [
        ...this.state.parserErrors,
        { timestamp: new Date(at).toISOString(), frameType: name, error: decoded.error },
      ].slice(-MAX_PARSER_ERRORS);
      this.update({ parserErrors });
      return;
    }

    const previous = this.state.capturedFrames[name];
    const capturedFrames = {
      ...this.state.capturedFrames,
      [name]: { hex: toHex(decoded.frame), count: (previous?.count ?? 0) + 1, at },
    };
    const base = {
      lastValidFrameAt: at,
      framesReceived: this.state.framesReceived + 1,
      freshness: "fresh" as const,
      capturedFrames,
    };

    // Only a verified profile may have its frames decoded. Before
    // identification, or for an unknown model / revision / protocol, every
    // non-identification frame is captured raw and never shown as data
    // (design sections 17, 44): a JK02 frame read with the JK04 layout would
    // produce plausible-looking but wrong numbers.
    const mode = this.state.profile?.mode;
    const decodeAllowed = mode === "verified" || mode === "preview";
    if (!decodeAllowed && decoded.kind !== "device-info") {
      this.logger.log("FRAME", decoded.frame, { frame: name, decoded: "captured raw (diagnostic mode, not decoded)" });
      this.update(base);
      if (decoded.frame[4] === 0x02 && this.machine.current === "READY") {
        this.transition("STREAMING", "diagnostic capture");
      }
      return;
    }

    switch (decoded.kind) {
      case "device-info": {
        const v = decoded.value;
        this.logger.log("FRAME", decoded.frame, {
          frame: name,
          decoded: `MODEL=${v.vendorId}\nHW=${v.hardwareVersion}\nSW=${v.softwareVersion}`,
        });
        this.update({ ...base, deviceInfo: v });
        for (const waiter of this.deviceInfoWaiters.splice(0)) waiter.resolve(v);
        return;
      }
      case "cell-info": {
        const v = decoded.value;
        this.logger.log("FRAME", decoded.frame, {
          frame: name,
          decoded: `CELLS=${v.activeCells} TOTAL=${v.totalVoltage.toFixed(3)}V DELTA=${v.deltaCellVoltage.toFixed(4)}V BAL=${v.balancer}`,
        });
        this.update({ ...base, cellInfo: v, cellInfoAt: at });
        if (this.machine.current === "READY") {
          this.transition("STREAMING");
        }
        return;
      }
      case "settings": {
        const v = decoded.value;
        this.logger.log("FRAME", decoded.frame, {
          frame: name,
          decoded: `CELL_COUNT=${v.cellCount} BALANCER=${v.balancerEnabled ? "ON" : "OFF"} START=${v.balanceStartVoltage.toFixed(3)}V TRIGGER=${v.balanceTriggerDeltaVoltage.toFixed(3)}V`,
        });
        this.update({ ...base, settings: v, settingsAt: at });
        for (const waiter of this.settingsWaiters.splice(0)) waiter.resolve(v);
        return;
      }
      case "unknown":
        this.logger.log("FRAME", decoded.frame, { frame: name, decoded: "unsupported frame type" });
        this.update(base);
        return;
    }
  }

  private handleLinkLoss(error?: Error): void {
    if (this.userDisconnected || this.machine.current === "IDLE" || this.machine.current === "RECONNECT_WAIT") {
      return;
    }
    this.generation += 1;
    this.failAndScheduleReconnect(error ?? new Error("link lost"));
  }

  private failAndScheduleReconnect(error: unknown): void {
    this.clearTimers();
    this.rejectWaiters(error instanceof Error ? error : new Error(String(error)));
    const message = describe(error);
    if (this.machine.current !== "ERROR") {
      this.transition("ERROR", message);
    }
    this.update({ lastError: message });
    if (!this.autoReconnect || this.userDisconnected) {
      this.transition("IDLE", "auto reconnect disabled");
      void this.transport.disconnect().catch(() => undefined);
      return;
    }
    const attempt = this.state.reconnectAttempt + 1;
    const delay = reconnectDelayMs(attempt);
    this.transition("RECONNECT_WAIT", `attempt ${attempt} in ${delay} ms`);
    this.update({ reconnectAttempt: attempt, nextReconnectAt: this.now() + delay });
    void this.transport.disconnect().catch(() => undefined);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.userDisconnected) {
        void this.establish().catch(() => undefined);
      }
    }, delay);
  }

  private startTimers(generation: number): void {
    this.statusTimer = setInterval(() => {
      if (generation !== this.generation) return;
      // Upstream re-sends 0x96 on every update() until a status frame arrives.
      if (this.machine.current === "READY") {
        void this.send(buildCellInfoCommand()).catch(() => undefined);
      }
    }, this.statusRetryMs);
    this.watchdogTimer = setInterval(() => this.tickWatchdog(), this.watchdogIntervalMs);
  }

  private tickWatchdog(): void {
    const freshness = classifyFreshness(this.state.lastValidFrameAt, this.now());
    if (freshness !== this.state.freshness) {
      this.update({ freshness });
    }
    const streaming = this.machine.current === "STREAMING" || this.machine.current === "READY";
    const since = this.state.lastValidFrameAt;
    if (streaming && since !== undefined && this.now() - since > STALLED_AFTER_MS) {
      this.handleLinkLoss(new Error(`no valid frame for ${Math.round((this.now() - since) / 1000)} s (stalled)`));
    }
  }

  private async send(frame: Uint8Array): Promise<void> {
    this.logger.log("TX", frame);
    await this.transport.write(frame);
  }

  private waitFor<T>(list: Waiter<T>[], timeoutMs: number, what: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiter: Waiter<T> = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      const timer = setTimeout(() => {
        const index = list.indexOf(waiter);
        if (index >= 0) list.splice(index, 1);
        reject(new Error(`timeout waiting for ${what} (${timeoutMs} ms)`));
      }, timeoutMs);
      list.push(waiter);
    });
  }

  private rejectWaiters(error: Error): void {
    for (const waiter of this.deviceInfoWaiters.splice(0)) waiter.reject(error);
    for (const waiter of this.settingsWaiters.splice(0)) waiter.reject(error);
  }

  private assertGeneration(generation: number): void {
    if (generation !== this.generation) {
      throw new Error("superseded");
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private clearTimers(): void {
    this.clearReconnectTimer();
    if (this.statusTimer !== undefined) clearInterval(this.statusTimer);
    if (this.watchdogTimer !== undefined) clearInterval(this.watchdogTimer);
    this.statusTimer = undefined;
    this.watchdogTimer = undefined;
  }

  private transition(next: ConnectionState, detail?: string): void {
    if (this.machine.current !== next) {
      this.machine.transitionTo(next);
    }
    this.eventLog.push({ timestamp: new Date(this.now()).toISOString(), state: next, detail });
    if (this.eventLog.length > MAX_EVENTS) {
      this.eventLog.splice(0, this.eventLog.length - MAX_EVENTS);
    }
    this.update({ connection: next });
  }

  private update(patch: Partial<SessionSnapshot>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
