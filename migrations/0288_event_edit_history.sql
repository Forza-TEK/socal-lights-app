-- Event edit history (audit F-03): when an organizer uses "This is my event" on a listing that existed before (a sweep or Grok row), the whole previous events row is saved here as JSON,
-- with who changed it, when and why, so Admin can put it back with one click (POST /api/admin/events/revert). Schema only: no existing data is touched.
CREATE TABLE IF NOT EXISTS event_edit_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      TEXT NOT NULL,
  row           TEXT NOT NULL DEFAULT '{}',          -- the events row as it was before the change, as JSON (every column)
  by_user_id    TEXT NOT NULL DEFAULT '',
  by_email      TEXT NOT NULL DEFAULT '',
  submission_id TEXT NOT NULL DEFAULT '',            -- the event_submissions row the change created (it made the person the listing's manager)
  reason        TEXT NOT NULL DEFAULT '',            -- why the row was saved, e.g. "organizer took over this listing"
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  reverted_at   TEXT,
  reverted_by   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_event_edit_history_event ON event_edit_history(event_id, id);
