import type Database from "better-sqlite3";

import type {
  ConfirmationThresholds,
  MonitorSensitivityRevision
} from "../types/monitor";
import type {
  MonitorProviderKind,
  MonitorProviderRecord,
  MonitorProviderSeed
} from "../types/api";
import type { MonitorSettingsStore } from "../types/storage";

interface MonitorSettingsRow {
  round_robin_enabled: number;
  confirm_down_after: number;
  confirm_up_after: number;
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

  private readonly updateSettingsStatement;

  private readonly settingsStatement;

  private readonly sensitivityRevisionCountStatement;

  private readonly insertSensitivityRevisionStatement;

  private readonly sensitivityRevisionListStatement;

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
      INSERT OR IGNORE INTO monitor_settings (
        id,
        round_robin_enabled,
        confirm_down_after,
        confirm_up_after
      )
      VALUES (
        1,
        @round_robin_enabled,
        @confirm_down_after,
        @confirm_up_after
      )
    `);
    this.updateSettingsStatement = this.database.prepare(`
      UPDATE monitor_settings
      SET round_robin_enabled = @round_robin_enabled,
          confirm_down_after = @confirm_down_after,
          confirm_up_after = @confirm_up_after,
          updated_at = unixepoch()
      WHERE id = 1
    `);
    this.settingsStatement = this.database.prepare(`
      SELECT round_robin_enabled, confirm_down_after, confirm_up_after
      FROM monitor_settings
      WHERE id = 1
      LIMIT 1
    `);
    this.sensitivityRevisionCountStatement = this.database.prepare(`
      SELECT COUNT(*) AS count
      FROM monitor_sensitivity_revisions
    `);
    this.insertSensitivityRevisionStatement = this.database.prepare(`
      INSERT INTO monitor_sensitivity_revisions (
        effective_at,
        confirm_down_after,
        confirm_up_after
      ) VALUES (
        @effective_at,
        @confirm_down_after,
        @confirm_up_after
      )
    `);
    this.sensitivityRevisionListStatement = this.database.prepare(`
      SELECT id, effective_at, confirm_down_after, confirm_up_after, created_at
      FROM monitor_sensitivity_revisions
      ORDER BY effective_at ASC, id ASC
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
    thresholds: ConfirmationThresholds,
    defaultProviders: DefaultProviderBootstrap[]
  ): void {
    const transaction = this.database.transaction(() => {
      this.insertSettingsStatement.run({
        round_robin_enabled: roundRobinEnabled ? 1 : 0,
        confirm_down_after: thresholds.confirmDownAfter,
        confirm_up_after: thresholds.confirmUpAfter
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

      const revisionCount = this.sensitivityRevisionCountStatement.get() as { count: number } | undefined;

      if ((revisionCount?.count ?? 0) === 0) {
        const settings = this.getSettings();
        this.insertSensitivityRevisionStatement.run({
          effective_at: 0,
          confirm_down_after: settings.confirmDownAfter,
          confirm_up_after: settings.confirmUpAfter
        });
      }
    });

    transaction();
  }

  public getSettings(): MonitorSettingsStore {
    const row = this.settingsStatement.get() as MonitorSettingsRow | undefined;

    if (!row) {
      throw new Error("Monitor settings have not been initialized.");
    }

    return {
      roundRobinEnabled: Boolean(row.round_robin_enabled),
      confirmDownAfter: row.confirm_down_after,
      confirmUpAfter: row.confirm_up_after
    };
  }

  public updateSettings(settings: MonitorSettingsStore): void {
    this.updateSettingsStatement.run({
      round_robin_enabled: settings.roundRobinEnabled ? 1 : 0,
      confirm_down_after: settings.confirmDownAfter,
      confirm_up_after: settings.confirmUpAfter
    });
  }

  public addSensitivityRevision(
    effectiveAt: number,
    thresholds: ConfirmationThresholds
  ): void {
    this.insertSensitivityRevisionStatement.run({
      effective_at: effectiveAt,
      confirm_down_after: thresholds.confirmDownAfter,
      confirm_up_after: thresholds.confirmUpAfter
    });
  }

  public listSensitivityRevisions(): MonitorSensitivityRevision[] {
    return (this.sensitivityRevisionListStatement.all() as Array<{
      id: number;
      effective_at: number;
      confirm_down_after: number;
      confirm_up_after: number;
      created_at: number;
    }>).map((row) => ({
      id: row.id,
      effectiveAt: row.effective_at,
      confirmDownAfter: row.confirm_down_after,
      confirmUpAfter: row.confirm_up_after,
      createdAt: row.created_at
    }));
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
