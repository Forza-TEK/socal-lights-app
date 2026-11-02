-- Audit features, all additive: event notices (cancelled / postponed), visiting details on homes, installer ownership and logos,
-- installer page views and quote requests, "lights are on tonight" reports, and "something wrong?" reports.
ALTER TABLE events ADD COLUMN notice TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN lights_on  TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN visit      TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN parking    TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN accessible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN radio      TEXT NOT NULL DEFAULT '';
ALTER TABLE installers ADD COLUMN owner_email TEXT NOT NULL DEFAULT '';
ALTER TABLE installers ADD COLUMN logo        TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS installer_hits (
  installer_id TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (installer_id, day)
);
CREATE TABLE IF NOT EXISTS installer_leads (
  id TEXT PRIMARY KEY, installer_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS installer_leads_i ON installer_leads(installer_id);
CREATE TABLE IF NOT EXISTS lights_on (
  post_id TEXT NOT NULL, day TEXT NOT NULL, voter TEXT NOT NULL, PRIMARY KEY (post_id, day, voter)
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, ref TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
