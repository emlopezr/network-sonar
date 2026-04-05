import type { CurrentStatusSnapshot, PersistedMonitorSample } from "../types/monitor";
import type { ConnectionLogStore, StoredConnectionLog } from "../types/storage";

export class CurrentStatusService {
  private latestSample: PersistedMonitorSample | null = null;

  private lastChangeAt = 0;

  public constructor(
    private readonly repository: ConnectionLogStore,
    private readonly staleAfterSeconds: number
  ) {}

  public hydrate(): void {
    const latest = this.repository.getLatest();

    if (!latest) {
      return;
    }

    this.latestSample = latest;
    this.lastChangeAt = this.findLastChangeAt(latest);
  }

  public update(sample: PersistedMonitorSample): CurrentStatusSnapshot {
    if (!this.latestSample || this.latestSample.status !== sample.status) {
      this.lastChangeAt = sample.observedAt;
    }

    this.latestSample = sample;
    return this.getCurrentSnapshot(sample.observedAt);
  }

  public getCurrentSnapshot(now = Math.floor(Date.now() / 1000)): CurrentStatusSnapshot {
    if (!this.latestSample) {
      return {
        observedAt: 0,
        status: "stale",
        externalTarget: "",
        externalOk: false,
        externalLatencyMs: null,
        failureReason: null,
        staleAfterSeconds: this.staleAfterSeconds,
        lastChangeAt: 0
      };
    }

    const isStale = now - this.latestSample.observedAt > this.staleAfterSeconds;

    return {
      observedAt: this.latestSample.observedAt,
      status: isStale ? "stale" : this.latestSample.status,
      externalTarget: this.latestSample.externalTarget,
      externalOk: this.latestSample.externalOk,
      externalLatencyMs: this.latestSample.externalLatencyMs,
      failureReason: this.latestSample.failureReason,
      staleAfterSeconds: this.staleAfterSeconds,
      lastChangeAt: this.lastChangeAt || this.latestSample.observedAt
    };
  }

  private findLastChangeAt(latest: StoredConnectionLog): number {
    const recent = this.repository.getRecent(10_000);

    let lastChangeAt = latest.observedAt;

    for (const sample of recent) {
      if (sample.status !== latest.status) {
        break;
      }

      lastChangeAt = sample.observedAt;
    }

    return lastChangeAt;
  }
}
