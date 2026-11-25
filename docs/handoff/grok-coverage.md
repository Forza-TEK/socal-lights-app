# Who sweeps what

Grok (the SoCal Lights intake bot) is the only discovery sweeper as of 2026-11-15, per Rey. This file is the record of who sweeps what. It follows `docs/handoff/to-claude/2026-11-15-grok-sweep-scope.md` and the city groups in `docs/coverage-cities.md`.

Grok finds events and POSTs new rows to `POST /api/intake/events` (max 8 per call) with `GROK_INTAKE_KEY`, following `docs/monetization/grok-browser-pass.md`. It checks the public map first and does not resend an event already listed.

## Cadence

An automated run every 2 days at about 9:11 AM PT, plus extra sweeps when Rey asks.

## City groups

All 21 groups in `docs/coverage-cities.md`. Every city and community key in `public/cities.js` is in one of these groups, across the 7 counties (LA, Orange, San Diego, Riverside, San Bernardino, Ventura, Santa Barbara).

Work `cities_without_events` and `cities_fewest_events` from `GET /api/intake/work-order` first, then the thin categories.

1. Central LA & Westside
2. Valley & Verdugos
3. West San Gabriel Valley
4. Pomona Valley & East SGV
5. South Bay
6. Long Beach & Gateway Cities
7. North LA County
8. South OC
9. Central OC & Coast
10. North OC
11. City of San Diego & Coronado
12. North County
13. East County & South Bay
14. Western Riverside County
15. Southwest Riverside & the Pass
16. Coachella Valley
17. San Bernardino Valley & West End
18. High Desert & Mountains
19. Ventura County
20. Santa Barbara County
21. Region-wide sources

## Categories

Seasons and types follow the work order: Thanksgiving, Christmas (including the `santa` type), Hanukkah and menorah lightings, New Year's Eve, First Day hikes and polar plunges, Lunar New Year, and whatever else the work order lists.

### Website sweep

Official event pages. One source per bullet:

- **Cities.** City websites and parks & recreation departments.
- **Counties.** All 7 county governments, county parks, county fairgrounds and libraries.
- **State parks and federal or public lands.**
- **Churches and other houses of worship.** Live nativities, drive-thru nativities, Christmas services with public events, posadas, and menorah lightings at synagogues and Chabad centers.
- **Nativity scenes and displays.**
- **Chambers of commerce, business improvement districts and downtown associations.**
- **School, nonprofit, community and civic groups.** Rotary, Kiwanis, Knights of Columbus, Junior League, and so on.
- **HOAs and neighborhood holiday-light streets and home displays.** Only addresses a public post publishes.
- **Museums, zoos, botanic gardens and nature centers.**
- **Theme parks and attractions.**
- **Malls, outdoor shopping centers and markets.**
- **Theaters and performing arts venues.** Nutcracker and holiday shows.
- **Railroads and holiday trains, boat parades and harbors.**
- **Sports venues and ice rinks.**
- **Event listing sites.** Only when they lead to the official page.

### Hospitality sweep

Restaurants, bars, hotels and resorts, wineries (Temecula, Santa Ynez and Los Olivos, Malibu, Ramona), breweries, distilleries and cideries. Covers holiday dinners and brunches, Santa breakfasts, pop-up bars, New Year's Eve parties, tree lightings and markets.

### Venue watchlist

`docs/watchlist.json`. Skip entries marked `blocked`.

### Hotel and resort pass

The hotel and resort pass in `docs/city-sweep.md`: tree lightings, lights-on nights, Santa, markets, menorah lightings and New Year's Eve on the hotel or resort's own page.

### Contest and home displays

A contest home or a home display is sent only when a public page published the address. Never send entrants of contests run in the site's own contest tool (`hcontest-` ids).

### Social sweep (read-only, approved by Rey)

Signed-in Facebook (Events search), Instagram (`socal_lightsapp`), X, TikTok and Nextdoor. Read only. Never posts, likes, messages or RSVPs. An official page URL is preferred. A social URL is used only when no official page exists.

## Still Claude's

Weekly and midweek upkeep, and the photo refresh, stay with Claude until Grok has used the update call (`POST /api/intake/updates`) for about a week and Rey decides. Grok is still dry-running that call.

## Methods

Follow `docs/city-sweep.md`, `docs/sweep-methods.md` and `docs/blocked-sites.md`.

New watchlist venues and blocked sites go to Claude as a request in `docs/handoff/to-claude/`. Grok does not edit `docs/watchlist.json` or `docs/blocked-sites.md`.

## 2026-11-24

Grok catch-up run; the Nov 23 and Nov 24 scheduled runs were missed.

Monday recurring-event re-check done today: work order fetched with `skip_attempted_days=0` and paged (offset 0 and 500): 372 to confirm + 584 without a photo = 956 rows.

Focus categories: **runs** (84/90 → met) and **polar-dips** (6/8 → met), plus Thanksgiving-week items first (Nov 26–29).
- **RunSignup public race API** (new parent source): 23 races published: 4 Thanksgiving-morning trots/walks (College of the Canyons in Santa Clarita, Fleet Feet and Running of the Turkeys in San Diego, Kindness Matters Walk in Fullerton), 17 December Santa/jingle runs (LA, San Diego, Long Beach, Santa Monica, Chino, Beaumont, Goleta, Newbury Park, Palmdale, Escondido, Venice) and 2 New Year's runs (SBRA Resolution Run on Jan 1 in Santa Barbara; Griffith Park Resolution Run on Jan 3).
- **Hospitality pass:** 4 Thanksgiving meals published (Terranea, Four Seasons Los Angeles/Culina, South Coast Winery, Desert Willow's Terrace) and 1 Black Friday-weekend tree lighting (Dos Lagos, Corona). Casino NYE rows (Pala, Agua Caliente Cathedral City) are rejected by the intake filter; see to-claude.
- **Lunar:** Irvine Lunar New Year Parade corrected to Feb 6, 2027, 11am (aamuseumgp.org). Rancho Cucamonga Lunar Festival confirmed, Jan 16–17, 11am–8pm (calfestival.com).
- **California State Parks events layer:** re-checked. No 2027 First Day Hike rows yet. Bolsa Chica "Christmas at the Beach" was already on the map.
- **Empty cities:** 153 before and after. Tried: Pala (NYE rejected by filter), Cabazon (Morongo NYE, 403), Camp Pendleton Mainside/South (MCCS site 403), El Monte, South El Monte and Lawndale (no 2026 holiday pages found). All are queued for the browser pass.
- Next run: OC Public Libraries (libraries.oc.gov/events) for OC unincorporated places; Camp Pendleton results from the browser pass.

## 2026-11-22

Parent sources checked for small and unincorporated places (new since the Nov 21 section):
- **Riverside County Library LibCal** (rivlib.libcal.com; 398 events, Nov 22–Jan 10): **Anza** filled (Salt Dough Ornaments at Anza Library, Dec 3). Branches in other empty Riverside County places had nothing seasonal yet.
- **San Diego County Library BiblioCommons events** (sdcl.bibliocommons.com; 1,843 events): **Descanso** filled (Santa Claus Visit, Dec 19). I also published 9 more branch events: Lakeside, Valley Center, Vista ×2, Poway, Casa de Oro, Rancho Santa Fe, Santee, 4S Ranch and El Cajon.
- **California State Parks public events and First Day Hikes ArcGIS layers** (the data behind events.parks.ca.gov): published the Anza-Borrego First Day Hike (Borrego Springs). The Old Town Las Posadas date matched. The First Day Hikes layer has no 2027 rows yet.
- **Whitewater Preserve / Mission Creek** New Year's Day hike: **Whitewater** filled.
- **Visit Catalina Island events**: published Avalon Grille Thanksgiving. Two Harbors' Harbor Reef buffet was rejected because the address didn't geocode.
- **temeculawines.org events**: published the Europa Village NYE.
- Aggregator lists used only as leads (each row was sent from its own page): teamtitleguy turkey trots, funwithkidsinla trains, culturaldaily Nutcracker list, yoursocal and sandispots light guides.
- Still pending: Camp Pendleton city key (already filed in 2026-11-21-run-follow-ups.md), Needles, Guadalupe, Piru, Isla Vista, Coto de Caza, Trabuco Canyon, North Tustin, Valinda, Walnut Park.
- OC Public Libraries moved to libraries.oc.gov/events. I haven't swept it yet; it's next run's parent source for OC unincorporated places.

Empty cities: 155 → 152 (Anza, Descanso and Whitewater filled). Anza was empty again this morning because its earlier event had passed.

## 2026-11-21

Empty cities: 154 → 150 (Signal Hill, Meiners Oaks, Lynwood, Elfin Forest filled).

Parent sources checked for small/unincorporated places:
- Ventura County Library calendar (keyword sweep): **Meiners Oaks** found (Winter Break Crafts & Games, published). Saticoy, Oak View, Piru and El Rio branches: nothing seasonal posted yet.
- LA County Library Communico feed (45 days): **Lynwood** found (Winter Solstice Canvas Art, published); Sunkist Library (La Puente) Noon Year's Eve published. Other LACL branches in empty cities (Walnut Park, Valinda, etc.) had nothing seasonal.
- San Diego County Parks tockify calendar: nothing new beyond existing rows.
- Isla Vista Rec & Park District: 2026 holiday lighting date TBD (queued for browser).
- Santa Maria Public Library, Guadalupe and Cuyama branches: nothing found.
- Signal Hill city calendar: **Signal Hill** found (Santa's Workshop at Signal Hill Public Library, published).
- Lynwood city calendar: December empty; Candy Cane Lane parade has an entry application only.
- Elfin Forest Recreational Reserve (Olivenhain MWD): **Elfin Forest** found (New Year's Day guided hike, published).
- parks.ca.gov park pages (Cuyamaca, Anza-Borrego, Bolsa Chica, Torrey Pines, Los Encinos): titles and dates only; details are in the JS events app (queued).
- La Habra Heights and Rolling Hills calendar URLs return 404; Bradbury home page shows no events.
- Temecula home-display map: publishes the week of Dec 7; check on the next run after that.

## 2026-11-20

New events: 11 published, 0 held, 0 duplicate, 2 rejected (Pechanga NYE x2 on promogogo, "does not look like a community event listing").
Empty cities filled: Anza, Lakeland Village, Muscoy. Empty cities: 156 → 153.
Focus categories: nye-parties 48 → 55/60; home-displays 155/250 (no change); light-shows 36 → 37/40 (Harbor Glow).
Updates: 6 confirms applied (4 with corrections), 4 photos applied, 1 cancellation held (Andaz).

Parent sources checked today:
- **SB County Library** tribe REST API (612 events, 13 pages): found Muscoy (Wee Winter Workout). Needles and Trona branches had no holiday programs.
- **Riverside County Library** LibCal (rivlib): found Anza (Turkey Trot & Tales) and Lakeland Village (Candy Cane Slime). Nothing seasonal at Cabazon, El Cerrito, French Valley, Highgrove, Mead Valley, Mecca, Valle Vista, Woodcrest, or Nuview/Nuevo.
- **LA County Library** (Charter Oak, Wiseburn): nothing seasonal.
- **Home-display listing sites** (bigredbulb, tackylighttour, holidaylightsguide): only auto-rolled or "last confirmed 2025" data, so I didn't use any. 2026 confirmation has to come from each display's own social page (they're in the browser queue).
- **NYE hospitality**: Eventbrite JSON-LD for hotels and bars in LA, OC, Ventura, and SD; venue pages for SET Newport, Surf & Sand, Crown & Anchor, Hotel del (no time), South Coast Winery (stale "2026" copy), Punch Bowl Social (stale), Boathouse on the Bay and The Ranch LB (no times), Mission Inn (no 2026 NYE).

## 2026-11-19

### Parent sources checked today
- LA County Library (LibNet eeventcaldata JSON plus JSON-LD): Nov 19-Dec 31 swept. Filled Alondra Park, Willowbrook, West Whittier-Los Nietos, Westmont, Littlerock.
- SD County Library (BiblioCommons gateway, 21 pages): filled Rancho San Diego.
- OC Public Libraries and Riverside Public Library (LibCal): filled Laguna Woods, Foothill Ranch and Home Gardens.
- SB County Special Districts (tribe REST): filled Bloomington (Ayala Park).
- Desert Recreation District (ActiveNet): 4 events found, all in non-empty cities; queued as leads to confirm.
- SD County Parks (tockify): 7 published, filling Potrero, Spring Valley and Santa Ysabel.
- State Parks First Day Hikes (parks.ca.gov): JS-only pages, queued for the browser.
- Temecula Valley Winegrowers events: the NYE events already on the map.
- runsignup: published 2 New Year's Day runs and 1 Turkey Trot.
- Chabad sites (menorah): Orange published; North Park and Crescenta Valley queued.
- Church and school-district calendars: Piru parade found only on the Fillmore HS calendar (queued).

### Not yet tried or unusable from the server
- Ventura County Library (JS calendar)
- Imperial Valley parks (JS)
- piru-ca.org
- OC Parks events (parks.oc.gov/events has no event links in its HTML; JS)
- LA County Parks (parks.lacounty.gov, non-200)

### Focus today
polar-dips and lunar, plus NYE share.

## Coverage update — 2026-11-18 (Grok sweep)

Empty cities: 183 at start → 171 after (work order re-fetch, 2026-11-18).
First events added in: Highland, Thousand Palms, Morongo Valley, Lake Los Angeles, Acton, South Whittier, Florence-Graham, View Park-Windsor Hills, San Diego Country Estates, East Rancho Dominguez, Cudahy, Lennox.

Thin categories (start → after): concerts-choirs 37→42 /60 (focus); home-displays 155→155 /250 (focus, none found with 2026 dates + public addresses);
thanksgiving 25→30+ /30 (no longer LOW); santa 77→80+ /80 (no longer LOW); nye-parties 41→48 /60; nye-fireworks 12→13 /15;
ballet-theater 37→39 /40; trains 13→14 /15; light-shows 36, menorah 21, posada-kwanzaa 10, lunar 21, polar-dips 4 unchanged.

Parent sources checked today:
- LA County Library events feed (visit.lacountylibrary.org eeventcaldata JSON + event-page JSON-LD for addresses) — 8 empty-city firsts.
- Hotel/resort holiday pages (Catamaran, Bahia, Langham Huntington, Indian Wells Resort, San Vicente Resort) for Thanksgiving.
- Church event calendars (Calvary Chapel North Long Beach, Calvary Chapel Echo Park, Chatsworth Foursquare) for Thanksgiving dinners.
- College/chorus sites (Westmont, APU, Biola, GMCLA, PSGMC) for concerts.
- City sites: paramountcity.gov, cityoflapalma.org, Riviera Village, visitdelmarvillage, cardiff101.com.
- Other county library LibNet hosts (OC, Riverside, SB, SD, Ventura) do not exist (302); try their own calendars (LibCal for Riverside) next.

Suggested watchlist additions: Westmont music calendar; Plaza Theatre Palm Springs; Victoria Gardens events; Riviera Village; visitdelmarvillage.com; cardiff101.com events; paramountcity.gov events.

Browser pass (same day, after the run): +13 events. Concerts-choirs +7 (Redlands x2, Laguna Beach, Temecula, Oceanside, Costa Mesa, Escondido); posada +1 (Santa Fe Springs); menorah +1 (Carlsbad); thanksgiving +1 (Catamaran, San Diego); santa +1 (Cardiff Kringle Mingle); light displays +2 (Pine Valley Camp Christmas, Palmdale Sparkle on the Square). Pine Valley was an empty city; it now has its first event.

## Coverage update — 2026-11-17 (Grok sweep)

Empty cities: 195 at start → 186 after (work order re-fetch, 2026-11-17).

First events added in: Maywood, East Los Angeles, Rowland Heights, Oak Glen, La Crescenta (separate key "La Crescenta-Montrose" still empty), Port Hueneme, Azusa, Pepperdine University, Big Bear City.

Thin categories (start → after):

- posada-kwanzaa 6→9 /12
- polar-dips 3→4 /8
- nye-parties 36→41 /60
- nye-fireworks 11→12 /15
- menorah 20→21 /25
- santa 74→75 /80
- thanksgiving 24→25 /30
- concerts-choirs 35→37 /60
- ballet-theater 35→37 /40
- home-displays 155→155 /250 (none added)
- lunar 21, light-shows 36, trains 13 unchanged

Parent sources checked today:

- LA County Library events feed (visit.lacountylibrary.org eeventcaldata JSON) — good for unincorporated LA communities (East LA, La Crescenta, Lomita, Rowland Heights).
- enjoyorangecounty.com 2026 OC holiday guide (?p=658) — used for 13 OC confirmations.
- seecalifornia.com Christmas tree ceremonies pages (Azusa, Big Bear City, SE LA).
- yoursocal winter-holidays / new-years-eve lists.
- parks.ca.gov First Day Hikes (still the 2026 page; 2027 list not up yet).
- riversideca.events (City of Riverside calendar) — Breakfast with Santa x4 already on map.
- City sites: ci.port-hueneme.ca.us, arts.pepperdine.edu, bowers.org, lasfotosproject.org.

Not yet tried: Riverside County Library (LibCal), San Diego County Library calendar (Casa de Oro branch had only a "Santa Stories" storytime).

Suggested watchlist additions: visit.lacountylibrary.org feed; Los Rios Rancho (Oak Glen); Lake Arrowhead Resort; Zachari Dunes (Oxnard); Bowers Museum festivals; Pepperdine arts calendar; seecalifornia tree-ceremony index.
