import { createApp } from "./app";
import { loadConfig } from "./config";
import { ConnectionLogRepository } from "./data/connection-log-repository";
import { initializeDatabase } from "./data/db";
import { MonitorSettingsRepository } from "./data/monitor-settings-repository";
import { PurgeService } from "./data/purge-service";
import { MonitorScheduler } from "./network/monitor-scheduler";
import { CurrentStatusService } from "./services/current-status-service";
import { MonitorEventBus } from "./services/event-bus";
import { HistoryService } from "./services/history-service";
import { MonitorService } from "./services/monitor-service";
import { MonitorSettingsService } from "./services/monitor-settings-service";

export function main(): void {
  const config = loadConfig();
  const database = initializeDatabase(config.monitor.dbPath);
  const repository = new ConnectionLogRepository(database);
  const monitorSettingsRepository = new MonitorSettingsRepository(database);
  const currentStatusService = new CurrentStatusService(
    repository,
    config.monitor.staleAfterSeconds
  );
  const historyService = new HistoryService(repository, config.monitor.intervalSeconds);
  const eventBus = new MonitorEventBus();
  const monitorSettingsService = new MonitorSettingsService(
    monitorSettingsRepository,
    eventBus,
    config.monitor.targets,
    config.monitor.roundRobinEnabled
  );
  monitorSettingsService.initialize();
  const monitorService = new MonitorService(
    repository,
    currentStatusService,
    eventBus,
    historyService
  );
  const purgeService = new PurgeService(repository, config.monitor.retentionDays);
  const scheduler = new MonitorScheduler(
    config.monitor,
    monitorService,
    purgeService,
    monitorSettingsService
  );
  const app = createApp({
    config,
    currentStatusService,
    historyService,
    eventBus,
    monitorSettingsService
  });

  const server = app.listen(config.port, () => {
    console.log(`Network Sonar listening on http://127.0.0.1:${config.port}`);
  });

  scheduler.start();

  const shutdown = () => {
    scheduler.stop();
    server.close(() => {
      database.close();
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (require.main === module) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}
