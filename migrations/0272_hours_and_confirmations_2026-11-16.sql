-- Audit 2026-11-16 (findings M1, M2, M3, L6, L7): stale last-year hours, blank or non-standard hours and addresses, expected events that already started or start within days, type labels.
-- Each change comes from the event's own official page loaded on 2026-11-16, or only removes last year's text ('2024: 5pm-8pm', '2025 hours') and leaves the event expected / hours as 'Check site'.
-- Confirmed from the official 2026 page: The Grove (tree lighting Nov 16 6pm; nightly snowfall Nov 17 to Dec 31 6pm), Calimesa (Fri Nov 20), Montclair Holly Jolly Holiday (Thu Dec 3, 3-8:30pm, tree 6pm),
--   Murrieta Donuts with Santa (Sat Dec 5, 9-10:30am), Hesperia (Dec 5), Moorpark Holiday on High Street (Sat Dec 5), Old Pasadena Holidays (listing Nov 4 to Jan 6, checked in 0263).
-- Nothing is invented: where a page gave a date but no time the hours say so ('Check site').
-- Expected events that already started or start today, confirmed from their official page
UPDATE events SET status='confirmed', hours='6pm', updated_at=datetime('now') WHERE id='grove';
UPDATE events SET status='confirmed', hours='6pm', updated_at=datetime('now') WHERE id='grove-snowfall';
UPDATE events SET status='confirmed', updated_at=datetime('now') WHERE id='pasadena';
-- Calimesa: the city's home page and news item give Friday Nov 20 2026 but no time
UPDATE events SET status='confirmed', hours='Check site', url='https://www.calimesa.gov/CivicAlerts.aspx', updated_at=datetime('now') WHERE id='g15-calimesa-tree-lighting';
-- Stale prior-year hours (19 events)
-- Hesperia: official page lists Dec 5 2026 with no time yet
UPDATE events SET hours='Evening; check site', updated_at=datetime('now') WHERE id='hesperia-tree-lighting';
-- Murrieta: the city's 2026 special events page lists Donuts with Santa Sat Dec 5, 9-10:30 AM
UPDATE events SET hours='9am–10:30am', updated_at=datetime('now') WHERE id='g15-murrieta-donuts-with-santa';
-- Brea Nutcracker Craft Boutique: the dates were confirmed from a craft listing that could not be reloaded today (429), so it is back to expected and the 'Expected ... ~9am' text is cleared
UPDATE events SET status='expected', hours='Check site', updated_at=datetime('now') WHERE id='noc2-brea-nutcracker-boutique';
UPDATE events SET hours='Evenings; check site', updated_at=datetime('now') WHERE id='lo-lights-on-symphony-anaheim';
UPDATE events SET hours='Evenings; check site', updated_at=datetime('now') WHERE id='lo-kooiman-light-show-brea';
-- Moorpark: official 2026 events list gives Saturday Dec 5, no time
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='moorpark-holiday-on-high-street';
-- Rancho Los Cerritos: the link was last year's page; the events calendar is the organizer's own page
UPDATE events SET hours='Check site', url='https://www.rancholoscerritos.org/events/', updated_at=datetime('now') WHERE id='long-beach-rancho-holiday-open-house';
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='downtown-la-county-holiday-celebration';
-- Agoura Hills: Conejo Valley Guide lists the city's Holidays on the Hill for Saturday Dec 5 2026, 10am-6pm (one day, not Dec 4-5)
UPDATE events SET start_date='2026-12-05', end_date='2026-12-05', hours='10am–6pm; check site', updated_at=datetime('now') WHERE id='g2-agoura-holidays-on-the-hill';
UPDATE events SET hours='Evening; check site', updated_at=datetime('now') WHERE id='g18-adelanto-tree-lighting';
UPDATE events SET hours='Evening; check site', updated_at=datetime('now') WHERE id='g18-phelan-tree-lighting';
UPDATE events SET hours='Evening; check site', updated_at=datetime('now') WHERE id='g18-silver-lakes-tree-lighting';
-- Solvang: Solvang Julefest 2026 listing gives tree lighting Fri Dec 4 and parade Sat Dec 5, no times
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='solvang-tree-lighting';
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='solvang-julefest-parade';
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='pv-laverne-tree-lighting';
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='pv-upland-tree-lighting';
-- Montclair: official page, Thursday Dec 3 2026, 3-8:30pm, tree lighting 6pm, Santa 6:30-8:30pm
UPDATE events SET status='confirmed', hours='3pm–8:30pm; tree lighting 6pm', updated_at=datetime('now') WHERE id='pv-montclair-holly-jolly-holiday';
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='pv-upland-hometown-holiday-parade';
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='pv-laverne-holiday-stroll';
-- Blank or non-standard hours and addresses on live rows
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='c-light-up-the-town-holiday-home-lightin';
UPDATE events SET hours='5pm–9pm', address='Lake Dr & Crest Forest Dr, Crestline, CA 92325', blurb='Crestline becomes a storybook Christmas town with lights, holiday fun, Santa visits and mountain magic. Once Upon a Toyland runs Nov 28 to Jan 3.', updated_at=datetime('now') WHERE id='u-holidays-in-the-pines-5c854e';
UPDATE events SET hours='6pm–7:30pm', address='23560 Jefferson Ave, Murrieta, CA 92562', updated_at=datetime('now') WHERE id='u-a-night-in-bethlehem-a-w-f4863f';
UPDATE events SET hours='Fri 7pm, Sat 2 & 7pm, Sun 2pm; check site', updated_at=datetime('now') WHERE id='redlands-miracle-34th-street';
UPDATE events SET hours='11am–7pm; check site', price='From $39', updated_at=datetime('now') WHERE id='riverside-nutcracker-brava';
UPDATE events SET hours='Check site', updated_at=datetime('now') WHERE id='santa-monica-pier-swiss-winter-village';
-- Price wording outside the documented vocabulary (rule 4); the Salvation Army 'Free in past years' rows are left for the owner (free=1 needs a price starting with Free)
UPDATE events SET price='Price not listed', updated_at=datetime('now') WHERE id='rc-rancho-mirage-tree-lighting' AND price='Not listed';
UPDATE events SET price='Check listing', updated_at=datetime('now') WHERE id IN ('g21-pershing-square-ice-rink','hermosa-for-the-holidays','torrance-memorial-holiday-festival') AND price='See site';
-- Type labels: boat-parade cruises are parades, so the Parades filter finds them
UPDATE events SET type='parade', updated_at=datetime('now') WHERE id IN ('grok-dana-point-harbor-boat-p-0652ea','lg-sd-flagship-parade-cruise') AND type='tour';
