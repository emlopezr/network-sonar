import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { HistoryResponse } from "../../backend/src/types/api";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("GET /api/v1/history", () => {
  const harness = createTestHarness();

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
});
