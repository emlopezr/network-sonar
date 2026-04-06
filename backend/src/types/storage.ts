import type {
  ConfirmationThresholds,
  CurrentStatusSnapshot,
  MonitorSensitivityRevision,
  MonitorStateTransition,
  PersistedMonitorSample
} from "./monitor";

export interface StoredConnectionLog extends PersistedMonitorSample {
  id: number;
  createdAt: number;
}

export interface ConnectionLogStore {
  insert(sample: PersistedMonitorSample): StoredConnectionLog;
  getLatest(): StoredConnectionLog | null;
  getRecent(limit: number): StoredConnectionLog[];
  getRange(from: number, to: number): StoredConnectionLog[];
  getAll(): StoredConnectionLog[];
  purgeOlderThan(cutoffUnixSeconds: number): number;
}

export interface TransitionStore {
  insert(transition: Omit<MonitorStateTransition, "id" | "createdAt">): MonitorStateTransition;
  listRange(from: number, to: number): MonitorStateTransition[];
  getLatestBeforeOrAt(at: number): MonitorStateTransition | null;
  getAll(): MonitorStateTransition[];
  replaceAll(transitions: Omit<MonitorStateTransition, "id" | "createdAt">[]): void;
}

export interface MonitorSettingsStore extends ConfirmationThresholds {
  roundRobinEnabled: boolean;
}

export interface MonitorSettingsStoreReader {
  getSettings(): MonitorSettingsStore;
  listSensitivityRevisions(): MonitorSensitivityRevision[];
}

export interface MonitorReadModel {
  getCurrentSnapshot(now?: number): CurrentStatusSnapshot;
  getHistory(from: number, to: number): PersistedMonitorSample[];
}
