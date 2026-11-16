-- Audit L6 (2026-11-16): the organizer gets one email the day after voting ends if the winners are not announced yet, and Admin is told after 7 days.
-- remind_announce: 0 = nothing sent, 1 = the organizer was emailed, 2 = Admin was told as well (also set for contests whose voting ended before this ran, so nothing old is emailed).
ALTER TABLE contests ADD COLUMN remind_announce INTEGER NOT NULL DEFAULT 0;
UPDATE contests SET remind_announce = 2 WHERE announced = 0 AND vote_end < date('now', '-2 days');
