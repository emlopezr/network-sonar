import { classifyMonitorCycle } from "./monitor-cycle-service";
import type { CurrentStatusService } from "./current-status-service";
import type { MonitorEventBus } from "./event-bus";
import type { MonitorSettingsService } from "./monitor-settings-service";
import type { PersistedMonitorSample, WorkerCycleResult } from "../types/monitor";
import type { ConnectionLogStore } from "../types/storage";

export class MonitorService {
  public constructor(
    private readonly repository: ConnectionLogStore,
    private readonly currentStatusService: CurrentStatusService,
    private readonly eventBus: MonitorEventBus,
    private readonly monitorSettingsService: MonitorSettingsService
  ) {}

  public initialize(): void {
    this.currentStatusService.hydrate();
  }

  public processCycle(cycle: WorkerCycleResult): PersistedMonitorSample {
    const sample = classifyMonitorCycle(cycle);
    const persisted = this.repository.insert(sample);
    const snapshot = this.currentStatusService.update(
      persisted,
      this.monitorSettingsService.getThresholds()
    );

    this.eventBus.publishSnapshot(snapshot);
    this.eventBus.publishSample(persisted);

    return persisted;
  }
}
