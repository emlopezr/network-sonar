import type Database from "better-sqlite3";

import type {
  MonitorProviderKind,
  MonitorProviderRecord,
  MonitorProviderSeed
} from "../types/api";

interface MonitorSettingsRow {
  round_robin_enabled: number;
}

interface MonitorProviderRow {
  id: number;
  label: string;
  target: string;
  company: string | null;
  logo_url: string | null;
  kind: MonitorProviderKind;
  is_default: number;
  is_enabled: number;
  sort_order: number;
}

export interface DefaultProviderBootstrap {
  label: string;
  target: string;
  company: MonitorProviderSeed["company"];
  isEnabled: boolean;
  sortOrder: number;
}

function mapProviderRow(row: MonitorProviderRow): MonitorProviderRecord {
  return {
    id: row.id,
    label: row.label,
    target: row.target,
    company: row.company as MonitorProviderRecord["company"],
    logoUrl: row.logo_url,
    kind: row.kind,
    isDefault: Boolean(row.is_default),
    isEnabled: Boolean(row.is_enabled),
    sortOrder: row.sort_order
  };
}

export class MonitorSettingsRepository {
  private readonly insertSettingsStatement;

  private readonly updateRoundRobinStatement;

  private readonly settingsStatement;

  private readonly providerListStatement;

  private readonly providerByIdStatement;

  private readonly providerByTargetStatement;

  private readonly insertDefaultProviderStatement;

  private readonly insertCustomProviderStatement;

  private readonly updateCustomProviderStatement;

  private readonly updateProviderEnabledStatement;

  private readonly updateProviderSortOrderStatement;

  private readonly deleteProviderStatement;

  private readonly maxSortOrderStatement;

  public constructor(private readonly database: Database.Database) {
    this.insertSettingsStatement = this.database.prepare(`
      INSERT OR IGNORE INTO monitor_settings (id, round_robin_enabled)
      VALUES (1, @round_robin_enabled)
    `);
    this.updateRoundRobinStatement = this.database.prepare(`
      UPDATE monitor_settings
      SET round_robin_enabled = @round_robin_enabled,
          updated_at = unixepoch()
      WHERE id = 1
    `);
    this.settingsStatement = this.database.prepare(`
      SELECT round_robin_enabled
      FROM monitor_settings
      WHERE id = 1
      LIMIT 1
    `);
    this.providerListStatement = this.database.prepare(`
      SELECT id, label, target, company, logo_url, kind, is_default, is_enabled, sort_order
      FROM monitor_providers
      ORDER BY sort_order ASC, id ASC
    `);
    this.providerByIdStatement = this.database.prepare(`
      SELECT id, label, target, company, logo_url, kind, is_default, is_enabled, sort_order
      FROM monitor_providers
      WHERE id = ?
      LIMIT 1
    `);
    this.providerByTargetStatement = this.database.prepare(`
      SELECT id, label, target, company, logo_url, kind, is_default, is_enabled, sort_order
      FROM monitor_providers
      WHERE target = ?
      LIMIT 1
    `);
    this.insertDefaultProviderStatement = this.database.prepare(`
      INSERT INTO monitor_providers (
        label, target, company, logo_url, kind, is_default, is_enabled, sort_order
      ) VALUES (
        @label, @target, @company, NULL, 'default', 1, @is_enabled, @sort_order
      )
      ON CONFLICT(target) DO UPDATE SET
        label = excluded.label,
        company = excluded.company,
        logo_url = NULL,
        kind = 'default',
        is_default = 1
    `);
    this.insertCustomProviderStatement = this.database.prepare(`
      INSERT INTO monitor_providers (
        label, target, company, logo_url, kind, is_default, is_enabled, sort_order
      ) VALUES (
        @label, @target, NULL, @logo_url, 'custom', 0, @is_enabled, @sort_order
      )
    `);
    this.updateCustomProviderStatement = this.database.prepare(`
      UPDATE monitor_providers
      SET label = @label,
          target = @target,
          logo_url = @logo_url
      WHERE id = @id
    `);
    this.updateProviderEnabledStatement = this.database.prepare(`
      UPDATE monitor_providers
      SET is_enabled = @is_enabled
      WHERE id = @id
    `);
    this.updateProviderSortOrderStatement = this.database.prepare(`
      UPDATE monitor_providers
      SET sort_order = @sort_order
      WHERE id = @id
    `);
    this.deleteProviderStatement = this.database.prepare(`
      DELETE FROM monitor_providers
      WHERE id = ?
    `);
    this.maxSortOrderStatement = this.database.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) AS max_sort_order
      FROM monitor_providers
    `);
  }

  public initialize(
    roundRobinEnabled: boolean,
    defaultProviders: DefaultProviderBootstrap[]
  ): void {
    const transaction = this.database.transaction(() => {
      this.insertSettingsStatement.run({
        round_robin_enabled: roundRobinEnabled ? 1 : 0
      });

      for (const provider of defaultProviders) {
        this.insertDefaultProviderStatement.run({
          label: provider.label,
          target: provider.target,
          company: provider.company,
          is_enabled: provider.isEnabled ? 1 : 0,
          sort_order: provider.sortOrder
        });
      }
    });

    transaction();
  }

  public getRoundRobinEnabled(): boolean {
    const row = this.settingsStatement.get() as MonitorSettingsRow | undefined;

    if (!row) {
      throw new Error("Monitor settings have not been initialized.");
    }

    return Boolean(row.round_robin_enabled);
  }

  public updateRoundRobinEnabled(roundRobinEnabled: boolean): void {
    this.updateRoundRobinStatement.run({
      round_robin_enabled: roundRobinEnabled ? 1 : 0
    });
  }

  public listProviders(): MonitorProviderRecord[] {
    return (this.providerListStatement.all() as MonitorProviderRow[]).map(mapProviderRow);
  }

  public getProviderById(id: number): MonitorProviderRecord | null {
    const row = this.providerByIdStatement.get(id) as MonitorProviderRow | undefined;
    return row ? mapProviderRow(row) : null;
  }

  public getProviderByTarget(target: string): MonitorProviderRecord | null {
    const row = this.providerByTargetStatement.get(target) as MonitorProviderRow | undefined;
    return row ? mapProviderRow(row) : null;
  }

  public createCustomProvider(
    label: string,
    target: string,
    logoUrl: string | null,
    isEnabled: boolean
  ): void {
    const maxSortOrderRow = this.maxSortOrderStatement.get() as { max_sort_order: number } | undefined;
    const nextSortOrder = (maxSortOrderRow?.max_sort_order ?? -1) + 1;

    this.insertCustomProviderStatement.run({
      label,
      target,
      logo_url: logoUrl,
      is_enabled: isEnabled ? 1 : 0,
      sort_order: nextSortOrder
    });
  }

  public updateCustomProvider(
    id: number,
    label: string,
    target: string,
    logoUrl: string | null
  ): void {
    this.updateCustomProviderStatement.run({
      id,
      label,
      target,
      logo_url: logoUrl
    });
  }

  public updateProviderEnabled(id: number, isEnabled: boolean): void {
    this.updateProviderEnabledStatement.run({
      id,
      is_enabled: isEnabled ? 1 : 0
    });
  }

  public reorderProviders(providerIds: number[]): void {
    const transaction = this.database.transaction(() => {
      providerIds.forEach((id, index) => {
        this.updateProviderSortOrderStatement.run({
          id,
          sort_order: index
        });
      });
    });

    transaction();
  }

  public deleteProvider(id: number): void {
    this.deleteProviderStatement.run(id);
  }
}
