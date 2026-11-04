-- Third-party email sent by an account (neighbor invitations, judge and co-organizer invitations, judge reminders), so a daily cap can be
-- enforced per contest and per account. Add-only. Rows older than 3 days are removed whenever a new row is written.
CREATE TABLE IF NOT EXISTS email_send_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  contest_id TEXT,
  kind       TEXT NOT NULL,                 -- invite | judge | staff | nudge
  n          INTEGER NOT NULL DEFAULT 1,    -- how many addresses this call emailed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_user ON email_send_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_send_log_contest ON email_send_log(contest_id, kind, created_at);
