-- A contest's own logo (uploaded by its organizer; file kept in R2 as contestlogo/<contest id>/<ms timestamp>.<ext>). Empty = no logo: the pages draw an icon from the contest's name instead.
-- validate: allow-destructive (adds one empty column; no existing data is changed or removed)
ALTER TABLE contests ADD COLUMN logo TEXT NOT NULL DEFAULT '';
