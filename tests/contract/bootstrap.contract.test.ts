import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { BootstrapResponse } from "../../backend/src/types/api";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("GET /api/v1/bootstrap", () => {
  const harness = createTestHarness();

  afterEach(() => {
    harness.close();
  });

  it("returns the current snapshot and initial history payload", async () => {
    harness.monitorService.processCycle(createCycle());

    const response = await request(harness.app).get("/api/v1/bootstrap?range=24h");
    const body = response.body as unknown as BootstrapResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      retentionDays: 30,
      sampleIntervalSeconds: 5,
      current: {
        status: "ok",
        externalTarget: "1.1.1.1",
        staleAfterSeconds: 15
      }
    });
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({
      status: "ok",
      externalTarget: "1.1.1.1"
    });
  });
});
