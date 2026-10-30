-- Group 6 sweep 2026-10-30: Cerritos city post (Oct 27, 2026) moves the tree lighting to Santa's Sleigh Day at the library
UPDATE events SET start_date='2026-11-28', end_date='2026-11-28', status='confirmed', hours='2pm–5pm; tree lighting countdown 5:15pm',
  venue='Cerritos Library', address='18025 Bloomfield Ave, Cerritos, CA 90703', lat=33.8669818, lng=-118.0645843,
  name='Santa''s Sleigh Day & Christmas Tree Lighting',
  blurb='Santa arrives at the library with crafts, music and storytime, then the city Christmas tree lights up at 5:15pm.',
  url='https://www.cerritos.gov/news/posts/santas-sleigh-day-and-christmas-tree-lighting-offers-family-fun', updated_at=datetime('now')
WHERE id='cerritos-tree-lighting';
