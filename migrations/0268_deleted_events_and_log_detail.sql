-- Admin audit 2026-11-16 (M7, L4). Add-only.
-- deleted_events: a tombstone for every event an admin deletes, holding the whole row. It lets Admin undo a delete (single or bulk) and lets the migration gate
-- refuse a later migration that would quietly bring an admin-deleted event back (scripts/validate-migrations.mjs --deleted-file).
CREATE TABLE IF NOT EXISTS deleted_events (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  row        TEXT NOT NULL DEFAULT '{}',          -- the event row as JSON (every column)
  deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_by TEXT NOT NULL DEFAULT ''
);
-- admin_log.detail: a short JSON of what an edit changed ({"field":[before,after]}), so the Activity log shows before and after values.
ALTER TABLE admin_log ADD COLUMN detail TEXT NOT NULL DEFAULT '';
