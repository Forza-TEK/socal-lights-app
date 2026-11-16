-- Admin > Progress: one row every half hour (written by the cron Worker through POST /api/progress-log, and by opening the page), so the trend lines show real movement.
-- Add-only: a new table, nothing existing is changed.
CREATE TABLE IF NOT EXISTS progress_log (
  at TEXT PRIMARY KEY,                      -- UTC time rounded down to the half hour, e.g. 2026-11-16T01:30
  upcoming INTEGER NOT NULL DEFAULT 0,      -- events on the map that have not ended
  confirmed INTEGER NOT NULL DEFAULT 0,
  with_photo INTEGER NOT NULL DEFAULT 0,
  from_grok INTEGER NOT NULL DEFAULT 0,     -- ids that start grok-
  cats_ok INTEGER NOT NULL DEFAULT 0,       -- season categories at or over their working target
  cats_total INTEGER NOT NULL DEFAULT 0,
  updates_applied INTEGER NOT NULL DEFAULT 0, -- Grok update-call changes applied, all time
  intake_published INTEGER NOT NULL DEFAULT 0 -- Grok intake rows published, all time
);
