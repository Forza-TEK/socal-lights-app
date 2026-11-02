-- Edited wording for the automatic emails (Admin > Settings > Email templates).
-- A row only exists for a template the admin has changed; every other email uses the default wording in functions/_lib/mailtpl.js.
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
