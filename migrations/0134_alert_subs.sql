-- Email alerts: people who asked for a weekly list of lights and events near a city. Confirmed by link; one row per email.
CREATE TABLE IF NOT EXISTS alert_subs (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  city         TEXT NOT NULL,
  lat          REAL NOT NULL,
  lng          REAL NOT NULL,
  radius       INTEGER NOT NULL DEFAULT 10,
  token        TEXT NOT NULL UNIQUE,
  confirmed    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT,
  last_sent    TEXT
);
CREATE INDEX IF NOT EXISTS idx_alert_subs_confirmed ON alert_subs (confirmed);
