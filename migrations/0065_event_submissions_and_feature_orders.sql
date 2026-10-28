-- Public "Add your event" submissions, and paid Featured orders (one row per Stripe Checkout session).
CREATE TABLE IF NOT EXISTS event_submissions (
  id            TEXT PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | published | declined
  name          TEXT NOT NULL,
  county        TEXT,
  city          TEXT NOT NULL,
  season        TEXT NOT NULL,
  type          TEXT NOT NULL,
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,
  free          INTEGER NOT NULL DEFAULT 0,
  price         TEXT,
  hours         TEXT,
  lat           REAL,
  lng           REAL,
  blurb         TEXT,
  url           TEXT,
  venue         TEXT,
  address       TEXT,
  contact_email TEXT,
  verified      INTEGER NOT NULL DEFAULT 0,        -- 1 = the event page mentioned the event and its year
  note          TEXT,                              -- why it needs review, or what the checks found
  event_id      TEXT,                              -- id in events once published
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_event_submissions_status ON event_submissions(status, created_at);

CREATE TABLE IF NOT EXISTS feature_orders (
  session_id TEXT PRIMARY KEY,                     -- Stripe Checkout session id (makes the webhook idempotent)
  event_id   TEXT NOT NULL,
  plan       TEXT NOT NULL,                        -- pin | top | season
  amount     INTEGER,                              -- cents
  email      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
