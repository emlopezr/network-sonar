ALTER TABLE monitor_settings
  ADD COLUMN confirm_down_after INTEGER NOT NULL DEFAULT 2;

ALTER TABLE monitor_settings
  ADD COLUMN confirm_up_after INTEGER NOT NULL DEFAULT 2;

CREATE TABLE IF NOT EXISTS monitor_sensitivity_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  effective_at INTEGER NOT NULL,
  confirm_down_after INTEGER NOT NULL CHECK (confirm_down_after > 0),
  confirm_up_after INTEGER NOT NULL CHECK (confirm_up_after > 0),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_monitor_sensitivity_revisions_effective_at
  ON monitor_sensitivity_revisions (effective_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS monitor_state_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status_code INTEGER NOT NULL CHECK (status_code IN (0, 1)),
  effective_at INTEGER NOT NULL,
  confirmed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_monitor_state_transitions_effective_at
  ON monitor_state_transitions (effective_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_monitor_state_transitions_confirmed_at
  ON monitor_state_transitions (confirmed_at ASC, id ASC);
