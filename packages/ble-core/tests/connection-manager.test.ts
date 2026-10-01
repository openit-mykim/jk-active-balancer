import { describe, expect, it } from "vitest";
import { ConnectionStateMachine } from "../src/connection-manager";

describe("ConnectionStateMachine", () => {
  it("walks the documented happy path", () => {
    const machine = new ConnectionStateMachine();
    for (const state of ["SCANNING", "CONNECTING", "DISCOVERING", "SUBSCRIBING", "IDENTIFYING", "READY", "STREAMING"] as const) {
      machine.transitionTo(state);
    }
    expect(machine.current).toBe("STREAMING");
  });

  it("supports the error -> reconnect -> connecting path", () => {
    const machine = new ConnectionStateMachine("IDENTIFYING");
    machine.transitionTo("ERROR");
    machine.transitionTo("RECONNECT_WAIT");
    machine.transitionTo("CONNECTING");
    expect(machine.current).toBe("CONNECTING");
  });

  it("throws on an illegal transition", () => {
    const machine = new ConnectionStateMachine();
    expect(machine.canTransitionTo("READY")).toBe(false);
    expect(() => machine.transitionTo("READY")).toThrow(/Illegal connection transition/);
  });
});
