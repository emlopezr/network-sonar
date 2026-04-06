import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { initializeDatabase } from "../../backend/src/data/db";

const createdPaths = new Set<string>();

function createTemporaryDatabasePath(name: string): string {
  const dbPath = path.join(os.tmpdir(), `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  createdPaths.add(dbPath);
  return dbPath;
}

describe("database migrations", () => {
  afterEach(() => {
    for (const dbPath of createdPaths) {
      try {
        fs.unlinkSync(dbPath);
      } catch {
        // Ignore files that were already removed during the test.
      }
    }

    createdPaths.clear();
  });

  it("recovers from a partially applied confirmed-state migration", () => {
    const dbPath = createTemporaryDatabasePath("network-sonar-partial-migration");
    const initialSql = fs.readFileSync(
      path.resolve(process.cwd(), "backend/src/data/migrations/001_init.sql"),
      "utf8"
    );
    const partialDatabase = new Database(dbPath);

    partialDatabase.exec(initialSql);
    partialDatabase.exec(
      "ALTER TABLE monitor_settings ADD COLUMN confirm_down_after INTEGER NOT NULL DEFAULT 2"
    );
    partialDatabase.close();

    const migratedDatabase = initializeDatabase(dbPath);
    const columns = (
      migratedDatabase.prepare("PRAGMA table_info(monitor_settings)").all() as Array<{ name: string }>
    ).map((column) => column.name);
    const migrationNames = (
      migratedDatabase.prepare("SELECT name FROM schema_migrations ORDER BY name ASC").all() as Array<{ name: string }>
    ).map((row) => row.name);
    const tables = (
      migratedDatabase.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('monitor_sensitivity_revisions', 'monitor_state_transitions')
        ORDER BY name ASC
      `).all() as Array<{ name: string }>
    ).map((row) => row.name);

    expect(columns).toContain("confirm_down_after");
    expect(columns).toContain("confirm_up_after");
    expect(tables).toEqual([
      "monitor_sensitivity_revisions",
      "monitor_state_transitions"
    ]);
    expect(migrationNames).toEqual([
      "001_init.sql",
      "002_confirmed_state.sql"
    ]);

    migratedDatabase.close();
  });
});
