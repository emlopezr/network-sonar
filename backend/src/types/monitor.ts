export const monitorStatuses = ["ok", "down"] as const;

export type MonitorStatus = (typeof monitorStatuses)[number];
export type SnapshotStatus = MonitorStatus | "stale";

export interface ConfirmationThresholds {
  confirmDownAfter: number;
  confirmUpAfter: number;
}

export interface PersistedMonitorSample {
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

export interface MonitorSensitivityRevision extends ConfirmationThresholds {
  id: number;
  effectiveAt: number;
  createdAt: number;
}

export interface MonitorStateTransition {
  id: number;
  status: MonitorStatus;
  effectiveAt: number;
  confirmedAt: number;
  createdAt: number;
}

export interface MonitorProbeResult {
  target: string;
  ok: boolean;
  latencyMs: number | null;
  failureReason: string | null;
}

export interface WorkerCycleRequest {
  observedAt?: number;
  externalTargets: string[];
  timeoutMs: number;
  pingBinary: string;
}

export interface WorkerCycleResult {
  observedAt: number;
  externalTarget: string;
  externalProbe: MonitorProbeResult;
}

const statusCodeMap: Record<MonitorStatus, number> = {
  ok: 0,
  down: 1
};

const codeStatusMap: Record<number, MonitorStatus> = {
  0: "ok",
  1: "down"
};

export function statusToCode(status: MonitorStatus): number {
  return statusCodeMap[status];
}

export function codeToStatus(code: number): MonitorStatus {
  const status = codeStatusMap[code];

  if (!status) {
    throw new Error(`Unsupported monitor status code: ${code}`);
  }

  return status;
}

export function isMonitorStatus(value: string): value is MonitorStatus {
  return monitorStatuses.includes(value as MonitorStatus);
}
