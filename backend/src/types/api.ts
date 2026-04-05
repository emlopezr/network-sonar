import type { CurrentStatusSnapshot, PersistedMonitorSample } from "./monitor";

export const rangePresets = ["1h", "6h", "24h", "7d", "30d"] as const;
export type RangePreset = (typeof rangePresets)[number];

export interface BootstrapResponse {
  current: CurrentStatusSnapshot;
  history: PersistedMonitorSample[];
  retentionDays: number;
  sampleIntervalSeconds: number;
}

export interface HistoryResponse {
  from: number;
  to: number;
  samples: PersistedMonitorSample[];
}

export interface HealthResponse {
  ok: true;
  now: number;
}
