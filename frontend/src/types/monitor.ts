export const rangePresets = ["1h", "6h", "24h", "7d", "30d"] as const;
export type RangePreset = (typeof rangePresets)[number];

export type MonitorStatus = "ok" | "down";
export type SnapshotStatus = MonitorStatus | "stale";
export type OutageIncidentStatus = "ongoing" | "resolved";
export type MonitorProviderCompany = "Cloudflare" | "Google" | "Quad9" | "OpenDNS";
export type MonitorProviderKind = "default" | "custom";

export interface MonitorProviderRecord {
  id: number;
  label: string;
  target: string;
  company: MonitorProviderCompany | null;
  logoUrl: string | null;
  kind: MonitorProviderKind;
  isDefault: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

export interface MonitorSettings {
  roundRobinEnabled: boolean;
  providers: MonitorProviderRecord[];
}

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
  monitorSettings: MonitorSettings;
}

export interface HistoryResponse {
  from: number;
  to: number;
  samples: MonitorSample[];
}

export interface OutageIncident {
  startedAt: number;
  lastObservedAt: number;
  resolvedAt: number | null;
  durationSeconds: number;
  sampleCount: number;
  externalTarget: string;
  latestFailureReason: string | null;
  latestLatencyMs: number | null;
  status: OutageIncidentStatus;
  samples: MonitorSample[];
}

export interface IncidentHistoryResponse {
  from: number;
  to: number;
  incidents: OutageIncident[];
}

export interface SnapshotEventPayload {
  current: CurrentStatusSnapshot;
}

export interface SettingsEventPayload {
  monitorSettings: MonitorSettings;
}

export interface UpdateMonitorSettingsRequest {
  roundRobinEnabled: boolean;
}

export interface CreateMonitorProviderRequest {
  label: string;
  target: string;
  logoUrl?: string;
}

export interface UpdateMonitorProviderRequest {
  label?: string;
  target?: string;
  logoUrl?: string;
  isEnabled?: boolean;
}

export interface ReorderMonitorProvidersRequest {
  providerIds: number[];
}
