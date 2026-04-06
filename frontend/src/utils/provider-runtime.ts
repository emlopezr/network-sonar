import type { MonitorProviderRecord, MonitorSample } from "../types/monitor";

export interface ProviderRuntimeStat {
  provider: MonitorProviderRecord;
  averageLatencyMs: number | null;
  successfulProbeCount: number;
  isCurrentProvider: boolean;
}

export function getMonitorModeLabel(roundRobinEnabled: boolean): string {
  return roundRobinEnabled ? "Round Robin" : "Primary With Fallback";
}

export function getProviderAverageLatency(
  history: MonitorSample[],
  providerTarget: string
): { averageLatencyMs: number | null; successfulProbeCount: number } {
  const successfulLatencies = history
    .filter(
      (sample) => sample.externalTarget === providerTarget && sample.externalLatencyMs !== null
    )
    .map((sample) => sample.externalLatencyMs ?? 0);

  if (successfulLatencies.length === 0) {
    return {
      averageLatencyMs: null,
      successfulProbeCount: 0
    };
  }

  const totalLatency = successfulLatencies.reduce((sum, latency) => sum + latency, 0);

  return {
    averageLatencyMs: Math.round((totalLatency / successfulLatencies.length) * 10) / 10,
    successfulProbeCount: successfulLatencies.length
  };
}

export function buildProviderRuntimeStats(
  providers: MonitorProviderRecord[],
  history: MonitorSample[],
  currentTarget: string | null
): ProviderRuntimeStat[] {
  return providers.map((provider) => ({
    provider,
    isCurrentProvider: currentTarget === provider.target,
    ...getProviderAverageLatency(history, provider.target)
  }));
}
