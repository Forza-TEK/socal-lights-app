# Sweep methods (read this in every sweep and upkeep run)

Lessons from the 2026-10-30 contest-homes work. Every scheduled run follows these.

## 1. Home decorating contests and displays (Halloween, Christmas, holiday)
See [city-sweep.md](city-sweep.md) and [contest-leads.md](contest-leads.md). Add **every** entrant, finalist, winner and honorable mention whose street address a public page publishes, not just the top winners. One event per home: Christmas type `drive`; Halloween `haunt` (scary) or `family`. Contest pages often hold the list in a **PDF or a PNG map** (open the PDF with `pdftotext`; if it has no text layer render it with `pdftoppm -png` and read the image) or in an ArcGIS/Story Map layer (read its JSON).

## 2. Public-web and social sources (no logins)
Search the open web for posts and pages that publish addresses: public Facebook pages and events, Instagram/TikTok/YouTube posts visible without login, Reddit, Nextdoor public posts, city/HOA/chamber/PTA posts reproduced by local news, Patch, mommypoppins, SceneOC, enjoyorangecounty (home-haunts guide), SoCal Haunt List (socalhauntlist.com), Haunted Attraction Network, Axios, sandiegomamas, Macaroni Kid and Google Maps lists. **Never log in, bypass a login wall or use unofficial scrapers**; note the blocked platform and move on. Include a home only when the page itself gives the street address and invites visitors, judging or tours.

**Inclusion rule (owner, 2026-10-31):** if a public listing gives a date, a time and a location, and its title fits the season, add it, even when the listing has no description. Use a plain blurb that says only what the listing says (never invent details or prices; set free=0 and price "Not listed" when the cost is blank). County library feeds that work: `rivlib.libcal.com` (`/ajax/calendar/list?c=-1&date=YYYY-MM-DD&daily=true&perpage=200&page=1&inc=0`, header `X-Requested-With: XMLHttpRequest`) and `library.sbcounty.gov/wp-json/tribe/events/v1/events?per_page=50&start_date=…&end_date=…&search=holiday`.

**Blocked pages (403):** do not retry, spoof a browser or use a proxy. Look the host up in [blocked-sites.md](blocked-sites.md), use its alternate routes (partner pages, search snippets, last year's pattern as `expected`), add any new blocked host to that table, and list it in your report.

## 3. Geocoding rule
Geocode with Nominatim (`format=jsonv2&addressdetails=1`, 1 request/second, User-Agent header) and **accept only a result whose `house_number` equals the address number**; otherwise drop the home and list it as a lead. Take the ZIP from the result. Murrieta-style city GIS layers are even better.

## 4. Dedupe and match
Before adding, normalize street addresses (lowercase, `Drive`->`dr`, `Street`->`st`, strip punctuation) and compare with `https://socallights.app/api/events` **by address and season**. If the home is already on the map, do not add it: update the existing event (extra source, dates, hours) instead.

## 5. Photos
- For every event you add or touch, try to set `image`. Sources, in order: the event/contest page's own gallery photo for that home (for example the winners galleries on mvactivities.com, files are named with the street address), then the page's `og:image`.
- **Prefer the event's own photo over `og:image`.** Many sites set `og:image` to one site-wide picture for every page (SAMLARC's is a movie-night photo on its tree-lighting page). If the page has a photo whose file name shares words with the event's name, or sits in an Event or Gallery folder, use that. `scripts/photo_pass.py` does this. To audit existing photos, open the card, compare it with the event page, and remove or replace a photo that is a logo, a newsletter cover, blank, a 404 or of another event (see migration 0206 for an example).
- Use the image URL as is (hotlink, do not re-host). Accept it when it is a real image under 1.5 MB, at least 500 px wide, not a logo or site-wide default, and the page belongs to at most 3 events (a roundup page would put one photo on many events). Do not use an image URL containing `--` (split it with `'…-' || '-…'`).
- Set it with `UPDATE events SET image='…', updated_at=datetime('now') WHERE id='…' AND (image IS NULL OR image='');`.
- **Tall (portrait) photos are fine.** The width/height limit is 0.55 to 2.8 (it was 0.8 and skipped the Diamond Bar Windmill Lighting photo, 1733x2600): the card crops to the middle, so check on the card that the lit part still shows.
- **Photo rule (owner, 2026-11-11, audit DAT-01):** a CITY or government event (organizer, source or venue like "City of", "Parks and Recreation", a .gov domain) may keep its city logo or seal. For every other event, reject a logo, badge, banner, newsletter cover, screenshot, advertisement or unrelated picture, and a blurry or low-resolution one (under 500 px wide); leave `image` empty so the card shows the stock photo. The validator warns or errors on suspicious file names (`photo`); run `node scripts/audit-event-photos.mjs --sample 40` in the weekly upkeep, look at the pictures, clear the wrong ones in a migration, and report the miss rate (6 of 40 on 2026-11-11, before the clean-up of migration 0224).
- Do not copy photos out of people's private or logged-in social posts.

### 5.1 The event's own page blocks us, or has no usable photo: find the same event on the owner's other official site
Added 2026-11-11 (owner). Irvine Spectrum Nightly Tree Lighting had all its details and no photo for weeks: its page (irvinespectrumcenter.com) answers the bot with 403, so the photo step gave up and nothing flagged it. The Irvine Company, which owns the center, lists the same event on holiday.irvinecompanyretail.com with the right photo, and a normal web search found it. Every run does this before leaving an event on the stock photo:
1. **Do not bypass the block.** No spoofed browser or crawler identity, no retry under another identity, no proxy, no login (see docs/blocked-sites.md). A page that answers 401/403/429 or a bot challenge is simply not used.
2. **Search for the event** (public web search, event name plus venue or city). Look for the SAME event on a page of the SAME organizer or owner: a parent company's event or holiday site, the city or county's official events page, the venue's own second site, the official tourism board. Search results often show these pages even when the main one blocks us.
3. **Take the photo from that page** by the usual rules in section 5 (the page's own photo or `og:image`, a real image, 500 px or wider, under 1.5 MB, not a logo or ad, page tied to at most 3 events). **Open the image and look at it:** it must show the event or its place (for the Spectrum example: the lit tree and the Giant Wheel). Reject a stock image, a different event's picture, a map, a ticket graphic.
4. **Only official sources of the organizer or owner.** Not a news site, blog, review site or someone's social post (copyright), and not a different event of the same venue. If the only candidates are those, leave `image` empty (the stock photo stays) and put the event in the report under "needs a photo from the owner".
5. Set it with the same guarded UPDATE as above. The card credits the event's own site and links to its page, so the credit stays right when the image comes from the owner's sister site. Say in the migration comment which page the photo came from and why.
6. `scripts/photo_pass.py` writes `<out>-needs-photo.tsv` (id, name, page, reason) next to its SQL: that is the list to work through with steps 2 to 5. Anything you cannot resolve goes in the report with its page address so the owner can paste the picture address from a normal browser.

## 5.2 Videos
Added 2026-11-15 (owner): an event can carry one video (`events.video`, a YouTube or Vimeo link stored in the clean form `https://www.youtube.com/watch?v=ID` / `https://vimeo.com/ID`). The card shows a "Watch the video" button and loads the player only when tapped (youtube-nocookie.com / player.vimeo.com), so opening a card contacts neither site.
- Take a video only from a player **embedded on the event's own page** (an `<iframe>` of YouTube or Vimeo) or the organizer's own official channel linked from it. Not from search results, other people's uploads or social posts. A site-wide promo video that appears on every page of a site is not the event's video: leave it.
- `python3 scripts/video_pass.py --out /tmp/videos.sql` reads the events' pages (honest bot name, never retried under another identity, blocked pages are skipped and counted) and writes `UPDATE events SET video='…' WHERE id='…' AND (video IS NULL OR video='');` lines. **Read the list before you publish it** (a page with one video for every event is a brand video; open one or two). Put the kept lines in a migration.
- A page that blocks the bot (401/403/429 or a challenge) is never bypassed: the video link comes from the organizer (Your events > Edit > Video) or Admin > Events > Edit, or the owner pastes it from a normal browser.
- Organizers and Admin can set or remove it in the edit forms; a link that is not YouTube or Vimeo is refused.

## 5.3 How our bot behaves (every fetch, every run)
Added 2026-11-15 with the Cloudflare verified-bot application (`docs/verified-bot.md`); Cloudflare's rules for a verified bot are the rules for every fetch we make:
- One honest identity: `Mozilla/5.0 (compatible; SoCalLightsBot/1.0; +https://socallights.app/bot)`. No browser or crawler disguise, ever.
- Read the host's `robots.txt` first and do not fetch a path it disallows for `SoCalLightsBot` (our scripts and the server do this by themselves; when you fetch by hand, look).
- Gentle: at most about one request a second to a host, a few pages per site per run, short timeouts.
- No retry after a 403, a 429 or a challenge page, and no attempt to get past one. The one exception, only after Cloudflare has verified the bot: a single read through `node scripts/signed-fetch.mjs <url>`, which signs the same identity.
- Pages that still refuse go to the browser pass in the owner's own Chrome (`docs/browser-pass.md`) or to a request to the site for a feed or an allow (`docs/blocked-sites.md`).

## 6. Pin audit
For every event you add or touch, confirm the pin is on the address: geocode the address and compare with `lat/lng`; if they are more than about 300 m apart, fix the coordinates (a pin on a city center or a neighbouring place is a bug; Rey found "Santa's Arrival" 1.4 km off City Hall). The weekly upkeep also audits the map in batches.

## 7. Migration size limit (important)
Cloudflare D1 rejects a statement over about 100 KB (`SQLITE_TOOBIG`), and a failed migration blocks every later migration. **Never put more than 30 rows in one `INSERT … VALUES`**; write several INSERT statements in the same file. Many `UPDATE` statements are fine.

## 8. Per-city search pass (every city in the group, in addition to everything above)
Search the open web for each city one at a time, using the web search tool (never scrape google.com result pages; the search tool is the sanctioned way to run Google-style searches). For each city, run these queries with the city, its county and the year, and read the result snippets and any page that loads:
- `"<city> CA holiday events 2026"`, `"<city> tree lighting 2026"`, `"<city> Christmas parade 2026"`, `"<city> Christmas lights homes address"`, `"<city> decorating contest 2026"`
- Before Nov 2: `"<city> trunk or treat 2026"`, `"<city> Halloween events 2026"`, `"<city> Dia de los Muertos 2026"`
- From mid-November: `"<city> New Year's Eve 2026"`, `"<city> Santa 2026"`, `"<city> menorah lighting OR Kwanzaa OR posada 2026"`
- Venue and organizer angle: `"<city> chamber of commerce events"`, `"<city> library OR parks and recreation events December 2026"`, `"<city> Patch OR local news holiday events"`
Budget about 6–10 searches per city (the web search allowance is shared within a run); put the most likely queries first and stop for a city once its results repeat. Accept a result only when it gives a date, a time and a place for 2026 (see the inclusion rule above); treat last year's pages as `expected` patterns only. Log each city's queries that found something and each city where nothing turned up, so the next run can try different words.

## Cancellations and postponements (every sweep)
While checking each event's source page, also look for the words cancelled, canceled, postponed, rescheduled or "no longer taking place".
- Source says cancelled or postponed and the event has no tag: add `UPDATE events SET notice='cancelled'` (or `'postponed'`) in the sweep's migration (see `docs/updating-events.md`, rule 3).
- Source shows a new date for a postponed event: update the dates and set `notice=''` in the same file.
- Source says the event is back on: set `notice=''`.
- An event whose organizer tagged it themselves (from their profile) is checked the same way; the organizer's tag is never cleared unless the source clearly shows the event is on.
- Mention every cancellation or reinstatement in the sweep report.

## 9. Report
List contests found, homes added/matched, photos set, pins fixed, and the pages that were blocked or had no addresses.
