import type { OutageIncident } from "../types/api";
import type { PersistedMonitorSample } from "../types/monitor";
import type { ConnectionLogStore } from "../types/storage";

export class HistoryService {
  public constructor(
    private readonly repository: ConnectionLogStore,
    private readonly sampleIntervalSeconds: number
  ) {}

  public getHistory(from: number, to: number): PersistedMonitorSample[] {
    return this.repository.getRange(from, to);
  }

  public getIncidents(from: number, to: number): OutageIncident[] {
    const samples = this.repository.getRange(from, to);
    const incidents: OutageIncident[] = [];
    let pendingIncidentSamples: PersistedMonitorSample[] = [];

    for (const sample of samples) {
      if (sample.status === "down") {
        pendingIncidentSamples.push(sample);
        continue;
      }

      if (pendingIncidentSamples.length > 0) {
        incidents.push(this.buildIncident(pendingIncidentSamples, sample.observedAt));
        pendingIncidentSamples = [];
      }
    }

    if (pendingIncidentSamples.length > 0) {
      incidents.push(this.buildIncident(pendingIncidentSamples, null));
    }

    return incidents;
  }

  private buildIncident(
    samples: PersistedMonitorSample[],
    resolvedAt: number | null
  ): OutageIncident {
    if (samples.length === 0) {
      throw new Error("Cannot build an incident without samples");
    }

    const firstSample = samples[0]!;
    const lastSample = samples[samples.length - 1]!;

    return {
      startedAt: firstSample.observedAt,
      lastObservedAt: lastSample.observedAt,
      resolvedAt,
      durationSeconds: lastSample.observedAt - firstSample.observedAt + this.sampleIntervalSeconds,
      sampleCount: samples.length,
      externalTarget: lastSample.externalTarget,
      latestFailureReason: lastSample.failureReason,
      latestLatencyMs: lastSample.externalLatencyMs,
      status: resolvedAt === null ? "ongoing" : "resolved",
      samples
    };
  }
}
