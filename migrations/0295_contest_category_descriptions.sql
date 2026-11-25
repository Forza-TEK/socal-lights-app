-- Contests: a description the organizer writes for each voting category, shown under the category name on the contest page, the ballot and the organizer's results.
-- JSON object { "<category name>": "<description>" }; '{}' = none written (every existing contest). Schema only: no existing row is changed.
ALTER TABLE contests ADD COLUMN category_desc TEXT NOT NULL DEFAULT '{}';
