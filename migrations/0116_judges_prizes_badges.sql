-- Judges, prizes per award, and winner-badge preferences. Additive only, safe defaults.
ALTER TABLE contests ADD COLUMN mode TEXT NOT NULL DEFAULT 'public';          -- public | judges | both
ALTER TABLE contests ADD COLUMN judge_method TEXT NOT NULL DEFAULT 'pick';    -- pick | score
ALTER TABLE contests ADD COLUMN prize_mode TEXT NOT NULL DEFAULT 'none';      -- none | one | each
ALTER TABLE contests ADD COLUMN prize TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN prizes TEXT NOT NULL DEFAULT '{}';            -- { "Category|public": "text", "Category|judge": "text" }
ALTER TABLE contests ADD COLUMN sponsor TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN badges TEXT NOT NULL DEFAULT '{}';               -- { master: false to hide all, off: { "<contest>|<category>|<kind>|<surface>": true } }

CREATE TABLE IF NOT EXISTS judges (
  id          TEXT PRIMARY KEY,
  contest_id  TEXT NOT NULL,
  email       TEXT NOT NULL,            -- normalized like accounts
  token       TEXT NOT NULL,
  user_id     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS judges_contest_email ON judges(contest_id, email);
CREATE INDEX IF NOT EXISTS judges_email ON judges(email);

-- Pick-one judging: one favorite home per category per judge.
CREATE TABLE IF NOT EXISTS judge_picks (
  contest_id  TEXT NOT NULL,
  judge_id    TEXT NOT NULL,
  category    TEXT NOT NULL,
  post_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (contest_id, judge_id, category)
);
-- Score judging: 1 to 10 for every home in every category.
CREATE TABLE IF NOT EXISTS judge_scores (
  contest_id  TEXT NOT NULL,
  judge_id    TEXT NOT NULL,
  post_id     TEXT NOT NULL,
  category    TEXT NOT NULL,
  score       INTEGER NOT NULL,
  PRIMARY KEY (contest_id, judge_id, post_id, category)
);
-- A judge who knows a household recuses: their picks and scores for that home don't count.
CREATE TABLE IF NOT EXISTS judge_conflicts (
  contest_id  TEXT NOT NULL,
  judge_id    TEXT NOT NULL,
  post_id     TEXT NOT NULL,
  PRIMARY KEY (contest_id, judge_id, post_id)
);
