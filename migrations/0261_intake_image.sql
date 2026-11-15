-- Grok intake: an optional photo LINK per row (linked from the event's own page, never copied; the card credits "Photo: <the event's site>" like every other linked photo).
ALTER TABLE intake_events ADD COLUMN image TEXT NOT NULL DEFAULT '';
