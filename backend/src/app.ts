import path from "node:path";

import express from "express";

import { createBootstrapRouter } from "./api/routes/bootstrap";
import { createHealthRouter } from "./api/routes/health";
import { createHistoryRouter } from "./api/routes/history";
import { createStatusStreamRouter } from "./api/sse/status-stream";
import type { AppConfig } from "./config";
import type { CurrentStatusService } from "./services/current-status-service";
import type { MonitorEventBus } from "./services/event-bus";
import type { HistoryService } from "./services/history-service";

export interface AppDependencies {
  config: AppConfig;
  currentStatusService: CurrentStatusService;
  historyService: HistoryService;
  eventBus: MonitorEventBus;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(createHealthRouter());
  app.use(
    createBootstrapRouter(
      dependencies.currentStatusService,
      dependencies.historyService,
      dependencies.config.monitor.retentionDays,
      dependencies.config.monitor.intervalSeconds
    )
  );
  app.use(createHistoryRouter(dependencies.historyService));
  app.use(
    createStatusStreamRouter(
      dependencies.currentStatusService,
      dependencies.eventBus,
      dependencies.config.monitor.heartbeatSeconds
    )
  );

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(dependencies.config.frontendDistPath));
    app.get(/^\/(?!api|health).*/, (_request, response) => {
      response.sendFile(path.join(dependencies.config.frontendDistPath, "index.html"));
    });
  }

  return app;
}
