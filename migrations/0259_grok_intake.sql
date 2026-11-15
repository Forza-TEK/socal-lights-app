-- Grok event intake: rows Grok sends from its browser pass land here first. The site checks every row (same rules as the sweeps) and publishes the ones that pass
-- as confirmed events with an id starting "grok-". One click in Admin > From Grok unpublishes or republishes a row. See docs/monetization/grok-browser-pass.md.
CREATE TABLE IF NOT EXISTS intake_events (
  id TEXT PRIMARY KEY,                    -- same as the live event id for published rows (grok-<name>-<hash>)
  status TEXT NOT NULL,                   -- published | held (passed the checks, publishing is off) | unpublished (owner took it down) | rejected (failed a check)
  reason TEXT NOT NULL DEFAULT '',        -- why it was rejected, or the note on a held row
  name TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  season TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT '',
  free INTEGER NOT NULL DEFAULT 0,
  price TEXT NOT NULL DEFAULT '',
  blurb TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',           -- the event's own page, the one Grok read
  venue TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  evidence TEXT NOT NULL DEFAULT '',      -- what the page said (short quote from Grok)
  seen TEXT NOT NULL DEFAULT '',          -- the day Grok read the page
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  acted_at TEXT                            -- last publish / unpublish by the owner
);
CREATE INDEX IF NOT EXISTS intake_events_status ON intake_events (status, received_at);
CREATE INDEX IF NOT EXISTS intake_events_key ON intake_events (start_date, city);
