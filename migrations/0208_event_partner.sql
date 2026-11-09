-- Event Partner plan (owner decision 2026-11-09). Cities, chambers, nonprofits and event producers pay once per season (price in functions/_lib/partner.js only) and get the
-- Featured pin (level 1) on up to 10 of their events that season. Listing an event stays free. Add-only. org_key as in functions/_lib/passkey.js ("d:covinaca.gov" or "u:email").
-- event_partner_plans : one row per paid plan (Stripe Checkout session id makes a replayed webhook harmless). status: active | revoked (refund / lost dispute).
CREATE TABLE IF NOT EXISTS event_partner_plans (
  session_id   TEXT PRIMARY KEY,
  org_key      TEXT NOT NULL,
  season_key   TEXT NOT NULL,
  season_start TEXT NOT NULL,
  season_end   TEXT NOT NULL,
  cap          INTEGER NOT NULL,
  cents        INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  user_id      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_epp_org ON event_partner_plans(org_key, season_start);
-- Admin comps: covered at no price while today <= valid_until. allowed = events per season (-1 = unlimited). Never shown with a price.
CREATE TABLE IF NOT EXISTS event_partner_comps (
  id          TEXT PRIMARY KEY,
  org_key     TEXT NOT NULL,
  allowed     INTEGER NOT NULL,
  valid_until TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_by  TEXT NOT NULL DEFAULT '',
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_epc_org ON event_partner_comps(org_key);
-- One row per event covered in a season (a slot used). source_session = the plan's session id, or '' for a comp. status: active | released (Admin freed the slot) | revoked (plan refunded).
CREATE TABLE IF NOT EXISTS event_partner_events (
  event_id       TEXT NOT NULL,
  season_start   TEXT NOT NULL,
  org_key        TEXT NOT NULL,
  source_session TEXT NOT NULL DEFAULT '',
  applied_from   TEXT NOT NULL,
  applied_until  TEXT NOT NULL,
  applied_featured INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'active',
  user_id        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, season_start)
);
CREATE INDEX IF NOT EXISTS idx_epe_org ON event_partner_events(org_key, season_start);
-- The badge: partner_until = last day the covered event shows "Event Partner"; partner_verified = the organization key is a website domain matched by the buyer's email (trustOf).
ALTER TABLE events ADD COLUMN partner_until TEXT;
ALTER TABLE events ADD COLUMN partner_verified INTEGER NOT NULL DEFAULT 0;
-- Founder cities: Event Partner free THIS YEAR ONLY (valid through 2026-12-31; after that the normal price shows). Idempotent, stable ids.
INSERT OR IGNORE INTO event_partner_comps (id, org_key, allowed, valid_until, note, created_by) VALUES
  ('founder-eastvaleca-gov', 'd:eastvaleca.gov', 10, '2026-12-31', 'Founding city partner: Eastvale (free through 2026-12-31)', 'migration 0208'),
  ('founder-covinaca-gov',   'd:covinaca.gov',   10, '2026-12-31', 'Founding city partner: Covina (free through 2026-12-31)', 'migration 0208');
