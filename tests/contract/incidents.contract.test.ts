import request from "supertest";
import { describe, expect, it } from "vitest";

import type { IncidentHistoryResponse } from "../../backend/src/types/api";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("GET /api/v1/incidents", () => {
  it("returns grouped incidents for a requested range", async () => {
    const harness = createTestHarness();
    const base = Math.floor(Date.now() / 1000) - 600;

    try {
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
      harness.monitorService.processCycle(
        createCycle({
          observedAt: base + 20,
          externalProbe: {
            target: "1.1.1.1",
            ok: false,
            latencyMs: null,
            failureReason: "icmp-unreachable"
          }
        })
      );

      const response = await request(harness.app).get(`/api/v1/incidents?from=${base}&to=${base + 20}`);
      const body = response.body as unknown as IncidentHistoryResponse;

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        from: base,
        to: base + 20
      });
      expect(body.incidents).toHaveLength(1);
      expect(body.incidents[0]).toMatchObject({
        startedAt: base + 5,
        lastObservedAt: base + 20,
        resolvedAt: null,
        durationSeconds: 20,
        sampleCount: 3,
        latestFailureReason: "icmp-unreachable",
        status: "ongoing"
      });
    } finally {
      harness.close();
    }
  });

  it("returns 400 for invalid ranges", async () => {
    const harness = createTestHarness();

    try {
      const response = await request(harness.app).get("/api/v1/incidents?from=100&to=50");

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Invalid query. Expected from and to in unix seconds."
      });
    } finally {
      harness.close();
    }
  });
});
