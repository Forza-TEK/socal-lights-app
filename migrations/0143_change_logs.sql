-- Shared editing: who changed what, for homes (homeowner and installer) and for contests (the organizing team).
-- Also marks "I saw it lit tonight" reports that were made from near the home. Additive only.
ALTER TABLE lights_on ADD COLUMN near INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS listing_changes (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL, by_email TEXT NOT NULL, by_name TEXT NOT NULL DEFAULT '', by_role TEXT NOT NULL,
  field TEXT NOT NULL, old TEXT NOT NULL DEFAULT '', new TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS listing_changes_p ON listing_changes(post_id, at);
CREATE TABLE IF NOT EXISTS contest_changes (
  id TEXT PRIMARY KEY, contest_id TEXT NOT NULL, by_email TEXT NOT NULL, by_name TEXT NOT NULL DEFAULT '',
  field TEXT NOT NULL, old TEXT NOT NULL DEFAULT '', new TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS contest_changes_c ON contest_changes(contest_id, at);
