-- Installer "top of the list" card ($75 tier): a labelled company card at the top of the map list, behind Featured events.
-- top_until: last day (YYYY-MM-DD) the card is shown; empty = no card. The $75 tier also gets the banner (set banner_until too).
ALTER TABLE installers ADD COLUMN top_until TEXT NOT NULL DEFAULT '';
-- Daily counts for the list card, next to the banner counts.
ALTER TABLE banner_stats ADD COLUMN lst_imp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE banner_stats ADD COLUMN lst_click INTEGER NOT NULL DEFAULT 0;
ALTER TABLE banner_stats ADD COLUMN lst_call INTEGER NOT NULL DEFAULT 0;
