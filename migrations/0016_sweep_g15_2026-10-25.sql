-- City sweep group 15 (Southwest Riverside & the Pass), 2026-10-25 — second pass.
-- A parallel run already added group 15 in 0015; this file only firms up those events and confirms existing ones.

-- Peltzer posted its 2026–27 season (9th season): Nov 19 – Jan 18, with prices and session times
UPDATE events SET status='confirmed', start_date='2026-11-19', end_date='2027-01-18',
  price='$20 ages 11+, $14 ages 10 & under; skates $2', 
  hours='Sessions vary: weekends/holidays ~10:30am–7:30pm, many weekdays 4:30pm & 6pm; closed Nov 26 & Dec 25',
  url='https://www.peltzerwinery.com/peltzer-ice-rink/', venue='Peltzer Farms (Farm Parking Lot, Entrance 3)',
  updated_at=datetime('now') WHERE id='g15-peltzer-ice-rink';

-- City calendar lists Winterfest on Sat Dec 5, 2026
UPDATE events SET status='confirmed', hours='4pm–8:30pm; parade 5pm (2025 schedule — check site)',
  url='https://www.lake-elsinore.org/358/Special-Events', updated_at=datetime('now') WHERE id='g15-lake-elsinore-winterfest-parade';

-- Exact venue coordinates for Pennypickle's Workshop (42081 Main St)
UPDATE events SET lat=33.493045, lng=-117.149724, updated_at=datetime('now') WHERE id='g15-temecula-santas-arrival';

-- Confirm 2026 dates on events already on the map
UPDATE events SET status='confirmed', start_date='2026-12-05', end_date='2026-12-05',
  hours='5pm parade on Florida Ave (Gilbert St to Santa Fe St); Christmas at the Park at Weston Park after',
  url='https://hemet365.com/event/city-of-hemet-christmas-parade/', updated_at=datetime('now') WHERE id='hemet-christmas-parade';
UPDATE events SET status='confirmed', start_date='2026-12-03', end_date='2026-12-03', hours='6pm',
  url='https://www.lake-elsinore.org/358/Special-Events', updated_at=datetime('now') WHERE id='lake-elsinore-tree-lighting';
