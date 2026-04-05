import type { PersistedMonitorSample } from "../types/monitor";
import type { ConnectionLogStore } from "../types/storage";

export class HistoryService {
  public constructor(private readonly repository: ConnectionLogStore) {}

  public getHistory(from: number, to: number): PersistedMonitorSample[] {
    return this.repository.getRange(from, to);
  }
}
