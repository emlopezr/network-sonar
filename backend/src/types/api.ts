import type { CurrentStatusSnapshot, PersistedMonitorSample } from "./monitor";

export const rangePresets = ["1h", "6h", "24h", "7d", "30d"] as const;
export type RangePreset = (typeof rangePresets)[number];
export type OutageIncidentStatus = "ongoing" | "resolved";
export type TimelineSegmentStatus = "ok" | "down" | "no_data";
export type MonitorProviderCompany = "Cloudflare" | "Google" | "Quad9" | "OpenDNS";
export type MonitorProviderKind = "default" | "custom";

export interface MonitorProviderSeed {
  target: string;
  company: MonitorProviderCompany;
  label: string;
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

export interface BootstrapResponse {
  current: CurrentStatusSnapshot;
  history: PersistedMonitorSample[];
  historySegments: TimelineSegment[];
  retentionDays: number;
  sampleIntervalSeconds: number;
  monitorSettings: MonitorSettings;
}

export interface HistoryResponse {
  from: number;
  to: number;
  samples: PersistedMonitorSample[];
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
  samples: PersistedMonitorSample[];
}

export interface IncidentHistoryResponse {
  from: number;
  to: number;
  incidents: OutageIncident[];
}

export interface HealthResponse {
  ok: true;
  now: number;
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
