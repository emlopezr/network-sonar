import { describe, expect, it } from "vitest";

import { HistoryService } from "../../backend/src/services/history-service";
import type {
  MonitorStateTransition,
  PersistedMonitorSample
} from "../../backend/src/types/monitor";
import type {
  ConnectionLogStore,
  StoredConnectionLog,
  TransitionStore
} from "../../backend/src/types/storage";

function createStoredSample(
  observedAt: number,
  status: PersistedMonitorSample["status"],
  failureReason: string | null = null
): StoredConnectionLog {
  return {
    id: observedAt,
    observedAt,
    status,
    externalTarget: "1.1.1.1",
    externalOk: status === "ok",
    externalLatencyMs: status === "ok" ? 11 : null,
    failureReason,
    createdAt: observedAt
  };
}

function createRepository(samples: StoredConnectionLog[]): ConnectionLogStore {
  return {
    insert: () => {
      throw new Error("insert should not be called in history service unit tests");
    },
    getLatest: () => samples[samples.length - 1] ?? null,
    getRecent: (limit) => samples.slice(Math.max(0, samples.length - limit)),
    getRange: (from, to) =>
      samples.filter((sample) => sample.observedAt >= from && sample.observedAt <= to),
    getAll: () => samples,
    purgeOlderThan: () => 0
  };
}

function createTransition(
  status: MonitorStateTransition["status"],
  effectiveAt: number,
  confirmedAt = effectiveAt
): MonitorStateTransition {
  return {
    id: effectiveAt,
    status,
    effectiveAt,
    confirmedAt,
    createdAt: confirmedAt
  };
}

function createTransitionStore(transitions: MonitorStateTransition[]): TransitionStore {
  return {
    insert: () => {
      throw new Error("insert should not be called in history service unit tests");
    },
    listRange: (from, to) =>
      transitions.filter((transition) => transition.effectiveAt >= from && transition.effectiveAt <= to),
    getLatestBeforeOrAt: (at) =>
      [...transitions]
        .filter((transition) => transition.effectiveAt <= at)
        .sort((left, right) => right.effectiveAt - left.effectiveAt)[0] ?? null,
    getAll: () => transitions,
    replaceAll: () => {
      throw new Error("replaceAll should not be called in history service unit tests");
    }
  };
}

describe("history service incidents", () => {
  it("groups consecutive down samples into a single incident", () => {
    const service = new HistoryService(
      createRepository([
        createStoredSample(100, "ok"),
        createStoredSample(105, "down", "timeout"),
        createStoredSample(110, "down", "timeout"),
        createStoredSample(115, "ok")
      ]),
      createTransitionStore([
        createTransition("ok", 100),
        createTransition("down", 105, 110),
        createTransition("ok", 115)
      ]),
      5
    );

    const incidents = service.getIncidents(100, 115);

    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({
      startedAt: 105,
      lastObservedAt: 110,
      resolvedAt: 115,
      durationSeconds: 10,
      sampleCount: 2,
      latestFailureReason: "timeout",
      status: "resolved"
    });
  });

  it("splits incidents when the connection recovers between down streaks", () => {
    const service = new HistoryService(
      createRepository([
        createStoredSample(100, "down", "timeout"),
        createStoredSample(105, "ok"),
        createStoredSample(110, "down", "icmp-unreachable")
      ]),
      createTransitionStore([
        createTransition("down", 100),
        createTransition("ok", 105),
        createTransition("down", 110)
      ]),
      5
    );

    const incidents = service.getIncidents(100, 110);

    expect(incidents).toHaveLength(2);
    expect(incidents[0]).toBeDefined();
    expect(incidents[1]).toBeDefined();
    expect(incidents[0]!.status).toBe("resolved");
    expect(incidents[1]!).toMatchObject({
      startedAt: 110,
      durationSeconds: 5,
      status: "ongoing"
    });
  });

  it("keeps the minimum duration for a single-sample incident", () => {
    const service = new HistoryService(
      createRepository([createStoredSample(200, "down", "timeout")]),
      createTransitionStore([createTransition("down", 200)]),
      5
    );

    const incidents = service.getIncidents(200, 200);

    expect(incidents[0]).toBeDefined();
    expect(incidents[0]!.durationSeconds).toBe(5);
  });

  it("marks an incident as ongoing when there is no recovery sample in range", () => {
    const service = new HistoryService(
      createRepository([
        createStoredSample(100, "ok"),
        createStoredSample(105, "down", "timeout"),
        createStoredSample(110, "down", "timeout")
      ]),
      createTransitionStore([
        createTransition("ok", 100),
        createTransition("down", 105, 110)
      ]),
      5
    );

    const incidents = service.getIncidents(100, 110);

    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({
      resolvedAt: null,
      status: "ongoing"
    });
  });
});

describe("history service timeline segments", () => {
  it("compacts confirmed states into continuous segments", () => {
    const service = new HistoryService(
      createRepository([
        createStoredSample(100, "ok"),
        createStoredSample(105, "ok"),
        createStoredSample(110, "down", "timeout"),
        createStoredSample(115, "down", "timeout"),
        createStoredSample(120, "ok")
      ]),
      createTransitionStore([
        createTransition("ok", 100),
        createTransition("down", 110),
        createTransition("ok", 120)
      ]),
      5
    );

    const segments = service.getTimelineSegments(100, 125);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({
      status: "ok",
      startedAt: 100,
      endedAt: 110,
      visibleStart: 100,
      visibleEnd: 110,
      sampleCount: 2
    });
    expect(segments[1]).toMatchObject({
      status: "down",
      startedAt: 110,
      endedAt: 120,
      visibleStart: 110,
      visibleEnd: 120,
      sampleCount: 2,
      latestFailureReason: "timeout"
    });
    expect(segments[2]).toMatchObject({
      status: "ok",
      startedAt: 120,
      endedAt: null,
      visibleStart: 120,
      visibleEnd: 125,
      sampleCount: 1
    });
  });

  it("clips segments to the requested range boundaries", () => {
    const service = new HistoryService(
      createRepository([
        createStoredSample(100, "ok"),
        createStoredSample(105, "ok"),
        createStoredSample(110, "down", "timeout"),
        createStoredSample(115, "down", "timeout")
      ]),
      createTransitionStore([
        createTransition("ok", 100),
        createTransition("down", 110)
      ]),
      5
    );

    const segments = service.getTimelineSegments(105, 112);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      status: "ok",
      startedAt: 100,
      visibleStart: 105,
      visibleEnd: 110,
      startedBeforeRange: true,
      endsAfterRange: false
    });
    expect(segments[1]).toMatchObject({
      status: "down",
      startedAt: 110,
      visibleStart: 110,
      visibleEnd: 112,
      startedBeforeRange: false,
      endsAfterRange: true
    });
  });

  it("inserts a no_data segment when samples are separated by a long gap", () => {
    const service = new HistoryService(
      createRepository([
        createStoredSample(100, "ok"),
        createStoredSample(115, "ok")
      ]),
      createTransitionStore([
        createTransition("ok", 100)
      ]),
      5
    );

    const segments = service.getTimelineSegments(100, 120);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({
      status: "ok",
      visibleStart: 100,
      visibleEnd: 105,
      sampleCount: 1
    });
    expect(segments[1]).toMatchObject({
      status: "no_data",
      visibleStart: 105,
      visibleEnd: 115,
      sampleCount: 0,
      lastObservedAt: null
    });
    expect(segments[2]).toMatchObject({
      status: "ok",
      visibleStart: 115,
      visibleEnd: 120,
      sampleCount: 1
    });
  });

  it("adds trailing no_data when the last sample is too old for the rest of the range", () => {
    const service = new HistoryService(
      createRepository([
        createStoredSample(100, "ok")
      ]),
      createTransitionStore([
        createTransition("ok", 100)
      ]),
      5
    );

    const segments = service.getTimelineSegments(100, 120);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      status: "ok",
      visibleStart: 100,
      visibleEnd: 105
    });
    expect(segments[1]).toMatchObject({
      status: "no_data",
      visibleStart: 105,
      visibleEnd: 120,
      endedAt: null
    });
  });
});
