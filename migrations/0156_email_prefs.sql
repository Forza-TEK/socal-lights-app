-- People who have unsubscribed from notification emails (reminders, team and listing updates, results, neighbor invitations).
-- A row is created the first time such an email is sent; `token` is the secret in the unsubscribe link.
CREATE TABLE IF NOT EXISTS email_prefs (
  email TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  optout INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
