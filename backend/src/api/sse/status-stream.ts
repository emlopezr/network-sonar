import type { Response } from "express";
import { Router } from "express";

import type { CurrentStatusService } from "../../services/current-status-service";
import type { MonitorEventBus } from "../../services/event-bus";
import type { MonitorSettingsService } from "../../services/monitor-settings-service";

function writeEvent(response: Response, eventName: string, payload: unknown): void {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function createStatusStreamRouter(
  currentStatusService: CurrentStatusService,
  eventBus: MonitorEventBus,
  heartbeatSeconds: number,
  monitorSettingsService: MonitorSettingsService
): Router {
  const router = Router();

  router.get("/api/v1/events", (_request, response) => {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });

    response.write("retry: 5000\n\n");
    writeEvent(response, "snapshot", {
      current: currentStatusService.getCurrentSnapshot()
    });
    writeEvent(response, "settings", {
      monitorSettings: monitorSettingsService.getSettings()
    });

    const unsubscribeSnapshot = eventBus.subscribe("snapshot", (snapshot) => {
      writeEvent(response, "snapshot", { current: snapshot });
    });
    const unsubscribeSample = eventBus.subscribe("sample", (sample) => {
      writeEvent(response, "sample", sample);
    });
    const unsubscribeSettings = eventBus.subscribe("settings", (settings) => {
      writeEvent(response, "settings", { monitorSettings: settings });
    });

    const heartbeat = setInterval(() => {
      writeEvent(response, "heartbeat", { now: Math.floor(Date.now() / 1000) });
    }, heartbeatSeconds * 1000);

    response.on("close", () => {
      clearInterval(heartbeat);
      unsubscribeSnapshot();
      unsubscribeSample();
      unsubscribeSettings();
      response.end();
    });
  });

  return router;
}
