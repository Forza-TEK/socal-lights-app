-- Page views, counted per page per day with no personal information (no IP address, no cookie, no user). Shown on the Admin dashboard.
CREATE TABLE IF NOT EXISTS site_hits (
  day  TEXT NOT NULL,                -- YYYY-MM-DD, Pacific time
  page TEXT NOT NULL,                -- a page group such as map, tutorials, contest, installer, city
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, page)
);
