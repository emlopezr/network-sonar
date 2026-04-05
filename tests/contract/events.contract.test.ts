import { afterEach, describe, expect, it } from "vitest";

import { openSseStream, readSseChunk } from "../helpers/sse";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("GET /api/v1/events", () => {
  const harness = createTestHarness();

  afterEach(() => {
    harness.close();
  });

  it("streams retry instructions and an initial snapshot", async () => {
    const base = Math.floor(Date.now() / 1000);

    harness.monitorService.processCycle(createCycle({ observedAt: base }));

    const stream = await openSseStream(harness.app);
    const chunk = await readSseChunk(stream.reader);

    expect(chunk).toContain("retry: 5000");
    expect(chunk).toContain("event: snapshot");
    expect(chunk).toContain("\"status\":\"ok\"");

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

    const nextChunk = await readSseChunk(stream.reader);
    expect(nextChunk).toContain("event: sample");
    expect(nextChunk).toContain("\"status\":\"down\"");

    await stream.close();
  });
});
