-- Outreach safety net + newsletter permission (add-only; no data is written).
--
-- Grok (the owner's outreach agent) never gets database access. It calls a narrow key-protected API (functions/api/outreach/*) that answers with a status code only.
-- These tables hold ONLY one-way hashes of prospect addresses (SHA-256 of the lowercased, trimmed address plus a secret salt); no plaintext prospect address is ever stored.
--   outreach_suppressions : the shared "do not contact" list (replies, unsubscribes, bounces, complaints, manual entries, app unsubscribes and deleted accounts).
--                           alias = 1 marks the second hash stored for the same person (the same address without a +tag and Gmail dots).
--   outreach_events       : what Grok reports for results (sent, reply, bounce, complaint, unsubscribe) by step (0 original, 1 and 2 follow-ups) and segment.
--   outreach_rate         : one row per minute per key to hold the 60 requests a minute limit (old rows are deleted on use).
CREATE TABLE IF NOT EXISTS outreach_suppressions (
  email_hash TEXT PRIMARY KEY,
  reason     TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT '',
  first_seen TEXT NOT NULL,
  alias      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS outreach_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email_hash TEXT NOT NULL,
  alias_hash TEXT NOT NULL DEFAULT '',
  event      TEXT NOT NULL,
  step       INTEGER NOT NULL DEFAULT 0,
  segment    TEXT NOT NULL,
  day        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_outreach_events_hash ON outreach_events (email_hash);
CREATE INDEX IF NOT EXISTS idx_outreach_events_day ON outreach_events (day);
CREATE TABLE IF NOT EXISTS outreach_rate (
  bucket TEXT PRIMARY KEY,
  n      INTEGER NOT NULL DEFAULT 0
);

-- Monthly update: a SEPARATE, opt-in permission (never implied by having an account or a listing). One row per address.
--   role  : installer | host | family          topics : JSON array of topic ids (see functions/_lib/newsletter.js)
--   method: how they agreed ('profile checkbox', 'add-listing checkbox', 'prefs page')      source_page: where (profile, add-house, add-event, add-contest, prefs)
--   consent_text_version: which wording they saw (functions/_lib/newsletter.js)
--   unsubscribed_at: set when they unsubscribe (the row stays as the record that they opted out; the retention purge removes it after 12 months)
--   token : the secret in the preferences link (/prefs?t=...) and the one-click List-Unsubscribe address; no login needed.
CREATE TABLE IF NOT EXISTS newsletter_optins (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              TEXT,
  email                TEXT NOT NULL UNIQUE,
  role                 TEXT NOT NULL,
  topics               TEXT NOT NULL DEFAULT '[]',
  opted_in_at          TEXT NOT NULL,
  method               TEXT NOT NULL DEFAULT '',
  source_page          TEXT NOT NULL DEFAULT '',
  consent_text_version TEXT NOT NULL DEFAULT '',
  unsubscribed_at      TEXT,
  token                TEXT NOT NULL UNIQUE,
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_newsletter_user ON newsletter_optins (user_id);
