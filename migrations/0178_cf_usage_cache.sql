-- One cached copy of the Cloudflare usage numbers for Admin > Usage and the limit check (refreshed at most every 5 minutes,
-- so the panel itself does not use quota). Holds only usage counts, no personal data.
CREATE TABLE IF NOT EXISTS cf_usage_cache (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  fetched_at TEXT NOT NULL,
  body       TEXT NOT NULL
);
