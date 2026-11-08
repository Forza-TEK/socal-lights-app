-- A display added through "Is this your home?" on the map remembers which automatic (sweep-made) listing it claims.
-- It is only shown to Admin when reviewing; the replacement itself still follows the same-address rule (docs/superseding.md).
ALTER TABLE posts ADD COLUMN claim_event_id TEXT NOT NULL DEFAULT '';
