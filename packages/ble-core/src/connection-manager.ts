/** BLE connection lifecycle (design section 18). */
export type ConnectionState =
  | "IDLE"
  | "SCANNING"
  | "CONNECTING"
  | "DISCOVERING"
  | "SUBSCRIBING"
  | "IDENTIFYING"
  | "READY"
  | "STREAMING"
  | "ERROR"
  | "RECONNECT_WAIT";

const TRANSITIONS: Readonly<Record<ConnectionState, readonly ConnectionState[]>> = {
  IDLE: ["SCANNING", "CONNECTING", "ERROR"],
  SCANNING: ["CONNECTING", "IDLE", "ERROR"],
  CONNECTING: ["DISCOVERING", "ERROR", "IDLE"],
  DISCOVERING: ["SUBSCRIBING", "ERROR"],
  SUBSCRIBING: ["IDENTIFYING", "ERROR"],
  IDENTIFYING: ["READY", "ERROR"],
  READY: ["STREAMING", "IDLE", "ERROR"],
  STREAMING: ["READY", "IDLE", "ERROR"],
  ERROR: ["RECONNECT_WAIT", "IDLE"],
  RECONNECT_WAIT: ["CONNECTING", "IDLE"],
};

/** Guards the BLE connection state machine; invalid transitions throw. */
export class ConnectionStateMachine {
  private state: ConnectionState;

  constructor(initial: ConnectionState = "IDLE") {
    this.state = initial;
  }

  get current(): ConnectionState {
    return this.state;
  }

  canTransitionTo(next: ConnectionState): boolean {
    return TRANSITIONS[this.state].includes(next);
  }

  /** Move to `next`, or throw when the transition is not allowed. */
  transitionTo(next: ConnectionState): ConnectionState {
    if (!this.canTransitionTo(next)) {
      throw new Error(`Illegal connection transition: ${this.state} -> ${next}`);
    }
    this.state = next;
    return this.state;
  }
}
