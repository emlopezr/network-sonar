import type { PersistedMonitorSample, WorkerCycleResult } from "../types/monitor";

export function classifyMonitorCycle(cycle: WorkerCycleResult): PersistedMonitorSample {
  if (cycle.externalProbe.ok) {
    return {
      observedAt: cycle.observedAt,
      status: "ok",
      externalTarget: cycle.externalTarget,
      externalOk: true,
      externalLatencyMs: cycle.externalProbe.latencyMs,
      failureReason: null
    };
  }

  return {
    observedAt: cycle.observedAt,
    status: "down",
    externalTarget: cycle.externalTarget,
    externalOk: false,
    externalLatencyMs: cycle.externalProbe.latencyMs,
    failureReason: cycle.externalProbe.failureReason ?? "probe_failed"
  };
}
