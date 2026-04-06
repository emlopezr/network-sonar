import { describe, expect, it } from "vitest";

import { HistoryService } from "../../backend/src/services/history-service";
import type { PersistedMonitorSample } from "../../backend/src/types/monitor";
import type { ConnectionLogStore, StoredConnectionLog } from "../../backend/src/types/storage";

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
    getRange: () => samples,
    purgeOlderThan: () => 0
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
    const service = new HistoryService(createRepository([createStoredSample(200, "down", "timeout")]), 5);

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
