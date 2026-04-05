import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { HistoryResponse } from "../../backend/src/types/api";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("history timeline data", () => {
  const harness = createTestHarness();

  afterEach(() => {
    harness.close();
  });

  it("returns each 5-second sample in chronological order", async () => {
    const base = Math.floor(Date.now() / 300) * 300;

    for (let index = 0; index < 6; index += 1) {
      harness.monitorService.processCycle(
        createCycle({
          observedAt: base + index * 5,
          externalProbe:
            index >= 3
              ? {
                  target: "1.1.1.1",
                  ok: false,
                  latencyMs: null,
                  failureReason: "timeout"
                }
              : {
                  target: "1.1.1.1",
                  ok: true,
                  latencyMs: 10,
                  failureReason: null
                }
        })
      );
    }

    const response = await request(harness.app).get(`/api/v1/history?from=${base}&to=${base + 30}`);
    const body = response.body as unknown as HistoryResponse;

    expect(body.samples).toHaveLength(6);
    expect(body.samples[0]?.status).toBe("ok");
    expect(body.samples[5]?.status).toBe("down");
  });
});
