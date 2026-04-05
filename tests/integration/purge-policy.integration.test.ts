import { afterEach, describe, expect, it } from "vitest";

import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("purge policy", () => {
  const harness = createTestHarness();

  afterEach(() => {
    harness.close();
  });

  it("purges old data on startup and respects the retention window", async () => {
    const now = Math.floor(Date.now() / 1000);
    const oldObservedAt = now - 31 * 24 * 60 * 60;
    const freshObservedAt = now;

    harness.repository.insert({
      observedAt: oldObservedAt,
      status: "ok",
      externalTarget: "1.1.1.1",
      externalOk: true,
      externalLatencyMs: 10,
      failureReason: null
    });

    const scheduler = harness.createScheduler(() =>
      Promise.resolve(createCycle({ observedAt: freshObservedAt }))
    );
    scheduler.start();
    await Promise.resolve();
    scheduler.stop();

    const samples = harness.repository.getRange(oldObservedAt - 10, freshObservedAt + 10);
    expect(samples.some((sample) => sample.observedAt === oldObservedAt)).toBe(false);
    expect(samples.some((sample) => sample.observedAt === freshObservedAt)).toBe(true);
  });
});
