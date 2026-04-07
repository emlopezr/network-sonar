import path from "node:path";

import express from "express";

import { createBootstrapRouter } from "./api/routes/bootstrap";
import { createHealthRouter } from "./api/routes/health";
import { createHistoryRouter } from "./api/routes/history";
import { createIncidentsRouter } from "./api/routes/incidents";
import { createMonitorRuntimeRouter } from "./api/routes/monitor-runtime";
import { createMonitorSettingsRouter } from "./api/routes/monitor-settings";
import { createStatusStreamRouter } from "./api/sse/status-stream";
import type { AppConfig } from "./config";
import type { CurrentStatusService } from "./services/current-status-service";
import type { MonitorEventBus } from "./services/event-bus";
import type { HistoryService } from "./services/history-service";
import type { MonitorRuntimeService } from "./services/monitor-runtime-service";
import type { MonitorSettingsService } from "./services/monitor-settings-service";

export interface AppDependencies {
  config: AppConfig;
  currentStatusService: CurrentStatusService;
  historyService: HistoryService;
  eventBus: MonitorEventBus;
  monitorSettingsService: MonitorSettingsService;
  monitorRuntimeService: MonitorRuntimeService;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: http://127.0.0.1 http://localhost",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'"
      ].join("; ")
    );
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use(createHealthRouter());
  app.use(
    createBootstrapRouter(
      dependencies.currentStatusService,
      dependencies.historyService,
      dependencies.config.monitor.retentionDays,
      dependencies.config.monitor.intervalSeconds,
      dependencies.monitorSettingsService,
      dependencies.monitorRuntimeService
    )
  );
  app.use(createHistoryRouter(dependencies.historyService));
  app.use(createIncidentsRouter(dependencies.historyService));
  app.use(createMonitorSettingsRouter(dependencies.monitorSettingsService));
  app.use(createMonitorRuntimeRouter(dependencies.monitorRuntimeService));
  app.use(
    createStatusStreamRouter(
      dependencies.currentStatusService,
      dependencies.eventBus,
      dependencies.config.monitor.heartbeatSeconds,
      dependencies.monitorSettingsService,
      dependencies.monitorRuntimeService
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
