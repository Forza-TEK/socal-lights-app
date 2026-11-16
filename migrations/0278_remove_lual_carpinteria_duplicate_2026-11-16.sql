-- Light Up a Life, Carpinteria (Dec 12 2026, 5pm, Seal Fountain) was on the map twice: the sweep row g20-lual-carpinteria-2026 and the Grok row below.
-- Migration 0271 removed the same kind of duplicate for Goleta, Santa Barbara and eight other events, and missed this pair. Same handling: the sweep row stays;
-- the Grok row is taken off the map the way Admin > From Grok > Unpublish does it (its live event is deleted, the intake row is marked 'unpublished' so Grok cannot add it again).
-- A row with a paid Featured placement is never touched (none here).
-- validate: allow-destructive (removes one duplicate row, guarded by id)
UPDATE intake_events SET status='unpublished', acted_at=datetime('now') WHERE id='grok-43rd-light-up-a-life-car-b30002' AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);
DELETE FROM events WHERE id='grok-43rd-light-up-a-life-car-b30002' AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL);
