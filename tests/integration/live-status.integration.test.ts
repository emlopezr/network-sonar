import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { BootstrapResponse } from "../../backend/src/types/api";
import { openSseStream, readSseChunk } from "../helpers/sse";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("live status transitions", () => {
  const harness = createTestHarness();

  afterEach(() => {
    harness.close();
  });

  it("reflects ok and down transitions through bootstrap and SSE", async () => {
    const base = Math.floor(Date.now() / 1000);

    harness.monitorService.processCycle(createCycle({ observedAt: base }));

    const initial = await request(harness.app).get("/api/v1/bootstrap?range=24h");
    const initialBody = initial.body as unknown as BootstrapResponse;
    expect(initialBody.current.status).toBe("ok");

    const stream = await openSseStream(harness.app);
    await readSseChunk(stream.reader);

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

    const downChunk = await readSseChunk(stream.reader);
    expect(downChunk).toContain("\"status\":\"down\"");

    const latest = await request(harness.app).get("/api/v1/bootstrap?range=24h");
    const latestBody = latest.body as unknown as BootstrapResponse;
    expect(latestBody.current.status).toBe("down");

    await stream.close();
  });
});
