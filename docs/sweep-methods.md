# Sweep methods (read this in every sweep and upkeep run)

Lessons from the 2026-10-30 contest-homes work. Every scheduled run follows these.

## 1. Home decorating contests and displays (Halloween, Christmas, holiday)
See [city-sweep.md](city-sweep.md) and [contest-leads.md](contest-leads.md). Add **every** entrant, finalist, winner and honorable mention whose street address a public page publishes, not just the top winners. One event per home: Christmas type `drive`; Halloween `haunt` (scary) or `family`. Contest pages often hold the list in a **PDF or a PNG map** (open the PDF with `pdftotext`; if it has no text layer render it with `pdftoppm -png` and read the image) or in an ArcGIS/Story Map layer (read its JSON).

## 2. Public-web and social sources (no logins)
Search the open web for posts and pages that publish addresses: public Facebook pages and events, Instagram/TikTok/YouTube posts visible without login, Reddit, Nextdoor public posts, city/HOA/chamber/PTA posts reproduced by local news, Patch, mommypoppins, SceneOC, enjoyorangecounty (home-haunts guide), SoCal Haunt List (socalhauntlist.com), Haunted Attraction Network, Axios, sandiegomamas, Macaroni Kid and Google Maps lists. **Never log in, bypass a login wall or use unofficial scrapers**; note the blocked platform and move on. Include a home only when the page itself gives the street address and invites visitors, judging or tours.

**Inclusion rule (owner, 2026-10-31):** if a public listing gives a date, a time and a location, and its title fits the season, add it, even when the listing has no description. Use a plain blurb that says only what the listing says (never invent details or prices; set free=0 and price "Not listed" when the cost is blank). County library feeds that work: `rivlib.libcal.com` (`/ajax/calendar/list?c=-1&date=YYYY-MM-DD&daily=true&perpage=200&page=1&inc=0`, header `X-Requested-With: XMLHttpRequest`) and `library.sbcounty.gov/wp-json/tribe/events/v1/events?per_page=50&start_date=…&end_date=…&search=holiday`.

## 3. Geocoding rule
Geocode with Nominatim (`format=jsonv2&addressdetails=1`, 1 request/second, User-Agent header) and **accept only a result whose `house_number` equals the address number**; otherwise drop the home and list it as a lead. Take the ZIP from the result. Murrieta-style city GIS layers are even better.

## 4. Dedupe and match
Before adding, normalize street addresses (lowercase, `Drive`->`dr`, `Street`->`st`, strip punctuation) and compare with `https://socallights.app/api/events` **by address and season**. If the home is already on the map, do not add it: update the existing event (extra source, dates, hours) instead.

## 5. Photos
- For every event you add or touch, try to set `image`. Sources, in order: the event/contest page's own gallery photo for that home (for example the winners galleries on mvactivities.com, files are named with the street address), then the page's `og:image`.
- Use the image URL as is (hotlink, do not re-host). Accept it when it is a real image under 1.5 MB, at least 500 px wide, not a logo or site-wide default, and the page belongs to at most 3 events (a roundup page would put one photo on many events). Do not use an image URL containing `--` (split it with `'…-' || '-…'`).
- Set it with `UPDATE events SET image='…', updated_at=datetime('now') WHERE id='…' AND (image IS NULL OR image='');`.
- Do not copy photos out of people's private or logged-in social posts.

## 6. Pin audit
For every event you add or touch, confirm the pin is on the address: geocode the address and compare with `lat/lng`; if they are more than about 300 m apart, fix the coordinates (a pin on a city center or a neighbouring place is a bug; Rey found "Santa's Arrival" 1.4 km off City Hall). The weekly upkeep also audits the map in batches.

## 7. Migration size limit (important)
Cloudflare D1 rejects a statement over about 100 KB (`SQLITE_TOOBIG`), and a failed migration blocks every later migration. **Never put more than 30 rows in one `INSERT … VALUES`**; write several INSERT statements in the same file. Many `UPDATE` statements are fine.

## 8. Report
List contests found, homes added/matched, photos set, pins fixed, and the pages that were blocked or had no addresses.
