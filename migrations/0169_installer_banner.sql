-- Installer banner: a thin, labelled strip on the map showing installers whose service area is in view.
-- banner_until: last day (YYYY-MM-DD) the installer is shown; empty = not on the banner. Set by an admin (free pilot first).
ALTER TABLE installers ADD COLUMN banner_until TEXT NOT NULL DEFAULT '';
-- Daily counts per installer: shown, company-link taps, phone taps.
CREATE TABLE IF NOT EXISTS banner_stats (
  installer_id TEXT NOT NULL,
  day          TEXT NOT NULL,
  imp          INTEGER NOT NULL DEFAULT 0,
  click        INTEGER NOT NULL DEFAULT 0,
  call         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (installer_id, day)
);
