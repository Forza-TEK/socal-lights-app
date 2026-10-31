-- A record of what the site owner did in the admin tools (who, when, what, to which item). Additive only.
CREATE TABLE IF NOT EXISTS admin_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL DEFAULT (datetime('now')),
  admin      TEXT NOT NULL DEFAULT '',        -- the Cloudflare Access email
  area       TEXT NOT NULL,                   -- users | posts | events | contests | submissions
  action     TEXT NOT NULL,                   -- approve, decline, edit, delete, add, suspend, unsuspend, signout, rename, note
  target_id  TEXT NOT NULL DEFAULT '',
  label      TEXT NOT NULL DEFAULT ''         -- what it was called at the time (an email, a house or event name)
);
CREATE INDEX IF NOT EXISTS admin_log_at ON admin_log(at DESC);
CREATE INDEX IF NOT EXISTS admin_log_target ON admin_log(area, target_id);
