import { Router } from "express";

import { rangePresets } from "../../types/api";
import type { BootstrapResponse, RangePreset } from "../../types/api";
import type { CurrentStatusService } from "../../services/current-status-service";
import type { HistoryService } from "../../services/history-service";
import type { MonitorRuntimeService } from "../../services/monitor-runtime-service";
import type { MonitorSettingsService } from "../../services/monitor-settings-service";

const rangeSeconds: Record<RangePreset, number> = {
  "1h": 60 * 60,
  "6h": 6 * 60 * 60,
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60
};

function parseRange(rawValue: unknown): RangePreset {
  const range = typeof rawValue === "string" ? rawValue : "24h";
  return rangePresets.includes(range as RangePreset) ? (range as RangePreset) : "24h";
}

export function createBootstrapRouter(
  currentStatusService: CurrentStatusService,
  historyService: HistoryService,
  retentionDays: number,
  sampleIntervalSeconds: number,
  monitorSettingsService: MonitorSettingsService,
  monitorRuntimeService: MonitorRuntimeService
): Router {
  const router = Router();

  router.get("/api/v1/bootstrap", (request, response) => {
    const range = parseRange(request.query.range);
    const to = Math.floor(Date.now() / 1000);
    const from = to - rangeSeconds[range];

    const payload: BootstrapResponse = {
      current: currentStatusService.getCurrentSnapshot(to),
      history: historyService.getHistory(from, to),
      historySegments: historyService.getTimelineSegments(from, to),
      retentionDays,
      sampleIntervalSeconds,
      monitorSettings: monitorSettingsService.getSettings(),
      monitorRuntime: monitorRuntimeService.getRuntime()
    };

    response.json(payload);
  });

  return router;
}
