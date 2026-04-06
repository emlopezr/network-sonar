import { Router } from "express";

import type { IncidentHistoryResponse } from "../../types/api";
import type { HistoryService } from "../../services/history-service";

function parseUnixSeconds(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function createIncidentsRouter(historyService: HistoryService): Router {
  const router = Router();

  router.get("/api/v1/incidents", (request, response) => {
    const from = parseUnixSeconds(request.query.from);
    const to = parseUnixSeconds(request.query.to);

    if (from === null || to === null || from > to) {
      response.status(400).json({
        error: "Invalid query. Expected from and to in unix seconds."
      });
      return;
    }

    const payload: IncidentHistoryResponse = {
      from,
      to,
      incidents: historyService.getIncidents(from, to)
    };

    response.json(payload);
  });

  return router;
}
