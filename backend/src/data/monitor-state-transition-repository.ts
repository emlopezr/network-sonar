import type Database from "better-sqlite3";

import { codeToStatus, statusToCode, type MonitorStateTransition } from "../types/monitor";
import type { TransitionStore } from "../types/storage";

interface MonitorStateTransitionRow {
  id: number;
  status_code: number;
  effective_at: number;
  confirmed_at: number;
  created_at: number;
}

function mapTransitionRow(row: MonitorStateTransitionRow): MonitorStateTransition {
  return {
    id: row.id,
    status: codeToStatus(row.status_code),
    effectiveAt: row.effective_at,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at
  };
}

export class MonitorStateTransitionRepository implements TransitionStore {
  private readonly insertStatement;

  private readonly listRangeStatement;

  private readonly latestBeforeOrAtStatement;

  private readonly listAllStatement;

  private readonly clearStatement;

  public constructor(private readonly database: Database.Database) {
    this.insertStatement = this.database.prepare(`
      INSERT INTO monitor_state_transitions (
        status_code,
        effective_at,
        confirmed_at
      ) VALUES (
        @status_code,
        @effective_at,
        @confirmed_at
      )
    `);
    this.listRangeStatement = this.database.prepare(`
      SELECT id, status_code, effective_at, confirmed_at, created_at
      FROM monitor_state_transitions
      WHERE effective_at >= ? AND effective_at <= ?
      ORDER BY effective_at ASC, id ASC
    `);
    this.latestBeforeOrAtStatement = this.database.prepare(`
      SELECT id, status_code, effective_at, confirmed_at, created_at
      FROM monitor_state_transitions
      WHERE effective_at <= ?
      ORDER BY effective_at DESC, id DESC
      LIMIT 1
    `);
    this.listAllStatement = this.database.prepare(`
      SELECT id, status_code, effective_at, confirmed_at, created_at
      FROM monitor_state_transitions
      ORDER BY effective_at ASC, id ASC
    `);
    this.clearStatement = this.database.prepare("DELETE FROM monitor_state_transitions");
  }

  public insert(
    transition: Omit<MonitorStateTransition, "id" | "createdAt">
  ): MonitorStateTransition {
    const result = this.insertStatement.run({
      status_code: statusToCode(transition.status),
      effective_at: transition.effectiveAt,
      confirmed_at: transition.confirmedAt
    });

    const row = this.database
      .prepare(`
        SELECT id, status_code, effective_at, confirmed_at, created_at
        FROM monitor_state_transitions
        WHERE id = ?
        LIMIT 1
      `)
      .get(result.lastInsertRowid) as MonitorStateTransitionRow | undefined;

    if (!row) {
      throw new Error("Failed to read inserted monitor state transition.");
    }

    return mapTransitionRow(row);
  }

  public listRange(from: number, to: number): MonitorStateTransition[] {
    return (this.listRangeStatement.all(from, to) as MonitorStateTransitionRow[]).map(mapTransitionRow);
  }

  public getLatestBeforeOrAt(at: number): MonitorStateTransition | null {
    const row = this.latestBeforeOrAtStatement.get(at) as MonitorStateTransitionRow | undefined;
    return row ? mapTransitionRow(row) : null;
  }

  public getAll(): MonitorStateTransition[] {
    return (this.listAllStatement.all() as MonitorStateTransitionRow[]).map(mapTransitionRow);
  }

  public replaceAll(
    transitions: Array<Omit<MonitorStateTransition, "id" | "createdAt">>
  ): void {
    const transaction = this.database.transaction(() => {
      this.clearStatement.run();

      for (const transition of transitions) {
        this.insertStatement.run({
          status_code: statusToCode(transition.status),
          effective_at: transition.effectiveAt,
          confirmed_at: transition.confirmedAt
        });
      }
    });

    transaction();
  }
}
