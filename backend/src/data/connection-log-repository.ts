import type Database from "better-sqlite3";

import { codeToStatus, statusToCode, type PersistedMonitorSample } from "../types/monitor";
import type { ConnectionLogStore, StoredConnectionLog } from "../types/storage";

interface ConnectionLogRow {
  id: number;
  observed_at: number;
  status_code: number;
  external_target: string;
  external_ok: number;
  external_latency_ms: number | null;
  failure_reason: string | null;
  created_at: number;
}

function mapRow(row: ConnectionLogRow): StoredConnectionLog {
  return {
    id: row.id,
    observedAt: row.observed_at,
    status: codeToStatus(row.status_code),
    externalTarget: row.external_target,
    externalOk: Boolean(row.external_ok),
    externalLatencyMs: row.external_latency_ms,
    failureReason: row.failure_reason,
    createdAt: row.created_at
  };
}

export class ConnectionLogRepository implements ConnectionLogStore {
  private readonly insertStatement;

  private readonly latestStatement;

  private readonly recentStatement;

  private readonly rangeStatement;

  private readonly purgeStatement;

  private readonly rowByObservedAtStatement;

  public constructor(private readonly database: Database.Database) {
    this.insertStatement = this.database.prepare(`
      INSERT INTO connection_logs (
        observed_at,
        status_code,
        external_target,
        external_ok,
        external_latency_ms,
        failure_reason
      ) VALUES (
        @observed_at,
        @status_code,
        @external_target,
        @external_ok,
        @external_latency_ms,
        @failure_reason
      )
      ON CONFLICT(observed_at) DO UPDATE SET
        status_code = excluded.status_code,
        external_target = excluded.external_target,
        external_ok = excluded.external_ok,
        external_latency_ms = excluded.external_latency_ms,
        failure_reason = excluded.failure_reason
    `);
    this.latestStatement = this.database.prepare(
      "SELECT id, observed_at, status_code, external_target, external_ok, external_latency_ms, failure_reason, created_at FROM connection_logs ORDER BY observed_at DESC LIMIT 1"
    );
    this.recentStatement = this.database.prepare(
      "SELECT id, observed_at, status_code, external_target, external_ok, external_latency_ms, failure_reason, created_at FROM connection_logs ORDER BY observed_at DESC LIMIT ?"
    );
    this.rangeStatement = this.database.prepare(`
      SELECT id, observed_at, status_code, external_target, external_ok, external_latency_ms, failure_reason, created_at FROM connection_logs
      WHERE observed_at >= ? AND observed_at <= ?
      ORDER BY observed_at ASC
    `);
    this.purgeStatement = this.database.prepare(
      "DELETE FROM connection_logs WHERE observed_at < ?"
    );
    this.rowByObservedAtStatement = this.database.prepare(
      "SELECT id, observed_at, status_code, external_target, external_ok, external_latency_ms, failure_reason, created_at FROM connection_logs WHERE observed_at = ? LIMIT 1"
    );
  }

  public insert(sample: PersistedMonitorSample): StoredConnectionLog {
    this.insertStatement.run({
      observed_at: sample.observedAt,
      status_code: statusToCode(sample.status),
      external_target: sample.externalTarget,
      external_ok: sample.externalOk ? 1 : 0,
      external_latency_ms: sample.externalLatencyMs,
      failure_reason: sample.failureReason
    });

    const row = this.rowByObservedAtStatement.get(sample.observedAt) as ConnectionLogRow | undefined;

    if (!row) {
      throw new Error(`Failed to fetch persisted sample for observedAt=${sample.observedAt}`);
    }

    return mapRow(row);
  }

  public getLatest(): StoredConnectionLog | null {
    const row = this.latestStatement.get() as ConnectionLogRow | undefined;
    return row ? mapRow(row) : null;
  }

  public getRecent(limit: number): StoredConnectionLog[] {
    return (this.recentStatement.all(limit) as ConnectionLogRow[]).map(mapRow);
  }

  public getRange(from: number, to: number): StoredConnectionLog[] {
    return (this.rangeStatement.all(from, to) as ConnectionLogRow[]).map(mapRow);
  }

  public purgeOlderThan(cutoffUnixSeconds: number): number {
    const result = this.purgeStatement.run(cutoffUnixSeconds);
    return result.changes;
  }
}
