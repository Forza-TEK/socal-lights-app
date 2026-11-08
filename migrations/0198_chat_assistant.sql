-- AI assistant (chat widget): settings and anonymous daily counters (add-only; see docs/ai-assistant.md).
--
-- chat_settings : one row per setting, edited in Admin > AI assistant. The assistant is OFF until chat_enabled = '1'.
--                 chat_kill = '1' is the kill switch (wins over chat_enabled). chat_cap_usd is the monthly hard cap in dollars
--                 (0 = free allowance only; Admin allows 0 to 10). chat_daily_max is the most chats started per day (UTC).
-- chat_usage    : one row per UTC day with COUNTS ONLY. No message text, no IP address, no visitor id is ever stored here.
--                 neurons = Cloudflare Workers AI usage (free allowance is 10,000 a day); usd_micro = millionths of a dollar spent
--                 on the paid Claude path (0 unless that path is switched on).
CREATE TABLE IF NOT EXISTS chat_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO chat_settings (key, value) VALUES ('chat_enabled', '0');
INSERT OR IGNORE INTO chat_settings (key, value) VALUES ('chat_kill', '0');
INSERT OR IGNORE INTO chat_settings (key, value) VALUES ('chat_cap_usd', '0');
INSERT OR IGNORE INTO chat_settings (key, value) VALUES ('chat_daily_max', '300');
-- chat_topics    : "unanswered topics": when nothing in the knowledge base matched a question, one count under a fixed topic bucket (for example "accounts" or "contest-setup").
--                 The bucket name is chosen by our own code from a fixed list; the question itself is never stored. Admin shows the top buckets so we know what help to write.
CREATE TABLE IF NOT EXISTS chat_topics (
  day   TEXT NOT NULL,
  topic TEXT NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, topic)
);
CREATE TABLE IF NOT EXISTS chat_usage (
  day            TEXT PRIMARY KEY,
  chats          INTEGER NOT NULL DEFAULT 0,
  turns          INTEGER NOT NULL DEFAULT 0,
  tokens_in      INTEGER NOT NULL DEFAULT 0,
  tokens_out     INTEGER NOT NULL DEFAULT 0,
  neurons        INTEGER NOT NULL DEFAULT 0,
  usd_micro      INTEGER NOT NULL DEFAULT 0,
  blocked_scope  INTEGER NOT NULL DEFAULT 0,
  blocked_output INTEGER NOT NULL DEFAULT 0,
  blocked_limit  INTEGER NOT NULL DEFAULT 0,
  capped         INTEGER NOT NULL DEFAULT 0,
  errors         INTEGER NOT NULL DEFAULT 0,
  gaps           INTEGER NOT NULL DEFAULT 0
);
