export const rangePresets = ["1h", "6h", "24h", "7d", "30d"] as const;
export type RangePreset = (typeof rangePresets)[number];

export type MonitorStatus = "ok" | "down";
export type SnapshotStatus = MonitorStatus | "stale";

export interface MonitorSample {
  observedAt: number;
  status: MonitorStatus;
  externalTarget: string;
  externalOk: boolean;
  externalLatencyMs: number | null;
  failureReason: string | null;
}

export interface CurrentStatusSnapshot {
  observedAt: number;
  status: SnapshotStatus;
  externalTarget: string;
  externalOk: boolean;
  externalLatencyMs: number | null;
  failureReason: string | null;
  staleAfterSeconds: number;
  lastChangeAt: number;
}

export interface BootstrapResponse {
  current: CurrentStatusSnapshot;
  history: MonitorSample[];
  retentionDays: number;
  sampleIntervalSeconds: number;
}

export interface HistoryResponse {
  from: number;
  to: number;
  samples: MonitorSample[];
}

export interface SnapshotEventPayload {
  current: CurrentStatusSnapshot;
}
