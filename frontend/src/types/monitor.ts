export const rangePresets = ["1h", "6h", "24h", "7d", "30d"] as const;
export type RangePreset = (typeof rangePresets)[number];

export type MonitorStatus = "ok" | "down";
export type SnapshotStatus = MonitorStatus | "stale";
export type OutageIncidentStatus = "ongoing" | "resolved";
export type TimelineSegmentStatus = MonitorStatus | "no_data";
export type MonitorRuntimeMode = "running" | "paused";
export type MonitorProviderCompany = "Cloudflare" | "Google" | "Quad9" | "OpenDNS";
export type MonitorProviderKind = "default" | "custom";

export interface MonitorRuntime {
  mode: MonitorRuntimeMode;
}

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
  confirmDownAfter: number;
  confirmUpAfter: number;
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
  historySegments: TimelineSegment[];
  retentionDays: number;
  sampleIntervalSeconds: number;
  monitorSettings: MonitorSettings;
  monitorRuntime: MonitorRuntime;
}

export interface HistoryResponse {
  from: number;
  to: number;
  samples: MonitorSample[];
}

export interface TimelineSegment {
  status: TimelineSegmentStatus;
  startedAt: number;
  endedAt: number | null;
  visibleStart: number;
  visibleEnd: number;
  durationSeconds: number;
  sampleCount: number;
  lastObservedAt: number | null;
  latestFailureReason: string | null;
  latestLatencyMs: number | null;
  startedBeforeRange: boolean;
  endsAfterRange: boolean;
}

export interface TimelineSegmentsResponse {
  from: number;
  to: number;
  segments: TimelineSegment[];
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

export interface RuntimeEventPayload {
  monitorRuntime: MonitorRuntime;
}

export interface UpdateMonitorSettingsRequest {
  roundRobinEnabled?: boolean;
  confirmDownAfter?: number;
  confirmUpAfter?: number;
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

export interface UpdateMonitorRuntimeRequest {
  mode: MonitorRuntimeMode;
}
