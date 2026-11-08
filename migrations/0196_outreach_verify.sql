-- Outreach deliverability pre-check (add-only; no data is written).
--   outreach_dns_cache : one row per business email DOMAIN (never an address, never a person): whether the domain can receive mail ('ok' or 'no_mail_server'),
--                        looked up through DNS-over-HTTPS. checked_at is epoch milliseconds; rows older than 24 hours are ignored and pruned on write.
--   outreach_invalid   : an address Grok reported as undeliverable (one-way hash only, same salt as outreach_suppressions) and why; later checks answer from it.
--                        It is NOT the do-not-contact list: a bad address is not a person who asked to be left alone.
CREATE TABLE IF NOT EXISTS outreach_dns_cache (
  domain     TEXT PRIMARY KEY,
  result     TEXT NOT NULL,
  checked_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS outreach_invalid (
  email_hash TEXT PRIMARY KEY,
  reason     TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
