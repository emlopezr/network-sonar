import { describe, expect, it } from "vitest";

import {
  advanceConfirmedState,
  buildSnapshot,
  resetPendingState,
  type ConfirmedMonitorState
} from "../../backend/src/services/confirmed-state-machine";
import type {
  ConfirmationThresholds,
  PersistedMonitorSample
} from "../../backend/src/types/monitor";

const thresholds: ConfirmationThresholds = {
  confirmDownAfter: 2,
  confirmUpAfter: 2
};

function createSample(
  observedAt: number,
  status: PersistedMonitorSample["status"]
): PersistedMonitorSample {
  return {
    observedAt,
    status,
    externalTarget: "1.1.1.1",
    externalOk: status === "ok",
    externalLatencyMs: status === "ok" ? 12 : null,
    failureReason: status === "down" ? "timeout" : null
  };
}

function advanceSequence(samples: PersistedMonitorSample[]): ConfirmedMonitorState {
  let state: ConfirmedMonitorState | null = null;

  for (const sample of samples) {
    state = advanceConfirmedState(state, sample, thresholds).state;
  }

  if (!state) {
    throw new Error("Expected a confirmed state after replaying samples.");
  }

  return state;
}

describe("confirmed state machine", () => {
  it("seeds the initial confirmed state from the first sample", () => {
    const result = advanceConfirmedState(null, createSample(100, "ok"), thresholds);

    expect(result.transition).toMatchObject({
      status: "ok",
      effectiveAt: 100,
      confirmedAt: 100
    });
    expect(result.state).toMatchObject({
      status: "ok",
      lastChangeAt: 100,
      latestObservedAt: 100
    });
  });

  it("keeps the confirmed status after an isolated failure", () => {
    const state = advanceSequence([createSample(100, "ok"), createSample(105, "down")]);
    const snapshot = buildSnapshot(state, 15, 105);

    expect(state.status).toBe("ok");
    expect(state.pendingStatus).toBe("down");
    expect(state.pendingCount).toBe(1);
    expect(snapshot).toMatchObject({
      observedAt: 105,
      status: "ok",
      externalOk: true,
      failureReason: null,
      lastChangeAt: 100
    });
  });

  it("confirms a down transition on the second consecutive failure and anchors it retroactively", () => {
    let state: ConfirmedMonitorState | null = null;

    state = advanceConfirmedState(state, createSample(100, "ok"), thresholds).state;
    state = advanceConfirmedState(state, createSample(105, "down"), thresholds).state;
    const result = advanceConfirmedState(state, createSample(110, "down"), thresholds);

    expect(result.transition).toMatchObject({
      status: "down",
      effectiveAt: 105,
      confirmedAt: 110
    });
    expect(result.state).toMatchObject({
      status: "down",
      lastChangeAt: 105,
      latestObservedAt: 110
    });
  });

  it("keeps an incident open after an isolated recovery", () => {
    const state = advanceSequence([
      createSample(100, "ok"),
      createSample(105, "down"),
      createSample(110, "down"),
      createSample(115, "ok")
    ]);

    expect(state.status).toBe("down");
    expect(state.pendingStatus).toBe("ok");
    expect(state.pendingCount).toBe(1);
    expect(state.lastChangeAt).toBe(105);
  });

  it("confirms recovery on the second consecutive success and anchors it to the first success", () => {
    let state: ConfirmedMonitorState | null = null;

    for (const sample of [
      createSample(100, "ok"),
      createSample(105, "down"),
      createSample(110, "down"),
      createSample(115, "ok")
    ]) {
      state = advanceConfirmedState(state, sample, thresholds).state;
    }

    const result = advanceConfirmedState(state, createSample(120, "ok"), thresholds);

    expect(result.transition).toMatchObject({
      status: "ok",
      effectiveAt: 115,
      confirmedAt: 120
    });
    expect(result.state).toMatchObject({
      status: "ok",
      lastChangeAt: 115,
      latestObservedAt: 120
    });
  });

  it("clears a pending recovery streak when the outage continues", () => {
    const state = advanceSequence([
      createSample(100, "ok"),
      createSample(105, "down"),
      createSample(110, "down"),
      createSample(115, "ok"),
      createSample(120, "down")
    ]);

    expect(state.status).toBe("down");
    expect(state.pendingStatus).toBeNull();
    expect(state.pendingCount).toBe(0);
    expect(state.latestObservedAt).toBe(120);
  });

  it("drops pending streaks when thresholds change", () => {
    const state = advanceSequence([createSample(100, "ok"), createSample(105, "down")]);
    const resetState = resetPendingState(state);

    expect(resetState.status).toBe("ok");
    expect(resetState.pendingStatus).toBeNull();
    expect(resetState.pendingCount).toBe(0);
    expect(resetState.lastChangeAt).toBe(100);
  });
});
