-- Seasons: every event and showcased house belongs to a season (christmas, halloween, ...)
ALTER TABLE events ADD COLUMN season TEXT NOT NULL DEFAULT 'christmas';
ALTER TABLE posts ADD COLUMN season TEXT NOT NULL DEFAULT 'christmas';
CREATE INDEX IF NOT EXISTS events_season ON events(season, end_date);
