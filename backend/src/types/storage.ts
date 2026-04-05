import type { CurrentStatusSnapshot, PersistedMonitorSample } from "./monitor";

export interface StoredConnectionLog extends PersistedMonitorSample {
  id: number;
  createdAt: number;
}

export interface ConnectionLogStore {
  insert(sample: PersistedMonitorSample): StoredConnectionLog;
  getLatest(): StoredConnectionLog | null;
  getRecent(limit: number): StoredConnectionLog[];
  getRange(from: number, to: number): StoredConnectionLog[];
  purgeOlderThan(cutoffUnixSeconds: number): number;
}

export interface MonitorReadModel {
  getCurrentSnapshot(now?: number): CurrentStatusSnapshot;
  getHistory(from: number, to: number): PersistedMonitorSample[];
}
