-- Failures the site noticed on its own (a failed email, a webhook that threw), so the admin digest can report them.
-- Holds no personal data: no email addresses, only the kind, a short technical detail and the time. Pruned after 30 days.
CREATE TABLE IF NOT EXISTS ops_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ops_log_created ON ops_log (created_at);
