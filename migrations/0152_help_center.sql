-- Help Center (/help): written articles, what people searched for, and "was this helpful?" votes.
-- Articles are edited in Admin > Help. The first set is added by the next migration (it never overwrites an edited article).
CREATE TABLE IF NOT EXISTS help_articles (
  slug       TEXT PRIMARY KEY,                 -- the page address: /help/<slug>
  title      TEXT NOT NULL,                    -- in the words people use ("I did not get the email")
  category   TEXT NOT NULL,                    -- one of the keys in functions/_lib/help.js
  kind       TEXT NOT NULL DEFAULT 'howto',    -- howto | fix | answer
  summary    TEXT NOT NULL DEFAULT '',         -- the one-sentence answer, shown first and in search results
  body       TEXT NOT NULL DEFAULT '',         -- plain text: blank line = new paragraph, "- " = list, "1. " = steps
  keywords   TEXT NOT NULL DEFAULT '',         -- extra words people might type, so search finds the article
  video      TEXT NOT NULL DEFAULT '',         -- file name of the tutorial, e.g. find-email ("" = no video)
  sort       INTEGER NOT NULL DEFAULT 100,     -- lower shows first within its category
  status     TEXT NOT NULL DEFAULT 'published',-- published | draft
  updated_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_help_articles_cat ON help_articles (category, sort);

-- Every search, so the Admin can see what people looked for and did not find. No IP address or account is stored.
CREATE TABLE IF NOT EXISTS help_searches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  q          TEXT NOT NULL,
  results    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_help_searches_day ON help_searches (created_at);

-- "Was this helpful?" votes. `who` is a short one-way fingerprint of the connection, only to stop one person voting many times.
CREATE TABLE IF NOT EXISTS help_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  helpful    INTEGER NOT NULL,                 -- 1 yes, 0 no
  note       TEXT NOT NULL DEFAULT '',         -- what was missing (optional, only on a "no")
  who        TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_help_votes_slug ON help_votes (slug, created_at);
