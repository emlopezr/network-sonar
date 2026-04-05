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
