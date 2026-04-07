ALTER TABLE monitor_settings
  ADD COLUMN is_paused INTEGER NOT NULL DEFAULT 0 CHECK (is_paused IN (0, 1));
