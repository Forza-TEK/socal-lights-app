-- M4 (2026-11-16 audit): a home's street address is public, so the poster now states that it is their home or that they have its owner's permission.
-- The time they said so is kept with the home. Additive only; older homes stay NULL (they were added before the statement existed).
ALTER TABLE posts ADD COLUMN address_consent_at TEXT;
