-- Paid "Featured" placement for events (see docs/monetization.md).
-- featured_until is optional (YYYY-MM-DD, inclusive); the scheduled upserts never touch these columns.
ALTER TABLE events ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN featured_until TEXT;
