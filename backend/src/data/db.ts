import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

export function initializeDatabase(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  ensureSchemaMigrationsTable(database);

  for (const migrationFile of resolveMigrationFiles()) {
    applyMigration(database, migrationFile);
  }

  ensureMonitorProvidersLogoUrlColumn(database);
  ensureMonitorSettingsConfirmationColumns(database);
  ensureMonitorSettingsRuntimeColumn(database);
  ensureMonitorSensitivityRevisionsTable(database);
  ensureMonitorStateTransitionsTable(database);

  return database;
}

function ensureSchemaMigrationsTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
}

function applyMigration(database: Database.Database, migrationFile: string): void {
  const migrationName = path.basename(migrationFile);
  if (hasAppliedMigration(database, migrationName)) {
    return;
  }

  if (migrationName === "002_confirmed_state.sql" && hasConfirmedStateSchemaArtifacts(database)) {
    markMigrationApplied(database, migrationName);
    return;
  }

  const sql = fs.readFileSync(migrationFile, "utf8");
  const transaction = database.transaction(() => {
    database.exec(sql);
    markMigrationApplied(database, migrationName);
  });

  transaction();
}

function hasAppliedMigration(database: Database.Database, migrationName: string): boolean {
  const alreadyApplied = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ? LIMIT 1")
    .get(migrationName) as { name: string } | undefined;

  return Boolean(alreadyApplied);
}

function markMigrationApplied(database: Database.Database, migrationName: string): void {
  database.prepare("INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)").run(migrationName);
}

function hasConfirmedStateSchemaArtifacts(database: Database.Database): boolean {
  const monitorSettingsColumns = database
    .prepare("PRAGMA table_info(monitor_settings)")
    .all() as Array<{ name: string }>;
  const tables = database
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name IN ('monitor_sensitivity_revisions', 'monitor_state_transitions')
    `)
    .all() as Array<{ name: string }>;

  return (
    monitorSettingsColumns.some((column) => column.name === "confirm_down_after") ||
    monitorSettingsColumns.some((column) => column.name === "confirm_up_after") ||
    tables.some((table) => table.name === "monitor_sensitivity_revisions") ||
    tables.some((table) => table.name === "monitor_state_transitions")
  );
}

function resolveMigrationFiles(): string[] {
  const candidateDirectories = [
    path.resolve(__dirname, "migrations"),
    path.resolve(process.cwd(), "backend/src/data/migrations")
  ];

  const migrationDirectory = candidateDirectories.find((candidatePath) => fs.existsSync(candidatePath));

  if (!migrationDirectory) {
    throw new Error("Unable to resolve database migration directory.");
  }

  return fs
    .readdirSync(migrationDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => path.join(migrationDirectory, fileName));
}

function ensureMonitorProvidersLogoUrlColumn(database: Database.Database): void {
  const columns = database
    .prepare("PRAGMA table_info(monitor_providers)")
    .all() as Array<{ name: string }>;

  if (columns.some((column) => column.name === "logo_url")) {
    return;
  }

  database.exec("ALTER TABLE monitor_providers ADD COLUMN logo_url TEXT");
}

function ensureMonitorSettingsConfirmationColumns(database: Database.Database): void {
  const columns = database
    .prepare("PRAGMA table_info(monitor_settings)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === "confirm_down_after")) {
    database.exec("ALTER TABLE monitor_settings ADD COLUMN confirm_down_after INTEGER NOT NULL DEFAULT 2");
  }

  if (!columns.some((column) => column.name === "confirm_up_after")) {
    database.exec("ALTER TABLE monitor_settings ADD COLUMN confirm_up_after INTEGER NOT NULL DEFAULT 2");
  }
}

function ensureMonitorSettingsRuntimeColumn(database: Database.Database): void {
  const columns = database
    .prepare("PRAGMA table_info(monitor_settings)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === "is_paused")) {
    database.exec("ALTER TABLE monitor_settings ADD COLUMN is_paused INTEGER NOT NULL DEFAULT 0");
  }
}

function ensureMonitorSensitivityRevisionsTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS monitor_sensitivity_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      effective_at INTEGER NOT NULL,
      confirm_down_after INTEGER NOT NULL CHECK (confirm_down_after > 0),
      confirm_up_after INTEGER NOT NULL CHECK (confirm_up_after > 0),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitor_sensitivity_revisions_effective_at
      ON monitor_sensitivity_revisions (effective_at ASC, id ASC)
  `);
}

function ensureMonitorStateTransitionsTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS monitor_state_transitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status_code INTEGER NOT NULL CHECK (status_code IN (0, 1)),
      effective_at INTEGER NOT NULL,
      confirmed_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitor_state_transitions_effective_at
      ON monitor_state_transitions (effective_at ASC, id ASC)
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitor_state_transitions_confirmed_at
      ON monitor_state_transitions (confirmed_at ASC, id ASC)
  `);
}
