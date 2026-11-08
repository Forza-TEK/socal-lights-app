-- Contest passes (owner decision 2026-11-07). Each ORGANIZATION gets 1 free contest per 12-month window; more contests in the window need a pass by cap (prices live in
-- functions/_lib/passes.js only). Add-only; no data is written for any real organization (comps are granted by hand in Admin > Contests > Contest passes).
--   contests.org_key  : who the contest belongs to for counting. "d:<registrable host>" when the organizer's verified email matches the contest website, else "u:<account email>".
--   contests.live_at  : the Pacific date the contest first went live (live or announced). '' = never live (draft, held for review, declined before ever live): it does not count.
--                       A contest that was live and later unpublished keeps its live_at, so it still counts.
-- Existing contests that are live or announced are stamped with the day they were created (there are none live today).
ALTER TABLE contests ADD COLUMN org_key TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN live_at TEXT NOT NULL DEFAULT '';
UPDATE contests SET live_at = substr(created_at, 1, 10) WHERE status = 'live' OR announced = 1;
CREATE INDEX IF NOT EXISTS idx_contests_org ON contests(org_key, live_at);

-- One row per paid pass (the Stripe Checkout session id makes a replayed webhook harmless). cap = TOTAL contests the pass allows in its window (the free first one included).
-- status: active | revoked (refunded or lost dispute before the extra contests were used).
CREATE TABLE IF NOT EXISTS contest_passes (
  session_id   TEXT PRIMARY KEY,
  org_key      TEXT NOT NULL,
  cap          INTEGER NOT NULL,
  window_start TEXT NOT NULL,
  window_end   TEXT NOT NULL,
  cents        INTEGER NOT NULL,           -- the price of the pass tier (not what was paid: an upgrade pays the difference)
  status       TEXT NOT NULL DEFAULT 'active',
  user_id      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contest_passes_org ON contest_passes(org_key, window_start);

-- Admin comps: allowed = total contests per window (-1 = unlimited) while today <= valid_until. Granted by hand in Admin; never shown with a price to the organizer.
CREATE TABLE IF NOT EXISTS contest_comps (
  id          TEXT PRIMARY KEY,
  org_key     TEXT NOT NULL,
  allowed     INTEGER NOT NULL,
  valid_until TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_by  TEXT NOT NULL DEFAULT '',
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contest_comps_org ON contest_comps(org_key);

-- Admin merge: contests resolved to from_key are counted under to_key.
CREATE TABLE IF NOT EXISTS contest_org_alias (
  from_key   TEXT PRIMARY KEY,
  to_key     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- "More than 20 contests: contact us" leads, visible in Admin > Contests > Contest passes.
CREATE TABLE IF NOT EXISTS contest_pass_leads (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  email      TEXT NOT NULL,
  org_key    TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
