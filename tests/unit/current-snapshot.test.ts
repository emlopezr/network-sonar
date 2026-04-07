import { describe, expect, it } from "vitest";

import { shouldMarkSnapshotStale } from "../../frontend/src/utils/current-snapshot";
import type { CurrentStatusSnapshot } from "../../frontend/src/types/monitor";

function createSnapshot(overrides: Partial<CurrentStatusSnapshot> = {}): CurrentStatusSnapshot {
  return {
    observedAt: 1_710_000_000,
    status: "ok",
    externalTarget: "1.1.1.1",
    externalOk: true,
    externalLatencyMs: 12,
    failureReason: null,
    staleAfterSeconds: 30,
    lastChangeAt: 1_710_000_000,
    ...overrides
  };
}

describe("shouldMarkSnapshotStale", () => {
  it("marks the snapshot as stale when both the sample and stream activity are old", () => {
    expect(
      shouldMarkSnapshotStale(createSnapshot(), 1_710_000_000, 1_710_000_031)
    ).toBe(true);
  });

  it("keeps the snapshot fresh when heartbeats are still arriving", () => {
    expect(
      shouldMarkSnapshotStale(createSnapshot(), 1_710_000_029, 1_710_000_031)
    ).toBe(false);
  });

  it("ignores heartbeat activity when requested", () => {
    expect(
      shouldMarkSnapshotStale(createSnapshot(), 1_710_000_029, 1_710_000_031, false)
    ).toBe(true);
  });

  it("never re-marks an already stale snapshot", () => {
    expect(
      shouldMarkSnapshotStale(createSnapshot({ status: "stale" }), 1_710_000_000, 1_710_000_100)
    ).toBe(false);
  });
});
