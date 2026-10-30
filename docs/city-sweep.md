# One-group city sweep (instructions for each sweep run)

Each sweep run covers **one** group from [coverage-cities.md](coverage-cities.md) with full attention.
(The web-search allowance is shared by everything in one run, so a run should never try to cover
more than one group — that's what made earlier sweeps skim past small cities.)

## Seasons to cover
Read `public/seasons.js`. Cover the **current season** (events still upcoming) and the **next season**
if it starts within 6 weeks. Use only the allowed `types` for each season.

## How to search (Pomona-level scrutiny)
Go through **every city in the group, one by one**. For each city check:
- its parks & recreation / community services **events calendar** — search e.g. "<city> Halloween 2026",
  "<city> trunk or treat", "<city> tree lighting", "<city> holiday parade", "<city> turkey trot", "<city> Thanksgiving community dinner", "<city> Día de los Muertos",
  "<city> 4th of July fireworks", "<city> egg hunt", "<city> events calendar" (whichever fit the seasons)
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
