-- Audit follow-ups (PL-01, N-02, S-04, N-03, S-10). Add-only: new tables and new columns with safe defaults.

-- PL-01: a permanent record of the organizer's confirmation that residents agreed to be listed (entry_add_log is pruned after a day, so it cannot hold this).
-- One row per "add homes" call that was confirmed. `text` is the exact wording the organizer ticked; `version` names it (see CONSENT_VERSION in functions/_lib/homes.js).
CREATE TABLE IF NOT EXISTS home_consents (
  id         TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL,
  user_id    TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  n          INTEGER NOT NULL DEFAULT 0,      -- homes added in the call
  version    TEXT NOT NULL DEFAULT '',
  text       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_home_consents_contest ON home_consents(contest_id);
ALTER TABLE posts ADD COLUMN consent_id TEXT;   -- the home_consents row that covers an organizer-added home (NULL for everything else)

-- PL-01: "Remove my home" requests from residents (no account needed). Admin approves (the listing is deleted) or declines.
CREATE TABLE IF NOT EXISTS removal_requests (
  id          TEXT PRIMARY KEY,
  ref         TEXT NOT NULL DEFAULT '',        -- listing id as shown on the page (event id, or h-<post id>); may be empty when only an address was given
  address     TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open',    -- open | done | declined
  target      TEXT NOT NULL DEFAULT '',        -- what Admin removed: "event:<id>", "post:<id>" or "" (set when handled)
  admin_note  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  handled_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_removal_status ON removal_requests(status, created_at);

-- N-03 / S-10: short-lived counters for caps and cooldowns on email we send for visitors (quote requests, weekly-alert confirmations).
-- `key` is a one-way hash (of an account id, an address or a network address), never the raw value. Rows older than two days are deleted on every insert.
CREATE TABLE IF NOT EXISTS send_throttle (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  key        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_send_throttle ON send_throttle(kind, key, created_at);

-- S-04: who created an installer profile, and whether its website was typed by a visitor (web_src = 'user') or set by Admin / the seed data ('').
-- Only an Admin-set website lets an email at that domain claim the profile at once.
ALTER TABLE installers ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
ALTER TABLE installers ADD COLUMN web_src   TEXT NOT NULL DEFAULT '';
