-- Venue name and street address for each event, used for directions and shown on the event card.
ALTER TABLE events ADD COLUMN venue TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN address TEXT NOT NULL DEFAULT '';
