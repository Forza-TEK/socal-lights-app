-- Saved add-form drafts, one row per draft, owned by an account. Photos are never stored; answers are JSON.
CREATE TABLE IF NOT EXISTS drafts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  kind        TEXT NOT NULL,            -- event | house | contest
  title       TEXT NOT NULL DEFAULT '',
  data        TEXT NOT NULL,
  step        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS drafts_user ON drafts(user_id, updated_at);
