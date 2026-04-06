import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MonitorScheduler } from "../../backend/src/network/monitor-scheduler";
import type { TestHarness } from "../helpers/test-harness";
import { createCycle, createTestHarness } from "../helpers/test-harness";

describe("MonitorScheduler", () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = createTestHarness();
  });

  afterEach(() => {
    harness.close();
  });

  it("passes providers in fallback order by default", async () => {
    const workerRunner = vi.fn().mockResolvedValue(createCycle());
    const scheduler = harness.createScheduler(workerRunner);

    await (scheduler as unknown as { executeCycle: () => Promise<void> }).executeCycle();

    expect(workerRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        externalTargets: ["1.1.1.1", "8.8.8.8"]
      })
    );
  });

  it("rotates the starting provider when round robin is enabled", async () => {
    const workerRunner = vi
      .fn()
      .mockResolvedValueOnce(createCycle({ externalTarget: "1.1.1.1" }))
      .mockResolvedValueOnce(createCycle({ externalTarget: "8.8.8.8" }));
    const scheduler = new MonitorScheduler(
      {
        ...harness.config.monitor
      },
      harness.monitorService,
      harness.purgeService,
      harness.monitorSettingsService,
      workerRunner
    );
    harness.monitorSettingsService.updateSettings({ roundRobinEnabled: true });

    await (scheduler as unknown as { executeCycle: () => Promise<void> }).executeCycle();
    await (scheduler as unknown as { executeCycle: () => Promise<void> }).executeCycle();

    expect(workerRunner).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        externalTargets: ["1.1.1.1", "8.8.8.8"]
      })
    );
    expect(workerRunner).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        externalTargets: ["8.8.8.8", "1.1.1.1"]
      })
    );
  });

  it("reads a runtime round robin change without recreating the scheduler", async () => {
    const workerRunner = vi
      .fn()
      .mockResolvedValueOnce(createCycle({ externalTarget: "1.1.1.1" }))
      .mockResolvedValueOnce(createCycle({ externalTarget: "8.8.8.8" }));
    const scheduler = harness.createScheduler(workerRunner);

    await (scheduler as unknown as { executeCycle: () => Promise<void> }).executeCycle();
    harness.monitorSettingsService.updateSettings({ roundRobinEnabled: true });
    await (scheduler as unknown as { executeCycle: () => Promise<void> }).executeCycle();

    expect(workerRunner).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        externalTargets: ["1.1.1.1", "8.8.8.8"]
      })
    );
    expect(workerRunner).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        externalTargets: ["8.8.8.8", "1.1.1.1"]
      })
    );
  });
});
