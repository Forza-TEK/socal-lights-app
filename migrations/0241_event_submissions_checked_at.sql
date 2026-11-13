-- The automatic event-page check (functions/api/verify-events.js) remembers when it last looked at each submitted event, so a page that is down is not asked again every run.
-- Also starts the clock for the new "verify-events" job so it is not flagged before its first run.
ALTER TABLE event_submissions ADD COLUMN checked_at TEXT;
INSERT OR IGNORE INTO job_heartbeats (job) VALUES ('verify-events');
