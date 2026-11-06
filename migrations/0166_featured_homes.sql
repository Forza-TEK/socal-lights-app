-- Phase 3: paid Featured placement for HOMES, only for the winner, 2nd and 3rd place of an announced contest.
-- A home carries the same fields an event does (0 = off, 1 = gold pin + badge, 2 = also listed first; featured_until is the last day, Pacific).
-- Nothing in the contest engine (ballots, votes, results, export) reads these columns; payment never changes a result.
ALTER TABLE posts ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN featured_until TEXT;
-- A Featured order now says what it was bought for. feature_orders.event_id holds the target's id (an event id, "sub:<id>", or a post id when target = 'home').
ALTER TABLE feature_orders ADD COLUMN target TEXT NOT NULL DEFAULT 'event';  -- event | home
