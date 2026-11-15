# One-group city sweep (instructions for each sweep run)

Each sweep run covers **one** group from [coverage-cities.md](coverage-cities.md) with full attention.
(The web-search allowance is shared by everything in one run, so a run should never try to cover
more than one group — that's what made earlier sweeps skim past small cities.)

## Seasons to cover
Read `public/seasons.js`. Cover the **current season** (events still upcoming) and the **next season**
if it starts within 6 weeks. Use only the allowed `types` for each season.

### Valentine's Day (season `valentines`, window Feb 1-15)
Start looking about six weeks ahead (from about Dec 21); most listings appear in January. Add **dated, ticketed or scheduled public events**, never a restaurant's ordinary menu or a generic "Valentine's special" with no event time. Types (see `public/seasons.js`): `romance` (dinner cruises, prix-fixe dinners hosted as an event, candlelight dinners, couples' classes and date-night events), `dance` (sweetheart, father-daughter and mother-son dances, singles and Galentine's parties), `sweets` (chocolate walks, wine and chocolate tastings, bake and candy events), `run` (Cupid runs, sweetheart 5K and 10K), `lights` (heart and love light displays, light shows and illuminated gardens), `show` (Valentine's concerts, comedy, theater, movies in the park), `family` (kids' crafts, library and rec-center Valentine events, zoo and museum Valentine days). Valentine events that fall on Feb 12-14 are the priority. Lunar New Year events stay in `newyear`; Presidents' Day weekend flower and winter festivals stay in their own season. Estimate dates from last year (status `expected`, hours ending in "check site") only for annual events the organizer has run before.

## How to search (Pomona-level scrutiny)
Go through **every city in the group, one by one**. For each city check:
- its parks & recreation / community services **events calendar** — search e.g. "<city> Halloween 2026",
  "<city> trunk or treat", "<city> tree lighting", "<city> holiday parade", "<city> turkey trot", "<city> Thanksgiving community dinner", "<city> Día de los Muertos",
  "<city> 4th of July fireworks", "<city> egg hunt", "<city> Valentine's Day event", "<city> sweetheart dance", "<city> Galentine's", "<city> Cupid run", "<city> events calendar" (whichever fit the seasons)
- the downtown / village association and chamber of commerce
- **public library event calendars** (the city's library and its county/regional system: LibCal, LibNet, Beanstack, Communico, `<city>library.org`, `lacountylibrary.org`, `ocpl.org`, `sblibrary.org`, etc.). Libraries host Halloween shows, trick-or-treats, magic/juggling/puppet shows, Día de los Muertos events, holiday concerts and tree lightings. A one-off family show at a library branch counts; only skip routine story times and craft clubs.
- **park, event-center and Friends-of-the-Library calendars** (for example a city park's own `events` page, theaters at libraries and community centers, and ticket pages like fotcl.org). Many events appear on only one of these and never on roundup sites.
- shopping centers and malls in that city, community centers
- local farms, zoos, museums, theaters, colleges; master-planned community events open to the public
- notable home displays/home haunts that publish their address for the public
- local news and family sites (Patch, local papers, mommypoppins, macaronikid, enjoyorangecounty,
  lajollamom, Time Out, LAist, Visit [city])

Verify each event's current-year dates on a page you actually loaded. For an annual event whose new dates
aren't posted yet, add it with status `expected`, dates estimated from last year, and hours ending in
"check site". Never invent events, dates, prices, addresses or URLs. Skip private/members-only events,
routine library story times and craft clubs, and anything ending before today. Skip events already on the map
(`https://socallights.app/api/events`).

## Home decorating contests (every sweep, every city)
Homes entered in decorating contests are the most-requested thing people look for, so each city gets a dedicated pass for them (Halloween, Thanksgiving/Christmas and other holiday seasons):
- search "<city> Christmas lights contest 2026", "<city> holiday decorating contest", "<city> best decorated house", "<city> Halloween decorating contest", "<city> home decorating contest winners", "<city> lighting contest", "<city> Christmas lights tour map"
- check the sources that run them: city parks & recreation and city council pages, HOA and master-planned community newsletters, chambers of commerce, Rotary/Lions/Kiwanis, local newspapers and Patch, local radio stations, school/PTA fundraisers, neighborhood Facebook/Nextdoor posts that are public, and tours such as "Christmas Tree Lane", "Candy Cane Lane", "Santa's Wonderland" streets
- contest pages usually publish a **list or map of entered or winning homes with street addresses**, plus the judging night or tour dates. Every home with a publicly published street address is a candidate entry
- add each such home (or each street, when the contest only names the street) as its own event: Christmas season type `drive` (Drive-by / neighborhood); Halloween season type `haunt` for home haunts or `family` for open-house trick-or-treat streets. `venue` = "<name or family surname> display" or the street name; `address` = the published street address (or the street with the cross street); `url` = the contest page that lists it; blurb says it is a contest entry/winner. Name the contest and year in the blurb or name
- dates: the contest's judging or display period; if the entries list is published but dates are not, use status `expected` and the season window with hours ending in "check site"
- **never publish a private home's address unless a public page published it for visitors or judging.** Skip contests that say addresses are private. If a contest only publishes a ballot or photo gallery with no addresses, report it as a lead and skip it
- **Christmas/holiday contests are part of every Nov-Dec run**: also re-check the dated list in [contest-leads.md](contest-leads.md) (entries and winner maps appear in December after judging) and add newly published homes
- report in the final message which cities had contests, how many homes were added per contest, and the contest pages that had no addresses

## Venue pass: wineries, breweries, taprooms, distilleries (every sweep, every city)
Added 2026-11-14 (owner approved). Every city sweep also checks these venue types for the cities of its group, in every season it covers (holiday lights, tree lightings, Santa visits, holiday markets hosted at the venue, ugly-sweater and Christmas movie nights, igloo dining, ice rinks, Thanksgiving and New Year's Eve parties, Halloween events while they apply, nativity).
- Search per city (or per wine region for rural groups: Temecula, Ramona, Santa Ynez Valley, Agua Dulce, Cucamonga, Julian): `"<city> winery holiday"`, `"<city> brewery tree lighting"`, `"<city> brewery Christmas"`, `"<city> taproom holiday market"`, `"<city> distillery holiday"`, `"<city> winery New Year's Eve"`, and in season `"<city> brewery Halloween"`.
- Read the venue's own events page and the regional association calendar: Temecula Valley Winegrowers (`temeculawines.org/events`, each event has its own page), Ramona Valley Vineyard Association, Santa Ynez Valley and Los Olivos tasting-room pages, brewery sites (Stone, Beachwood, Firestone Walker, Pocock, Pure Project and local taprooms). Facebook event pages only when public; Eventbrite pages that load.
- Add only dated public events with a seasonal angle. Skip ordinary happy hours, trivia, live-music nights, wine-club pickups, private or members-only events, and promotions with no event time. Market, class and party events count when they are explicitly holiday-themed.
- Types are the season's existing types (`tree` for tree lightings and holiday markets, `walk` for lit walk-throughs, `show` for movie nights and parties, `nye` for New Year's Eve). Do not invent a type.
- Dedupe against `/api/events` by venue and date (a winery's tree lighting is often already on the map from a city roundup; update that row instead of adding a second one).
- Tock (`exploretock.com`) and some winery sites answer with a Cloudflare challenge (403): do not retry or bypass; use the regional association page, and list the host in [blocked-sites.md](blocked-sites.md).
- Report which venue cities had nothing, as for the rest of the sweep. First run: migration 0251 (`vp-` ids).

## Hotel and resort pass (every sweep, every city)
Added 2026-11-15 (owner: the Ritz-Carlton tree lightings in Dana Point and Rancho Mirage were not on the map). **Why they were missed:** the city search looks for what a city, chamber, library or news site publishes, and the venue pass looks at wineries and breweries. A hotel or resort announces its tree lighting, lights-on night, Santa brunch or market only on its own page (ritzcarlton.com, fourseasons.com, hotel sites) and in ticket listings, never on the city's calendar, and no query named a hotel.
- Search per city (or per resort area for rural groups: Palm Springs and Rancho Mirage, Santa Barbara and Montecito, Carlsbad and La Costa, Dana Point and Laguna Beach, Coronado, Pasadena, Santa Monica, Malibu, Newport Coast): `"<city> hotel tree lighting 2026"`, `"<city> resort tree lighting"`, `"<city> resort holiday lights"`, `"<city> hotel Christmas events"`, `"<city> resort Santa"`, `"<city> hotel menorah lighting"`.
- Then go by name. Check each of these for the cities of the group and read the hotel's own holiday page: Ritz-Carlton (Laguna Niguel, Rancho Mirage, Marina del Rey, Bacara, Los Angeles), Four Seasons (Beverly Hills, Westlake Village, Santa Barbara Biltmore), Montage (Laguna Beach, Beverly Hills), St. Regis Monarch Beach, Terranea, Resort at Pelican Hill, Fairmont Miramar, Langham Pasadena, Hotel del Coronado, Loews Coronado, La Costa, Omni La Costa, Rosewood Miramar, Beverly Hills Hotel, Waldorf Astoria Beverly Hills, Disneyland hotels, JW Marriott Desert Springs, Omni Rancho Las Palmas, Rancho Las Palmas, Estancia La Jolla, Scripps Inn, plus any hotel a city roundup names. Hotel chains publish `.../experiences/holidays` pages (ritzcarlton.com does; they load for the bot) and ticket listings on Eventbrite.
- What counts: a dated tree lighting or lights-on night, holiday market, Santa brunch or breakfast, gingerbread display open to the public, menorah lighting, nativity, ice rink, New Year's Eve party. Skip room packages, spa promotions, and restaurant menus with no event time. If an event is open to hotel guests only, skip it. Ticketed events are fine (set the price to "Ticketed" when the listing gives none).
- Use the season's existing types (`tree` for lightings and markets, `walk` for lit displays, `show` for parties, `nye`, `nativity`), dedupe against `/api/events` by venue and date, and give a venue plus a house-number-checked address (the hotel's street address).
- `event.marriott.com` (the Marriott ticket pages for Ritz-Carlton events) answers with a Cloudflare challenge: do not bypass it; read the hotel's own holiday page and the public Eventbrite listing instead, and list the host in [blocked-sites.md](blocked-sites.md).
- Report which hotel cities had nothing. First run: migration 0257 (`rc-` ids: Ritz-Carlton Laguna Niguel and Rancho Mirage). Known leads not added yet: Ritz-Carlton Bacara Menorah Lighting (Dec 14 in 2025; 2026 date not published yet) and the Ritz-Carlton Marina del Rey and Los Angeles holiday pages (no 2026 dates found on 2026-11-15).

## Gap report, season categories and the venue watchlist (every sweep, first thing)
Added 2026-11-15 (owner: "we need to pick up everything per season"). The sweeps used to find events city by city, so anything that never reaches a city calendar (a hotel's tree lighting, a zoo's light show, a railroad's Polar Express, a choir's Messiah) was found only by luck. Three tools fix that:

1. **The gap report and work order.** After you know your group, run `node scripts/coverage-gaps.mjs --group <N>` (it reads the public `/api/events`; add `--file events.json` to use a saved copy). It prints, for your group: each city with its upcoming-event count and the cities with none; the **watchlist venues in your cities that have no event on the map yet**; and the **thin categories** for the seasons in play with the searches to run. Do the work order first, then the rest of the sweep. `node scripts/coverage-gaps.mjs` with no group shows the whole region: each category against its working target, and the groups ranked by how little they hold.
2. **Season categories** (`scripts/coverage-categories.mjs`; `node scripts/coverage-gaps.mjs --categories` prints them with their searches and where to look). Every season is a list of kinds of events, each with a working target: Christmas has tree lightings, parades, Santa, markets, light shows, home displays, concerts and choirs, Nutcracker and Christmas Carol, trains, ice rinks and snow, gardens and zoos, theme parks, hotels and resorts, menorah lightings, Las Posadas and Kwanzaa, nativity, Dickens and historic villages, holiday bars and dining, runs, Thanksgiving, tours; the other five seasons have theirs. A category marked EMPTY, THIN or LOW gets extra searches in every city of the group (the report prints the queries; `<city>` is a city of your group, `<year>` the season's year). The targets are working estimates to steer effort, not facts: if searching shows the region really has fewer, say so in the report and the owner will lower the number.
3. **The venue watchlist** (`docs/watchlist.json`, about 165 recurring venues: theme parks, zoos and aquariums, gardens, railroads, snow resorts, malls and outlets, fairgrounds, stadiums, performing-arts and symphony venues, historic sites, hotels and resorts, churches with large public events, and tourism boards). Each entry names the sweep group that reads it. For every watchlist venue of your group's cities, **open the venue's own events or holidays page** (the `site` is only a starting point: load it, or search "<venue> holiday <year>"), add its dated public seasonal events, and update an existing row instead of adding a duplicate. A venue marked `blocked: true` turned the bot away with a 403: do not retry or bypass it; use its ticket listings, its tourism board and partners (see [blocked-sites.md](blocked-sites.md)).
   - **Tourism boards** (`kind: tourism_board`) publish a seasonal guide ("holiday guide", "things to do in December") that names hotels, rinks, light shows and markets the city calendars never list. Read the board's guide for the season and add or update what it names, then add any venue it names that is not on the watchlist.
   - **Grow the list.** When a run finds a recurring venue that is not on the watchlist (a hotel, farm, garden, rink, theater, church, brewery event hall...), add it to `docs/watchlist.json` in the same commit (fields: `id`, `name`, `kind`, `city`, `county`, `group`, `seasons`, optional `site` and `match`; `tests/coverage-gaps.test.mjs` checks the file). Never add a site address you did not load.
- **Rotation.** The thin-day groups are no longer a fixed list: they are the four groups the gap report ranks lowest by upcoming events per city (`node scripts/coverage-gaps.mjs` prints the ranking), because per resident the thinnest county is Los Angeles (about 30 Christmas-season events per million people, against 41 in San Diego, 47 in San Bernardino, 54 in Riverside, 58 in Orange, 79 in Ventura and 130 in Santa Barbara on 2026-11-14).
- **Report** the thin categories you worked on and what they came to (before and after counts if you re-run the report), the watchlist venues you read and what each gave, venues you added to the list, and venues that blocked the bot.

## When you think you are done
Re-check each city once more with the library calendar and the parks & recreation calendar specifically. If a city in the group has **no** event for the current season, say so in the report and search for it again by name ("<city> library Halloween 2026", "<city> parks and recreation events October 2026") before giving up. Cities of 50,000+ people almost always have something.

## Every event needs
id (lowercase a-z0-9 and hyphens, ≤40 chars, unique), name, county, city, season, type, start, end,
status, free, price, hours, **venue**, **address** (full street address with ZIP, or an intersection for
parades/street events), blurb (one sentence in your own words, ≤180 chars), url (the event's OWN page
when one exists), and lat/lng geocoded from the address as described in
[updating-events.md](updating-events.md) — never a city center.

## More methods
Photos, the public-web/social search, house-number geocoding, dedupe by address, the pin audit and the 30-rows-per-INSERT limit are in [sweep-methods.md](sweep-methods.md). Follow them on every run.

## Publishing
Follow [updating-events.md](updating-events.md): write one new migration file named
`migrations/<next number>_sweep_g<group>_<YYYY-MM-DD>.sql` using `INSERT … ON CONFLICT(id) DO UPDATE`.
Several sweep runs may push around the same time: if two files share a number that's fine (both apply),
and if `git push` is rejected, `git pull --rebase` and push again. Validate locally first
(`npm ci && npx wrangler d1 migrations apply socal-lights --local`).

## Report
Group and cities covered; events added by city and season; **cities where nothing was found**;
anything uncertain (especially locations you couldn't verify); whether the migration applied live
(`gh run list --workflow d1-migrations.yml --limit 3`).
