-- Contest pricing change (2026-11-09): the contest ads no longer say the first contest is free. Meta copy in ads_items brought in line with docs/marketing/ads-content.json. Add-only data change.

UPDATE ads_items SET concept = 'A: Run a contest', headline = 'Run a home lights contest', primary_text = 'Cities, HOAs, schools, chambers: set up a home lights contest in minutes. Entering is free for residents.', description = 'Free for residents to enter' WHERE id = 'ct-a-meta';
UPDATE ads_items SET concept = 'B: Judges, awards, QR', headline = 'Judges, awards and a QR poster', primary_text = 'Run your neighborhood lights contest online: resident entries, judges, and People''s Choice and Judges'' Choice awards.', description = 'Free for residents to enter' WHERE id = 'ct-b-meta';
