import { describe, expect, it, vi } from "vitest";

import { buildProbeOrder, runProbeSequence } from "../../backend/src/network/target-probe";
import type { MonitorProbeResult } from "../../backend/src/types/monitor";

describe("buildProbeOrder", () => {
  it("keeps the first provider first when round robin is not advanced", () => {
    expect(buildProbeOrder(["1.1.1.1", "8.8.8.8", "1.0.0.1"], 0)).toEqual([
      "1.1.1.1",
      "8.8.8.8",
      "1.0.0.1"
    ]);
  });

  it("rotates the starting provider for later cycles", () => {
    expect(buildProbeOrder(["1.1.1.1", "8.8.8.8", "1.0.0.1"], 1)).toEqual([
      "8.8.8.8",
      "1.0.0.1",
      "1.1.1.1"
    ]);
  });
});

describe("runProbeSequence", () => {
  it("falls back to the next provider when the first one fails", async () => {
    const probeRunner = vi
      .fn()
      .mockResolvedValueOnce({
        target: "1.1.1.1",
        ok: false,
        latencyMs: null,
        failureReason: "timeout"
      })
      .mockResolvedValueOnce({
        target: "8.8.8.8",
        ok: true,
        latencyMs: 21,
        failureReason: null
      });

    const result = await runProbeSequence("ping", ["1.1.1.1", "8.8.8.8"], 3000, probeRunner);

    expect(result.externalTarget).toBe("8.8.8.8");
    expect(result.externalProbe).toMatchObject({
      target: "8.8.8.8",
      ok: true,
      latencyMs: 21,
      failureReason: null
    });
    expect(probeRunner).toHaveBeenCalledTimes(2);
  });

  it("probes all configured providers in parallel and keeps the configured priority order", async () => {
    const probeRunner = vi.fn((_: string, target: string): Promise<MonitorProbeResult> => {
      if (target === "1.1.1.1") {
        return new Promise<MonitorProbeResult>((resolve) => {
          setTimeout(() => {
            resolve({
              target,
              ok: false,
              latencyMs: null,
              failureReason: "timeout"
            });
          }, 40);
        });
      }

      if (target === "8.8.8.8") {
        return new Promise<MonitorProbeResult>((resolve) => {
          setTimeout(() => {
            resolve({
              target,
              ok: true,
              latencyMs: 18,
              failureReason: null
            });
          }, 5);
        });
      }

      return Promise.resolve({
        target,
        ok: true,
        latencyMs: 10,
        failureReason: null
      });
    });

    const startedAt = Date.now();
    const result = await runProbeSequence(
      "ping",
      ["1.1.1.1", "8.8.8.8", "9.9.9.9"],
      3000,
      probeRunner
    );
    const elapsedMs = Date.now() - startedAt;

    expect(result.externalTarget).toBe("8.8.8.8");
    expect(result.externalProbe).toMatchObject({
      target: "8.8.8.8",
      ok: true,
      latencyMs: 18
    });
    expect(probeRunner).toHaveBeenCalledTimes(3);
    expect(elapsedMs).toBeLessThan(80);
  });

  it("marks the cycle as down only after every provider fails", async () => {
    const probeRunner = vi
      .fn()
      .mockResolvedValueOnce({
        target: "1.1.1.1",
        ok: false,
        latencyMs: null,
        failureReason: "timeout"
      })
      .mockResolvedValueOnce({
        target: "8.8.8.8",
        ok: false,
        latencyMs: null,
        failureReason: "timeout"
      });

    const result = await runProbeSequence("ping", ["1.1.1.1", "8.8.8.8"], 3000, probeRunner);

    expect(result.externalTarget).toBe("8.8.8.8");
    expect(result.externalProbe).toMatchObject({
      target: "8.8.8.8",
      ok: false,
      failureReason: "timeout"
    });
  });

  it("normalizes mixed failures when different providers fail for different reasons", async () => {
    const probeRunner = vi
      .fn()
      .mockResolvedValueOnce({
        target: "1.1.1.1",
        ok: false,
        latencyMs: null,
        failureReason: "timeout"
      })
      .mockResolvedValueOnce({
        target: "8.8.8.8",
        ok: false,
        latencyMs: null,
        failureReason: "command_failed"
      });

    const result = await runProbeSequence("ping", ["1.1.1.1", "8.8.8.8"], 3000, probeRunner);

    expect(result.externalProbe.failureReason).toBe("all_targets_failed");
  });
});
