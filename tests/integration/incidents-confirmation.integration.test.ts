import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { IncidentHistoryResponse } from "../../backend/src/types/api";
import type { TestHarness } from "../helpers/test-harness";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("incident confirmation integration", () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  afterEach(() => {
    harness.close();
  });

  it("keeps a long outage open until recovery is confirmed", async () => {
    const base = Math.floor(Date.now() / 1000) - 300;

    harness.monitorService.processCycle(createCycle({ observedAt: base }));
    harness.monitorService.processCycle(
      createCycle({
        observedAt: base + 5,
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "timeout"
        }
      })
    );
    harness.monitorService.processCycle(
      createCycle({
        observedAt: base + 10,
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "timeout"
        }
      })
    );
    harness.monitorService.processCycle(
      createCycle({
        observedAt: base + 15,
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "icmp-unreachable"
        }
      })
    );
    harness.monitorService.processCycle(createCycle({ observedAt: base + 20 }));
    harness.monitorService.processCycle(createCycle({ observedAt: base + 25 }));

    const response = await request(harness.app).get(`/api/v1/incidents?from=${base}&to=${base + 25}`);
    const body = response.body as unknown as IncidentHistoryResponse;

    expect(response.status).toBe(200);
    expect(body.incidents).toHaveLength(1);
    expect(body.incidents[0]).toMatchObject({
      startedAt: base + 5,
      lastObservedAt: base + 15,
      resolvedAt: base + 20,
      durationSeconds: 15,
      sampleCount: 3,
      latestFailureReason: "icmp-unreachable",
      status: "resolved"
    });
  });

  it("records a confirmed 10 second microcut as a real incident", async () => {
    const base = Math.floor(Date.now() / 1000) - 120;

    harness.monitorService.processCycle(createCycle({ observedAt: base }));
    harness.monitorService.processCycle(
      createCycle({
        observedAt: base + 5,
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "timeout"
        }
      })
    );
    harness.monitorService.processCycle(
      createCycle({
        observedAt: base + 10,
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "timeout"
        }
      })
    );
    harness.monitorService.processCycle(createCycle({ observedAt: base + 15 }));
    harness.monitorService.processCycle(createCycle({ observedAt: base + 20 }));

    const response = await request(harness.app).get(`/api/v1/incidents?from=${base}&to=${base + 20}`);
    const body = response.body as unknown as IncidentHistoryResponse;

    expect(response.status).toBe(200);
    expect(body.incidents).toHaveLength(1);
    expect(body.incidents[0]).toMatchObject({
      startedAt: base + 5,
      lastObservedAt: base + 10,
      resolvedAt: base + 15,
      durationSeconds: 10,
      sampleCount: 2,
      status: "resolved"
    });
  });
});
