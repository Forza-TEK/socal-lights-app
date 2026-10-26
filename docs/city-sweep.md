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
- shopping centers and malls in that city, community centers, libraries
- local farms, zoos, museums, theaters, colleges; master-planned community events open to the public
- notable home displays/home haunts that publish their address for the public
- local news and family sites (Patch, local papers, mommypoppins, macaronikid, enjoyorangecounty,
  lajollamom, Time Out, LAist, Visit [city])

Verify each event's current-year dates on a page you actually loaded. For an annual event whose new dates
aren't posted yet, add it with status `expected`, dates estimated from last year, and hours ending in
"check site". Never invent events, dates, prices, addresses or URLs. Skip private/members-only events,
small library story times, and anything ending before today. Skip events already on the map
(`https://socallights.app/api/events`).

## Every event needs
id (lowercase a-z0-9 and hyphens, ≤40 chars, unique), name, county, city, season, type, start, end,
status, free, price, hours, **venue**, **address** (full street address with ZIP, or an intersection for
parades/street events), blurb (one sentence in your own words, ≤180 chars), url (the event's OWN page
when one exists), and lat/lng geocoded from the address as described in
[updating-events.md](updating-events.md) — never a city center.

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
