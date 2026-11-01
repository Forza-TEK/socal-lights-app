-- Contest extras: co-organizers, page visits, sponsors, installer quote requests, and reminder flags.
-- Purely additive: new tables, and new columns with safe defaults.
CREATE TABLE IF NOT EXISTS contest_staff (
  contest_id TEXT NOT NULL,
  email      TEXT NOT NULL,
  added_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (contest_id, email)
);
CREATE TABLE IF NOT EXISTS contest_hits (
  contest_id TEXT NOT NULL,
  day        TEXT NOT NULL,
  src        TEXT NOT NULL DEFAULT '',
  n          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (contest_id, day, src)
);
CREATE TABLE IF NOT EXISTS contest_sponsors (
  id         TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  tier       TEXT NOT NULL DEFAULT 'prize',
  url        TEXT NOT NULL DEFAULT '',
  logo       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS contest_sponsors_c ON contest_sponsors(contest_id);
CREATE TABLE IF NOT EXISTS contest_leads (
  id         TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS contest_leads_c ON contest_leads(contest_id);
ALTER TABLE contests ADD COLUMN installer_name  TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN installer_email TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN installer_url   TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN remind_open     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contests ADD COLUMN remind_close    INTEGER NOT NULL DEFAULT 0;
