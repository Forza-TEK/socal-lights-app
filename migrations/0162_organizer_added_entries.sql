-- Homes an organizer adds to their own contest (no resident account, no photos needed). Add-only.
-- posts.added_by is the organizer's user id; it is NULL for every entry a resident submitted. Deleting the organizer's account clears it
-- (the entries stay with the contest). Such entries have user_id = '' so no voter or judge is ever treated as their owner.
ALTER TABLE posts ADD COLUMN added_by TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_added_by ON posts(added_by) WHERE added_by IS NOT NULL;

-- One row per call to POST /api/contests/<slug>/entries, for the 10-calls-an-hour limit per account. Rows older than a day are removed when a new one is written.
CREATE TABLE IF NOT EXISTS entry_add_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  contest_id TEXT NOT NULL,
  n          INTEGER NOT NULL DEFAULT 0,   -- homes in the call
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entry_add_log_user ON entry_add_log(user_id, created_at);
