import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { BootstrapResponse, HistoryResponse } from "../../backend/src/types/api";
import { openSseStream, readSseChunk } from "../helpers/sse";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("quickstart smoke flow", () => {
  const harness = createTestHarness();

  afterEach(() => {
    harness.close();
  });

  it("covers health, bootstrap, history and SSE flows", async () => {
    const base = Math.floor(Date.now() / 1000);
    harness.monitorService.processCycle(createCycle({ observedAt: base }));

    const health = await request(harness.app).get("/health");
    const healthBody = health.body as unknown as { ok: boolean; now: number };
    expect(health.status).toBe(200);
    expect(healthBody.ok).toBe(true);

    const bootstrap = await request(harness.app).get("/api/v1/bootstrap?range=24h");
    const bootstrapBody = bootstrap.body as unknown as BootstrapResponse;
    expect(bootstrap.status).toBe(200);
    expect(bootstrapBody.current.status).toBe("ok");

    const history = await request(harness.app).get(`/api/v1/history?from=${base - 10}&to=${base + 10}`);
    const historyBody = history.body as unknown as HistoryResponse;
    expect(history.status).toBe(200);
    expect(historyBody.samples).toHaveLength(1);

    const stream = await openSseStream(harness.app);
    const chunk = await readSseChunk(stream.reader);
    expect(chunk).toContain("event: snapshot");
    await stream.close();
  });
});
