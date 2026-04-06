import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

export function initializeDatabase(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  const migrationPath = path.resolve(__dirname, "migrations/001_init.sql");
  const fallbackMigrationPath = path.resolve(process.cwd(), "backend/src/data/migrations/001_init.sql");
  const sql = fs.readFileSync(fs.existsSync(migrationPath) ? migrationPath : fallbackMigrationPath, "utf8");
  database.exec(sql);
  ensureMonitorProvidersLogoUrlColumn(database);

  return database;
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
