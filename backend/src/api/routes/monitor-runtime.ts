import { Router } from "express";

import type { UpdateMonitorRuntimeRequest } from "../../types/api";
import type { MonitorRuntimeService } from "../../services/monitor-runtime-service";

function isUpdateMonitorRuntimeRequest(value: unknown): value is UpdateMonitorRuntimeRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "mode" in value &&
    (value.mode === "running" || value.mode === "paused")
  );
}

export function createMonitorRuntimeRouter(
  monitorRuntimeService: MonitorRuntimeService
): Router {
  const router = Router();

  router.patch("/api/v1/monitor/runtime", (request, response) => {
    if (!isUpdateMonitorRuntimeRequest(request.body)) {
      response.status(400).json({
        error: "Provide mode as either running or paused."
      });
      return;
    }

    response.json(monitorRuntimeService.updateRuntime(request.body.mode));
  });

  return router;
}
