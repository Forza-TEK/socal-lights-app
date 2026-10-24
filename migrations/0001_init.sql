-- SoCal Lights Finder schema

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  county      TEXT NOT NULL,
  city        TEXT NOT NULL,
  type        TEXT NOT NULL,          -- walk | drive | parade | park | tree | tour
  start_date  TEXT NOT NULL,          -- YYYY-MM-DD
  end_date    TEXT NOT NULL,          -- YYYY-MM-DD
  status      TEXT NOT NULL DEFAULT 'expected',  -- confirmed | expected
  free        INTEGER NOT NULL DEFAULT 0,
  price       TEXT,
  hours       TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  blurb       TEXT,
  url         TEXT,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Showcased houses. Submissions start as 'pending'; the admin approves or declines.
CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | declined
  biz           TEXT NOT NULL,
  title         TEXT NOT NULL,
  city          TEXT NOT NULL,
  county        TEXT,
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  web           TEXT,
  phone         TEXT,
  where_txt     TEXT,
  descr         TEXT NOT NULL,
  photos        TEXT NOT NULL DEFAULT '[]',        -- JSON array of R2 keys
  contact_email TEXT,                              -- private: only the admin sees it
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at   TEXT
);
CREATE INDEX IF NOT EXISTS posts_status ON posts(status, created_at);

-- Simple per-IP throttle for the public submission form
CREATE TABLE IF NOT EXISTS submit_log (
  ip         TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS submit_log_ip ON submit_log(ip, created_at);
