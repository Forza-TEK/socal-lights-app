-- Grok update call: changes Grok found on an event's own page for an event that is already on the map (dates, times, price, photo link, "confirmed").
-- Applied changes keep the values before and after, so Admin > From Grok > Updates can undo one with a click; changes that need the owner wait here as "held".
CREATE TABLE IF NOT EXISTS intake_updates (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,                   -- applied | held | reverted | dismissed
  kind TEXT NOT NULL DEFAULT '',          -- confirm | change | photo | cancelled
  reason TEXT NOT NULL DEFAULT '',        -- why it is held, or a note
  before TEXT NOT NULL DEFAULT '{}',      -- JSON of the event's values before
  after TEXT NOT NULL DEFAULT '{}',       -- JSON of the values Grok sent (what was or would be applied)
  url TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  seen TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  acted_at TEXT
);
CREATE INDEX IF NOT EXISTS intake_updates_status ON intake_updates (status, received_at);
CREATE INDEX IF NOT EXISTS intake_updates_event ON intake_updates (event_id);
