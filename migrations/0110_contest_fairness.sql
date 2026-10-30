-- Contest fairness: voided votes, flagged (disqualify-at-close) entries, one-win-per-home, official rules text,
-- and a frozen results snapshot written when winners are announced. Additive only, safe defaults.
ALTER TABLE votes ADD COLUMN voided INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN dq INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contests ADD COLUMN one_win INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contests ADD COLUMN rules TEXT NOT NULL DEFAULT '';
ALTER TABLE contests ADD COLUMN results TEXT NOT NULL DEFAULT '';
