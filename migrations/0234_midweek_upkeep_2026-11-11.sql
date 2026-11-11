-- Midweek upkeep 2026-11-11: Ventura / Santa Barbara / San Bernardino date confirmations.
-- Sources: conejovalleyguide.com 2026 holiday roundup (dated 2026-11-09) and its event pages, syvholidaylights.com, redlandsparade.com, underwoodfamilyfarms.com, simivalleytowncenter.com.

-- Redlands Christmas Parade: organizer site says Sat Dec 5 2026, 6pm.
UPDATE events SET status='confirmed', start_date='2026-12-05', end_date='2026-12-05', hours='6pm', url='https://redlandsparade.com', updated_at=datetime('now') WHERE id='redlands-christmas-parade';

-- SYV Holiday Lights Festival: organizer site lists Dec 4-6, 11-13, 18-20, 5pm-9pm.
UPDATE events SET status='confirmed', start_date='2026-12-04', end_date='2026-12-20', hours='Fri–Sun 5pm–9pm', price='Check listing', free=0, url='https://syvholidaylights.com', updated_at=datetime('now') WHERE id='syv-holiday-lights-festival';

-- Old Town Camarillo Glow: moved to Saturday Dec 5 (was Dec 4), 5pm-8pm, ticketed.
UPDATE events SET status='confirmed', start_date='2026-12-05', end_date='2026-12-05', hours='5pm–8pm', price='Check listing', free=0, url='https://www.conejovalleyguide.com/local-events/camarillo-old-town-glow', updated_at=datetime('now') WHERE id='camarillo-old-town-glow';

-- Stagecoach Inn Holidays: 2026 page, prices changed.
UPDATE events SET status='confirmed', start_date='2026-12-04', end_date='2026-12-05', hours='Fri 6:30pm–8:30pm; Sat 1pm–4pm & 6:30pm–8:30pm', price='Ages 14+ $15; ages 5–13 $5; under 5 free', free=0, url='https://www.conejovalleyguide.com/local-events/holidays-at-the-inn-at-the-stagecoach-inn-museum', updated_at=datetime('now') WHERE id='g19-stagecoach-inn-holidays';

-- Ventura Winter Wine Walk & Street Fair: Sat Dec 5, 12pm-8pm; photo is the organizer page's og:image (people at the wine walk).
UPDATE events SET status='confirmed', hours='12pm–8pm', url='https://www.venturawinterwinewalk.com', updated_at=datetime('now') WHERE id='ventura-holiday-street-fair';
UPDATE events SET image='https://static.wixstatic.com/media/51e2c2_0de202386bb04083aee81586f2c4c635~mv2.jpg/v1/fill/w_2500,h_1667,al_c/51e2c2_0de202386bb04083aee81586f2c4c635~mv2.jpg', updated_at=datetime('now') WHERE id='ventura-holiday-street-fair' AND (image IS NULL OR image='');

-- Wild Lights at the Teaching Zoo: 2026 nights Nov 25, 27, 28; Dec 4, 5, 11, 12, 18-23, 6pm-8:30pm.
UPDATE events SET status='confirmed', hours='6pm–8:30pm on select nights; check site', price='Adults $17; kids & seniors $14', free=0, url='https://www.conejovalleyguide.com/local-events/wild-lights-at-the-teaching-zoo-at-moorpark-college', updated_at=datetime('now') WHERE id='teaching-zoo-wild-lights';

-- Christmas on the Farm (Underwood): organizer page, Nov 27-Dec 24, 9am-5pm, $12 weekdays / $16 weekends.
UPDATE events SET status='confirmed', hours='9am–5pm', price='$12–$16', free=0, url='https://underwoodfamilyfarms.com/christmas-on-the-farm/', updated_at=datetime('now') WHERE id='underwood-christmas-on-the-farm';

-- Simi Valley Town Center snow shows: organizer page says Nov 14-Dec 24, evening shows.
UPDATE events SET status='confirmed', start_date='2026-11-14', end_date='2026-12-24', hours='Evening shows 5pm–8:30pm', url='https://simivalleytowncenter.com/event/snow-shows/', updated_at=datetime('now') WHERE id='g19-simi-town-center-snow-show';

-- Promenade at Westlake tree lighting: listed Fri Nov 20 2026, 4pm-8pm in the 2026 roundup.
UPDATE events SET status='confirmed', hours='4pm–8pm', updated_at=datetime('now') WHERE id='g19-promenade-westlake-tree-lighting';

-- Christmas at the Ranch (Camarillo): Dec 1-2 2026, 4pm-8pm, free, Santa photos $20.
UPDATE events SET status='confirmed', hours='4pm–8pm', price='Free; Santa photos $20', free=1, updated_at=datetime('now') WHERE id='g19-camarillo-ranch-christmas';
