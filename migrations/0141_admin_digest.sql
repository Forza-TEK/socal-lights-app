-- Remembers when the last "new submissions" email went to the site owner, so each email counts only what is new.
CREATE TABLE IF NOT EXISTS admin_digest (
  id      INTEGER PRIMARY KEY,
  last_at TEXT NOT NULL
);
