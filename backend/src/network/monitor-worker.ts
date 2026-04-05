import path from "node:path";
import { Worker } from "node:worker_threads";

import type { WorkerCycleRequest, WorkerCycleResult } from "../types/monitor";

interface WorkerBootstrap {
  filename: string;
  options: ConstructorParameters<typeof Worker>[1];
}

function resolveWorkerBootstrap(): WorkerBootstrap {
  if (__filename.endsWith(".ts")) {
    const entryPath = path.resolve(__dirname, "worker-entry.ts");
    const source = `const { register } = require('tsx/cjs/api'); register(); require(${JSON.stringify(entryPath)});`;

    return {
      filename: source,
      options: {
        eval: true
      }
    };
  }

  return {
    filename: path.resolve(__dirname, "worker-entry.js"),
    options: undefined
  };
}

export function runMonitorWorker(request: WorkerCycleRequest): Promise<WorkerCycleResult> {
  const workerBootstrap = resolveWorkerBootstrap();

  return new Promise<WorkerCycleResult>((resolve, reject) => {
    const worker = new Worker(workerBootstrap.filename, {
      ...workerBootstrap.options,
      workerData: request,
    });

    worker.once("message", (message: WorkerCycleResult | { error: string }) => {
      if ("error" in message) {
        reject(new Error(message.error));
        return;
      }

      resolve(message);
    });

    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}
