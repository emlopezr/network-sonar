import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestHarness } from "../helpers/test-harness";

describe("monitor runtime routes", () => {
  let harness = createTestHarness();

  beforeEach(() => {
    harness = createTestHarness();
  });

  afterEach(() => {
    harness.close();
  });

  it("updates and persists the runtime mode", async () => {
    const response = await request(harness.app)
      .patch("/api/v1/monitor/runtime")
      .send({ mode: "paused" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mode: "paused" });
    expect(harness.monitorRuntimeService.getRuntime()).toEqual({ mode: "paused" });
  });
});
