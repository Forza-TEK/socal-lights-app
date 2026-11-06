-- Outbox for emails that go to many people at once (contest results, voting reminders). A request can only make 50 outgoing calls on the free plan,
-- so these are queued here and sent in batches (functions/_lib/mailbatch.js). Rows hold the recipient and the template values only until sent
-- (values are cleared on send), sent rows are deleted after 3 days, failed rows after 30.
CREATE TABLE IF NOT EXISTS mail_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  vars TEXT NOT NULL DEFAULT '{}',
  dedupe TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_outbox_dedupe ON mail_outbox (dedupe);
CREATE INDEX IF NOT EXISTS idx_mail_outbox_due ON mail_outbox (status, next_at);
