-- Street address for showcased houses. Always kept for the site owner's review;
-- shown publicly only when the submitter ticks "show this address" (show_address = 1).
ALTER TABLE posts ADD COLUMN address TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN show_address INTEGER NOT NULL DEFAULT 0;
