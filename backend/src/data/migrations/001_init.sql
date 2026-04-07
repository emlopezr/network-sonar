CREATE TABLE IF NOT EXISTS connection_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observed_at INTEGER NOT NULL,
  status_code INTEGER NOT NULL CHECK (status_code IN (0, 1)),
  external_target TEXT NOT NULL,
  external_ok INTEGER NOT NULL CHECK (external_ok IN (0, 1)),
  external_latency_ms INTEGER,
  failure_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (observed_at)
);

CREATE INDEX IF NOT EXISTS idx_connection_logs_observed_at
  ON connection_logs (observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_connection_logs_status_time
  ON connection_logs (status_code, observed_at DESC);

CREATE TABLE IF NOT EXISTS monitor_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  round_robin_enabled INTEGER NOT NULL CHECK (round_robin_enabled IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS monitor_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  target TEXT NOT NULL COLLATE NOCASE UNIQUE,
  company TEXT,
  logo_url TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('default', 'custom')),
  is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
  is_enabled INTEGER NOT NULL CHECK (is_enabled IN (0, 1)),
  sort_order INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_monitor_providers_sort_order
  ON monitor_providers (sort_order ASC);
