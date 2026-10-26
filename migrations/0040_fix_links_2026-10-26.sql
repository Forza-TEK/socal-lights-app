-- 0040 fix broken source links (2026-10-26). Each URL below was loaded and returned 200 on 2026-10-26.

-- A: Solvang visitor site, Julefest page shows Nov 27 2026 - Jan 3 2027, light show nightly at 5,6,7,8,9pm
UPDATE events SET url='https://solvangusa.com/things-to-do/solvang-julefest/', updated_at=datetime('now') WHERE id='lg-solvang-light-music-show';

-- A: laquintaresort.com/the-holidays: "Annual Tree Lighting Sunday, November 29, 2026 4pm, Main Drive"
UPDATE events SET url='https://www.laquintaresort.com/the-holidays/', status='confirmed', hours='4pm', updated_at=datetime('now') WHERE id='g16-la-quinta-resort-tree-lighting';

-- A: visitlongbeach.com annual-events/tree-lighting: Long Beach Christmas Tree Lighting 2026, Dec 7 5-8pm, Terrace Theater Plaza; free but tickets required
UPDATE events SET url='https://www.visitlongbeach.com/events/annual-events/tree-lighting/', start_date='2026-12-07', end_date='2026-12-07', status='confirmed', hours='5pm–8pm', price='Free (tickets required)', updated_at=datetime('now') WHERE id='downtown-long-beach-tree-lighting';

-- A: montereypark.ca.gov/1385: 13th Annual Holiday Snow Village Thu Dec 3 2026, Barnes Park, registration required
UPDATE events SET url='https://www.montereypark.ca.gov/1385/Holiday-Snow-Village', status='confirmed', hours='4pm–8pm (free timed registration required)', updated_at=datetime('now') WHERE id='monterey-park-holiday-snow-village';

-- A: lemongrove.ca.gov homepage shows "COMMUNITY BONFIRE DECEMBER 04, 2026" (no time given; hours left as is)
UPDATE events SET url='https://www.lemongrove.ca.gov/', status='confirmed', updated_at=datetime('now') WHERE id='lemon-grove-community-bonfire';

-- A: lapuente.org/holiday-parade (published Oct 2026): Friday December 4th, parade begins 6:00pm along Main Street
UPDATE events SET url='https://lapuente.org/holiday-parade/', status='confirmed', hours='6pm', updated_at=datetime('now') WHERE id='la-puente-holiday-parade';

-- A: spholidayparade.com: 46th Annual parade, Sunday December 6, 2026, 1pm-3pm
UPDATE events SET url='https://www.spholidayparade.com/', status='confirmed', hours='1pm–3pm', blurb='San Pedro Chamber''s holiday parade (46th in 2026) up Pacific Ave from 13th St, turning onto 6th St to Palos Verdes St. 2025 was Sun Dec 7.', updated_at=datetime('now') WHERE id='spirit-of-san-pedro-holiday-parade';

-- A: poway.org calendar entry: Christmas in the Park Fri Dec 11 and Sat Dec 12 2026, 3:30-8:30pm, tree lighting 6pm, Santa visit $5
UPDATE events SET url='https://www.poway.org/m/calendar/event/detail/6137', hours='3:30pm–8:30pm; tree lighting 6pm', updated_at=datetime('now') WHERE id='poway-christmas-in-the-park';

-- A: nixonfoundation.org/event/a-revolutionary-christmas (2026 flyer, Dec 8 2026 5-9pm; fields already match)
UPDATE events SET url='https://www.nixonfoundation.org/event/a-revolutionary-christmas/', updated_at=datetime('now') WHERE id='noc-nixon-revolutionary-christmas';

-- A: walnutca.gov Special Events page: Winter Wonderland Saturday Dec 12 2026, 3-8pm, Suzanne Park
UPDATE events SET url='https://www.walnutca.gov/For-Residents/Departments/Community-Services/Recreation/Special-Events', status='confirmed', hours='3pm–8pm', updated_at=datetime('now') WHERE id='pv-walnut-winter-wonderland';

-- A: envisionmv.com/events lists Night Market Sat Dec 19 2026 5-9pm, free, not cancelled (sibling "Cancelled" item was the Nov 2025 Glowfest edition). Status kept expected: listing does not name the Mix and Mingle / Santa parts.
UPDATE events SET url='https://envisionmv.com/events/', hours='5pm–9pm — check site', updated_at=datetime('now') WHERE id='soc-mv-holiday-night-market';

-- A (url only): Griffith Park train current page still shows 2025-26 season (Nov 28 2025 - Jan 11 2026); 2026 not published, dates stay expected
UPDATE events SET url='https://www.griffithparktrainrides.com/holiday-lights-train-ride/', updated_at=datetime('now') WHERE id='griffith';

-- B + status downgrade: temeculaca.gov/Holidays lists the 2026 city events (tree lighting Nov 30, Electric Light Parade Dec 4) but not this event; the old article was the Dec 2025 edition, so the 2026 dates are unconfirmed
UPDATE events SET url='https://temeculaca.gov/Holidays', status='expected', updated_at=datetime('now') WHERE id='g15-very-merry-temecula-christmas';

-- B: working official roundup/venue pages, no 2026 listing for these events yet (status unchanged)
UPDATE events SET url='https://unionstationla.com/happenings/', updated_at=datetime('now') WHERE id='g21-union-station-tree-lighting';
UPDATE events SET url='https://2ndandpch.com/events/holiday/', updated_at=datetime('now') WHERE id='2nd-pch-tree-lighting';
UPDATE events SET url='https://sealbeachca.gov/about-us/events/', updated_at=datetime('now') WHERE id='noc2-seal-beach-tree-lighting';
UPDATE events SET url='https://www.thepaseopasadena.com/events', updated_at=datetime('now') WHERE id='paseo-pasadena-tree-lighting';
UPDATE events SET url='https://www.nixonfoundation.org/events/', updated_at=datetime('now') WHERE id='noc-nixon-holiday-tree-showcase';
UPDATE events SET url='https://www.uplandca.gov/calendar.php', updated_at=datetime('now') WHERE id='pv-upland-tree-lighting';
UPDATE events SET url='https://www.applevalley.org/', updated_at=datetime('now') WHERE id='apple-valley-tree-lighting';
UPDATE events SET url='https://www.barstow.edu/about-bcc/barstow-college-foundation/events-bcf/festival-lights-learning', updated_at=datetime('now') WHERE id='g18-barstow-college-festival-lights';
UPDATE events SET url='https://carsonca.gov/eventslist.php', updated_at=datetime('now') WHERE id='carson-tree-lighting';
UPDATE events SET url='https://www.stantonca.gov/departments/community_services/events.php', updated_at=datetime('now') WHERE id='stanton-tree-lighting';
UPDATE events SET url='https://lapuente.org/', updated_at=datetime('now') WHERE id='la-puente-tree-lighting';
UPDATE events SET url='https://www.chinohills.org/Calendar.aspx', updated_at=datetime('now') WHERE id='pv-chino-hills-tree-lighting';
UPDATE events SET url='https://cityofgardena.org/event-calendar/', updated_at=datetime('now') WHERE id='gardena-winter-wonderland';
UPDATE events SET url='https://www.lakeforestca.gov/calendar.php', updated_at=datetime('now') WHERE id='soc-lf-tree-lighting';
UPDATE events SET url='https://www.uplandca.gov/calendar.php', updated_at=datetime('now') WHERE id='pv-upland-hometown-holiday-parade';

-- C: Holiday Road Calabasas. Organizer page holidayroadusa.com/location-la/ states "Holiday Road will take a break in 2026." (returns in 2027). Removed for the 2026 season; re-add with the same id for 2027.
DELETE FROM events WHERE id='holroad';
