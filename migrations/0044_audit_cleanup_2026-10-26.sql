-- Audit cleanup 2026-10-26: only changes backed by an organizer/city page that was loaded.

-- Corrected dates / confirmed from the organizer's own page
UPDATE events SET status='confirmed', end_date='2026-10-30', hours='Tue–Sun 10am–5pm; closed Oct 31; parade times — check site', price='Included with museum admission ($17; seniors $15)', updated_at=datetime('now') WHERE id='wsg-kidspace-halloween';
UPDATE events SET status='confirmed', start_date='2026-11-07', end_date='2026-11-07', hours='Noon Mass; celebration 1:30pm–6pm', blurb='Archdiocese and City of San Fernando community celebration with Mass, altars and music on Sat Nov 7, 2026.', updated_at=datetime('now') WHERE id='hw-sf-mission-cemetery-dia';
UPDATE events SET status='confirmed', hours='10am–5pm', url='https://canogaparkfestival.com', updated_at=datetime('now') WHERE id='hw-canoga-park-dia-festival';
UPDATE events SET status='confirmed', hours='6–9pm', url='https://www.templecity.us/halloween', blurb='City Halloween night carnival with game booths, inflatables, a haunted maze, trunk-or-treat, food trucks and costume contest.', updated_at=datetime('now') WHERE id='wsg-temple-city-halloween-carnival';
UPDATE events SET url='https://www.gorecreation.org/french-valley-halloween-spooktacular-will-be-oct-31', updated_at=datetime('now') WHERE id='g15-valley-wide-halloween-spooktacular';
UPDATE events SET start_date='2026-09-26', city='Santa Barbara', url='https://lanefarmssb.com/pumpkin-patch', updated_at=datetime('now') WHERE id='hw-lane-farms-pumpkins';
UPDATE events SET start_date='2026-09-26', address='5750 N River Rd, Oceanside, CA 92057', updated_at=datetime('now') WHERE id='hw-mellano-harvest-festival';

-- Listed as confirmed but no 2026 date found on an organizer page: back to expected
UPDATE events SET status='expected', hours='11:30am–3:30pm — check site', updated_at=datetime('now') WHERE id='g1-boonion-station';
UPDATE events SET status='expected', updated_at=datetime('now') WHERE id='encinitas-holiday-parade';
UPDATE events SET status='expected', hours='4–6pm — check site', updated_at=datetime('now') WHERE id='coc2-sa-magic-of-the-altars';

-- Address / url hygiene
UPDATE events SET address='25001 Dana Point Harbor Dr, Dana Point, CA 92629', url='https://raceroster.com/events/2026/112786/2026-dana-point-turkey-trot', updated_at=datetime('now') WHERE id='tg-dana-point-turkey-trot';
UPDATE events SET city='La Cañada Flintridge', updated_at=datetime('now') WHERE id='tg-lcf-thanksgiving-run';
UPDATE events SET url='https://runsignup.com/Race/CA/NorthHollywood/DrumstickDashLA', updated_at=datetime('now') WHERE id='tg-drumstick-dash-la';
UPDATE events SET url='https://www.fairwayvillagenews.com/?page_id=5', updated_at=datetime('now') WHERE id='g11-fairway-village-holiday-magic';
UPDATE events SET url=replace(url,' ','%20'), updated_at=datetime('now') WHERE id IN ('arcadia-tree-lighting','arcadia-snow-festival');
