-- Midweek upkeep 2026-11-07: date confirmations from organizer / 2026-dated pages.
UPDATE events SET start_date='2026-11-14', end_date='2026-11-14', status='confirmed', hours='4-9pm', url='https://simivalleytowncenter.com/event/22nd-annual-simi-valley-town-center-christmas-tree-lighting', updated_at=datetime('now') WHERE id='g19-simi-town-center-tree-lighting';
UPDATE events SET start_date='2026-11-28', end_date='2026-11-28', status='confirmed', hours='10am (parade on Main St, Seventh St to Mill St)', updated_at=datetime('now') WHERE id='santa-paula-holiday-parade';
UPDATE events SET status='confirmed', hours='10am-noon', url='https://venturacountycoast.com/event/oxnard-christmas-parade/', updated_at=datetime('now') WHERE id='oxnard-christmas-parade';
UPDATE events SET status='confirmed', hours='5-11pm nightly, drive-thru only (stay in your vehicle)', updated_at=datetime('now') WHERE id='pv-rc-thoroughbred-lights';
UPDATE events SET status='confirmed', hours='5-9pm nightly', updated_at=datetime('now') WHERE id='lo-redlands-light-up-the-night';
UPDATE events SET start_date='2026-12-13', end_date='2026-12-13', status='confirmed', hours='Noon-4pm', updated_at=datetime('now') WHERE id='ventura-harbor-winter-wonderland';
UPDATE events SET start_date='2026-12-13', end_date='2026-12-13', status='confirmed', hours='Check site for start time', url='https://www.venturaharborvillage.com/events', updated_at=datetime('now') WHERE id='ventura-santa-paddle';
