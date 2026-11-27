-- The three-dots menu no longer has "Browse by city" (or "Add"). The city list is still at /in; fix the help article that told people to tap it.
UPDATE help_articles SET
  summary = 'Open socallights.app/in. It lists every city with upcoming events, by county, and each city has its own page.',
  body = replace(replace(body,
    '1. On the map, tap the **three dots** at the right end of the top bar.
2. Tap **Browse by city**.
3. Cities are grouped',
    '1. Open **socallights.app/in** in your browser (or type a city name in the map''s search box to jump to it).
2. Cities are grouped'),
    '4. The city''s page lists', '3. The city''s page lists')
WHERE slug = 'browse-events-by-city';
