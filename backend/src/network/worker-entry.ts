import { parentPort, workerData } from "node:worker_threads";

import { runProbeSequence } from "./target-probe";
import type { WorkerCycleRequest, WorkerCycleResult } from "../types/monitor";

async function performWorkerCycle(request: WorkerCycleRequest): Promise<WorkerCycleResult> {
  const observedAt = request.observedAt ?? Math.floor(Date.now() / 1000);
  const { externalTarget, externalProbe } = await runProbeSequence(
    request.pingBinary,
    request.externalTargets,
    request.timeoutMs
  );

  return {
    observedAt,
    externalTarget,
    externalProbe
  };
}

void performWorkerCycle(workerData as WorkerCycleRequest)
  .then((result) => {
    parentPort?.postMessage(result);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    parentPort?.postMessage({ error: message });
  });
