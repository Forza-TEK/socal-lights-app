-- AI assistant actions (docs/ai-assistant-actions-design.md). Add-only.
-- chat_actions: counters only, one number per UTC day per action name ("ask_human", "weekly_email", ...). No message text, no address, no visitor id.
CREATE TABLE IF NOT EXISTS chat_actions (
  day    TEXT NOT NULL,
  action TEXT NOT NULL,
  shown  INTEGER NOT NULL DEFAULT 0,
  done   INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, action)
);
-- Switches per tier (owner decision 2026-11-10: all on). The main on/off and the kill switch still win over these.
INSERT OR IGNORE INTO chat_settings (key, value) VALUES ('chat_tier1', '1');
INSERT OR IGNORE INTO chat_settings (key, value) VALUES ('chat_tier2', '1');
INSERT OR IGNORE INTO chat_settings (key, value) VALUES ('chat_tier3', '1');
-- Owner decision 2026-11-10: a $10 monthly cap. Only raises the cap from the original $0; a cap the owner already chose is left alone.
UPDATE chat_settings SET value = '10', updated_by = 'migration 0201', updated_at = datetime('now') WHERE key = 'chat_cap_usd' AND value = '0';
