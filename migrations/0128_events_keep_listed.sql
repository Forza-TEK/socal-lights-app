-- A sweep record at the same address as an approved house or installer post is hidden from the public map. keep_listed = 1 is the
-- admin's override: show that sweep record anyway. Sweeps and admin edits never touch this column. Additive only.
ALTER TABLE events ADD COLUMN keep_listed INTEGER NOT NULL DEFAULT 0;
