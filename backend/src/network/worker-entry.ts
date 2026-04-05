import { parentPort, workerData } from "node:worker_threads";

import { runPingCommand } from "./ping-command";
import type { WorkerCycleRequest, WorkerCycleResult } from "../types/monitor";

async function performWorkerCycle(request: WorkerCycleRequest): Promise<WorkerCycleResult> {
  const observedAt = request.observedAt ?? Math.floor(Date.now() / 1000);
  const externalProbe = await runPingCommand(
    request.pingBinary,
    request.externalTarget,
    request.timeoutMs
  );

  if (externalProbe.ok) {
    return {
      observedAt,
      externalTarget: request.externalTarget,
      externalProbe
    };
  }

  return {
    observedAt,
    externalTarget: request.externalTarget,
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
