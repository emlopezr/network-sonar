import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { HistoryResponse, TimelineSegmentsResponse } from "../../backend/src/types/api";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("GET /api/v1/history", () => {
  let harness = createTestHarness();

  beforeEach(() => {
    harness = createTestHarness();
  });

  afterEach(() => {
    harness.close();
  });

  it("returns raw history samples for a requested range", async () => {
    const base = Math.floor(Date.now() / 1000) - 600;

    harness.monitorService.processCycle(createCycle({ observedAt: base }));
    harness.monitorService.processCycle(
      createCycle({
        observedAt: base + 300,
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "timeout"
        }
      })
    );

    const response = await request(harness.app).get(`/api/v1/history?from=${base}&to=${base + 300}`);
    const body = response.body as unknown as HistoryResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      from: base,
      to: base + 300
    });
    expect(body.samples).toHaveLength(2);
    expect(body.samples[1]).toMatchObject({
      status: "down",
      failureReason: "timeout"
    });
  });

  it("returns grouped timeline segments for a requested range", async () => {
    const base = Math.floor(Date.now() / 1000) - 600;

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

    const response = await request(harness.app).get(
      `/api/v1/history/segments?from=${base}&to=${base + 10}`
    );
    const body = response.body as unknown as TimelineSegmentsResponse;

    expect(response.status).toBe(200);
    expect(body.segments).toHaveLength(2);
    expect(body.segments[0]).toMatchObject({
      status: "ok",
      startedAt: base,
      endedAt: base + 5
    });
    expect(body.segments[1]).toMatchObject({
      status: "down",
      startedAt: base + 5,
      endedAt: null,
      latestFailureReason: "timeout"
    });
  });

  it("returns no_data segments for long gaps between samples", async () => {
    const base = Math.floor(Date.now() / 1000) - 600;

    harness.monitorService.processCycle(createCycle({ observedAt: base }));
    harness.monitorService.processCycle(createCycle({ observedAt: base + 15 }));

    const response = await request(harness.app).get(
      `/api/v1/history/segments?from=${base}&to=${base + 20}`
    );
    const body = response.body as unknown as TimelineSegmentsResponse;

    expect(response.status).toBe(200);
    expect(body.segments).toHaveLength(3);
    expect(body.segments[1]).toMatchObject({
      status: "no_data",
      visibleStart: base + 5,
      visibleEnd: base + 15,
      sampleCount: 0
    });
  });
});
