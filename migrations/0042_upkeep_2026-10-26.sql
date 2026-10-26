-- Weekly upkeep 2026-10-26

-- Confirmed (organizer pages show 2026 dates)
UPDATE events SET status='confirmed', start_date='2026-11-22', end_date='2027-01-09', hours='Nightly, evening timed entry; closed Nov 26 and Dec 25', price='Adults $29–$52, kids 2–12 $19–$37 (members less); anytime $85', free=0, updated_at=datetime('now') WHERE id='descanso';
UPDATE events SET status='confirmed', start_date='2026-11-20', end_date='2026-12-27', hours='Evenings, timed entry', price='From $29 (varies by date and time)', free=0, updated_at=datetime('now') WHERE id='enchant';
UPDATE events SET status='confirmed', start_date='2026-11-24', end_date='2026-12-30', hours='Select nights 6–9pm (last entry 8:30pm); closed Dec 25', price='$25 general, $20 ages 3–17, under 3 free', free=0, url='https://www.livingdesert.org/events/wildlights-2026/2026-11-24/', updated_at=datetime('now') WHERE id='wildlights';
UPDATE events SET status='confirmed', start_date='2026-11-19', end_date='2026-11-19', hours='5pm–8pm', url='https://www.rodeodrive-bh.com/upcoming-events', updated_at=datetime('now') WHERE id='rodeo-drive-holiday-lighting';
UPDATE events SET status='confirmed', start_date='2026-11-21', end_date='2026-11-21', hours='4pm–6pm', url='https://theshopsonelpaseo.com/events/', updated_at=datetime('now') WHERE id='el-paseo-tree-lighting';

-- Updated
-- Citadel: 2026 tree lighting & concert announced for Nov 7 at 5pm (NBC LA, Oct 19 2026); season end still estimated
UPDATE events SET start_date='2026-11-07', hours='Tree lighting & concert Sat Nov 7 from 5pm; nightly snowfall after — check site', updated_at=datetime('now') WHERE id='citadel';
-- Big Bear Alpine Zoo Wild Lights ran Nov 6 2025–Jan 4 2026 (Wed–Sun, $20); estimate 2026 on the same pattern
UPDATE events SET start_date='2026-11-05', end_date='2027-01-03', hours='Expected Wed–Sun evenings (open daily Dec 22–Jan 3 in 2025) — check site', price='$20 in 2025; kids 5 and under free', updated_at=datetime('now') WHERE id='bbzoo';

-- Hygiene: expected rows whose hours did not say the times are estimates
UPDATE events SET hours=hours || ' — check site', updated_at=datetime('now') WHERE status='expected' AND hours NOT LIKE '%check site%' AND id IN ('123farm','dplights','americana','pasadena','grove','mol','griffith','venice','jingle','guasti','sparkle','ctl','sleepy','g15-very-merry-temecula-christmas','ccl-es','mdr','osparade','ccl-wh','lg-holly-trolley-oxnard','g1-olvera-las-posadas','discovery-cube-la-noon');

-- Removed: Astra Lumina's page says it has left Los Angeles
DELETE FROM events WHERE id='astra';
