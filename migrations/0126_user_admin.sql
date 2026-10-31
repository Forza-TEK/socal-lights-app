-- Admin management of accounts: suspend/reactivate, and a private note per person. Additive only, safe defaults.
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';   -- active | suspended
ALTER TABLE users ADD COLUMN suspended_at TEXT;
ALTER TABLE users ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';
