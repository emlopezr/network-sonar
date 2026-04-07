import type Database from "better-sqlite3";
import type { Express } from "express";

import { createApp } from "../../backend/src/app";
import type { AppConfig } from "../../backend/src/config";
import { ConnectionLogRepository } from "../../backend/src/data/connection-log-repository";
import { initializeDatabase } from "../../backend/src/data/db";
import { MonitorStateTransitionRepository } from "../../backend/src/data/monitor-state-transition-repository";
import { MonitorSettingsRepository } from "../../backend/src/data/monitor-settings-repository";
import { PurgeService } from "../../backend/src/data/purge-service";
import { MonitorScheduler } from "../../backend/src/network/monitor-scheduler";
import { CurrentStatusService } from "../../backend/src/services/current-status-service";
import { MonitorEventBus } from "../../backend/src/services/event-bus";
import { HistoryService } from "../../backend/src/services/history-service";
import { MonitorRuntimeService } from "../../backend/src/services/monitor-runtime-service";
import { MonitorService } from "../../backend/src/services/monitor-service";
import { MonitorSettingsService } from "../../backend/src/services/monitor-settings-service";
import type { WorkerCycleRequest, WorkerCycleResult } from "../../backend/src/types/monitor";

export interface TestHarness {
  app: Express;
  config: AppConfig;
  database: Database.Database;
  repository: ConnectionLogRepository;
  transitionRepository: MonitorStateTransitionRepository;
  purgeService: PurgeService;
  currentStatusService: CurrentStatusService;
  historyService: HistoryService;
  eventBus: MonitorEventBus;
  monitorRuntimeService: MonitorRuntimeService;
  monitorSettingsService: MonitorSettingsService;
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
    host: "127.0.0.1",
    port: 4044,
    frontendDistPath: "/tmp/network-sonar-test-dist",
    monitor: {
      targets: ["1.1.1.1", "8.8.8.8"],
      intervalSeconds: 5,
      retentionDays: 30,
      dbPath: ":memory:",
      staleAfterSeconds: 15,
      pingTimeoutMs: 3000,
      pingBinary: "ping",
      heartbeatSeconds: 15,
      roundRobinEnabled: false,
      confirmDownAfter: 2,
      confirmUpAfter: 2
    }
  };

  const database = initializeDatabase(config.monitor.dbPath);
  const repository = new ConnectionLogRepository(database);
  const transitionRepository = new MonitorStateTransitionRepository(database);
  const monitorSettingsRepository = new MonitorSettingsRepository(database);
  const currentStatusService = new CurrentStatusService(
    repository,
    transitionRepository,
    monitorSettingsRepository,
    config.monitor.staleAfterSeconds
  );
  const historyService = new HistoryService(
    repository,
    transitionRepository,
    config.monitor.intervalSeconds
  );
  const eventBus = new MonitorEventBus();
  const monitorRuntimeService = new MonitorRuntimeService(
    monitorSettingsRepository,
    eventBus
  );
  const monitorSettingsService = new MonitorSettingsService(
    monitorSettingsRepository,
    eventBus,
    config.monitor.targets,
    config.monitor.roundRobinEnabled,
    {
      confirmDownAfter: config.monitor.confirmDownAfter,
      confirmUpAfter: config.monitor.confirmUpAfter
    }
  );
  monitorSettingsService.initialize();
  const monitorService = new MonitorService(
    repository,
    currentStatusService,
    eventBus,
    monitorSettingsService
  );
  const purgeService = new PurgeService(repository, config.monitor.retentionDays);

  monitorService.initialize();

  return {
    app: createApp({
      config,
      currentStatusService,
      historyService,
      eventBus,
      monitorRuntimeService,
      monitorSettingsService
    }),
    config,
    database,
    repository,
    transitionRepository,
    purgeService,
    currentStatusService,
    historyService,
    eventBus,
    monitorRuntimeService,
    monitorSettingsService,
    monitorService,
    createScheduler: (runner) =>
      new MonitorScheduler(
        config.monitor,
        monitorService,
        purgeService,
        monitorSettingsService,
        monitorRuntimeService,
        runner
      ),
    close: () => {
      database.close();
    }
  };
}
