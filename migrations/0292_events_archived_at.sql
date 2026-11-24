-- Audit F-25: a weekly job (POST /api/archive-ended, Cloudflare cron Worker) marks events that ended long ago as archived so the public "everything" list (/api/events?ended=1) stops growing.
-- Nothing is deleted and the event page, Admin (?all=1) and the owner's profile still read the row. Schema only: no existing data is touched.
ALTER TABLE events ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived_at, end_date);

-- Heartbeat row for the weekly archive job (audit F-25), so it is not reported stale on day one.
INSERT OR IGNORE INTO job_heartbeats (job) VALUES ('archive-ended');
