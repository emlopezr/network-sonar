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

  it("confirms down and recovery transitions through bootstrap and SSE", async () => {
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

    const pendingDownChunk = await readSseChunk(stream.reader);
    expect(pendingDownChunk).toContain("event: snapshot");
    expect(pendingDownChunk).toContain("\"status\":\"ok\"");
    expect(pendingDownChunk).toContain("event: sample");
    expect(pendingDownChunk).toContain("\"status\":\"down\"");

    const latest = await request(harness.app).get("/api/v1/bootstrap?range=24h");
    const latestBody = latest.body as unknown as BootstrapResponse;
    expect(latestBody.current.status).toBe("ok");
    expect(latestBody.current.lastChangeAt).toBe(base);

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

    const confirmedDownChunk = await readSseChunk(stream.reader);
    expect(confirmedDownChunk).toContain("\"status\":\"down\"");

    const downState = await request(harness.app).get("/api/v1/bootstrap?range=24h");
    const downBody = downState.body as unknown as BootstrapResponse;
    expect(downBody.current.status).toBe("down");
    expect(downBody.current.lastChangeAt).toBe(base + 5);

    harness.monitorService.processCycle(createCycle({ observedAt: base + 15 }));

    const pendingRecoveryChunk = await readSseChunk(stream.reader);
    expect(pendingRecoveryChunk).toContain("event: snapshot");
    expect(pendingRecoveryChunk).toContain("\"status\":\"down\"");

    harness.monitorService.processCycle(createCycle({ observedAt: base + 20 }));

    const recoveredChunk = await readSseChunk(stream.reader);
    expect(recoveredChunk).toContain("\"status\":\"ok\"");

    const recovered = await request(harness.app).get("/api/v1/bootstrap?range=24h");
    const recoveredBody = recovered.body as unknown as BootstrapResponse;
    expect(recoveredBody.current.status).toBe("ok");
    expect(recoveredBody.current.lastChangeAt).toBe(base + 15);

    await stream.close();
  });
});
