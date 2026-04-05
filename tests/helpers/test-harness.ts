import type Database from "better-sqlite3";
import type { Express } from "express";

import { createApp } from "../../backend/src/app";
import type { AppConfig } from "../../backend/src/config";
import { ConnectionLogRepository } from "../../backend/src/data/connection-log-repository";
import { initializeDatabase } from "../../backend/src/data/db";
import { PurgeService } from "../../backend/src/data/purge-service";
import { MonitorScheduler } from "../../backend/src/network/monitor-scheduler";
import { CurrentStatusService } from "../../backend/src/services/current-status-service";
import { MonitorEventBus } from "../../backend/src/services/event-bus";
import { HistoryService } from "../../backend/src/services/history-service";
import { MonitorService } from "../../backend/src/services/monitor-service";
import type { WorkerCycleRequest, WorkerCycleResult } from "../../backend/src/types/monitor";

export interface TestHarness {
  app: Express;
  config: AppConfig;
  database: Database.Database;
  repository: ConnectionLogRepository;
  purgeService: PurgeService;
  currentStatusService: CurrentStatusService;
  historyService: HistoryService;
  eventBus: MonitorEventBus;
  monitorService: MonitorService;
  createScheduler: (runner: (request: WorkerCycleRequest) => Promise<WorkerCycleResult>) => MonitorScheduler;
  close: () => void;
}

export function createCycle(overrides: Partial<WorkerCycleResult> = {}): WorkerCycleResult {
  const observedAt = overrides.observedAt ?? Math.floor(Date.now() / 1000);

  return {
    observedAt,
    externalTarget: overrides.externalTarget ?? "1.1.1.1",
    externalProbe: overrides.externalProbe ?? {
      target: "1.1.1.1",
      ok: true,
      latencyMs: 12,
      failureReason: null
    }
  };
}

export function createTestHarness(): TestHarness {
  const config: AppConfig = {
    port: 4173,
    frontendDistPath: "/tmp/network-sonar-test-dist",
    monitor: {
      target: "1.1.1.1",
      intervalSeconds: 5,
      retentionDays: 30,
      dbPath: ":memory:",
      staleAfterSeconds: 15,
      pingTimeoutMs: 3000,
      pingBinary: "ping",
      heartbeatSeconds: 15
    }
  };

  const database = initializeDatabase(config.monitor.dbPath);
  const repository = new ConnectionLogRepository(database);
  const currentStatusService = new CurrentStatusService(repository, config.monitor.staleAfterSeconds);
  const historyService = new HistoryService(repository);
  const eventBus = new MonitorEventBus();
  const monitorService = new MonitorService(
    repository,
    currentStatusService,
    eventBus,
    historyService
  );
  const purgeService = new PurgeService(repository, config.monitor.retentionDays);

  monitorService.initialize();

  return {
    app: createApp({
      config,
      currentStatusService,
      historyService,
      eventBus
    }),
    config,
    database,
    repository,
    purgeService,
    currentStatusService,
    historyService,
    eventBus,
    monitorService,
    createScheduler: (runner) => new MonitorScheduler(config.monitor, monitorService, purgeService, runner),
    close: () => {
      database.close();
    }
  };
}
