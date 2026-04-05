import { runMonitorWorker } from "./monitor-worker";
import type { PurgeService } from "../data/purge-service";
import type { MonitorService } from "../services/monitor-service";
import type { WorkerCycleRequest, WorkerCycleResult } from "../types/monitor";

type WorkerRunner = (request: WorkerCycleRequest) => Promise<WorkerCycleResult>;

export class MonitorScheduler {
  private timer: NodeJS.Timeout | null = null;

  private running = false;

  public constructor(
    private readonly config: {
      target: string;
      intervalSeconds: number;
      pingTimeoutMs: number;
      pingBinary: string;
    },
    private readonly monitorService: MonitorService,
    private readonly purgeService: PurgeService,
    private readonly workerRunner: WorkerRunner = runMonitorWorker
  ) {}

  public start(): void {
    if (this.timer) {
      return;
    }

    this.monitorService.initialize();
    this.purgeService.purgeNow(Math.floor(Date.now() / 1000));
    void this.executeCycle();
    this.timer = setInterval(() => {
      void this.executeCycle();
    }, this.config.intervalSeconds * 1000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async executeCycle(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const observedAt = Math.floor(Date.now() / 1000);
      this.purgeService.maybePurge(observedAt);

      const cycle = await this.workerRunner({
        observedAt,
        externalTarget: this.config.target,
        timeoutMs: this.config.pingTimeoutMs,
        pingBinary: this.config.pingBinary
      });

      this.monitorService.processCycle(cycle);
    } catch (error) {
      console.error("Monitor cycle failed", error);
    } finally {
      this.running = false;
    }
  }
}
