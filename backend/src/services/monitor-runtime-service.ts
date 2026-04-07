import type { MonitorRuntime } from "../types/api";
import type { MonitorRuntimeStore } from "../types/storage";
import type { MonitorEventBus } from "./event-bus";

export class MonitorRuntimeService {
  public constructor(
    private readonly repository: MonitorRuntimeStore,
    private readonly eventBus: MonitorEventBus
  ) {}

  public getRuntime(): MonitorRuntime {
    return this.repository.getRuntime();
  }

  public updateRuntime(mode: MonitorRuntime["mode"]): MonitorRuntime {
    this.repository.updateRuntime(mode);
    const runtime = this.getRuntime();
    this.eventBus.publishRuntime(runtime);
    return runtime;
  }

  public isPaused(): boolean {
    return this.getRuntime().mode === "paused";
  }
}
