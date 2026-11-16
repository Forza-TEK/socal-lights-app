-- Grok update call: remember when Grok last tried each event (one row per event), so the work order can show last_attempt and skip rows Grok already tried.
-- Add-only: a new table, nothing existing is changed. result: changed (applied or held) | unchanged | skipped (the row was rejected).
CREATE TABLE IF NOT EXISTS intake_attempts (
  event_id TEXT PRIMARY KEY,
  last_attempt TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT ''
);
