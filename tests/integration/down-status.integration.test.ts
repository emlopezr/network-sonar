import { afterEach, describe, expect, it } from "vitest";

import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("down sample persistence", () => {
  const harness = createTestHarness();

  afterEach(() => {
    harness.close();
  });

  it("persists down samples with the probe failure reason", () => {
    const base = Math.floor(Date.now() / 1000);

    harness.monitorService.processCycle(
      createCycle({
        observedAt: base,
        externalProbe: {
          target: "1.1.1.1",
          ok: false,
          latencyMs: null,
          failureReason: "timeout"
        }
      })
    );

    const samples = harness.repository.getRange(base, base);

    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({
      status: "down",
      externalOk: false,
      failureReason: "timeout"
    });
  });
});
