# Browser pass: read the city calendars that block our bot

Runs in a Claude session that is **linked to the owner's computer (Claude desktop app) with Claude in Chrome connected**. That can be a cloud session with this repo attached: on 2026-10-30 one such session did the whole pass (Chrome, git, npm and the PR). It cannot run as an unattended scheduled routine, because those have no Chrome. See `docs/workstation-setup.md`. The owner approved this on 2026-10-31: the pages are public, and the owner's own Chrome opens them like any visitor. Do not use scripts, proxies or a changed User-Agent on the city sites; just browse in Chrome. If Chrome refuses a site (permission not granted, or a redirect to another domain), stop on that site, list it, and ask the owner; do not work around it.

## Where it runs and when
- **When:** every **Tuesday and Friday at 10:23 AM Pacific** (the scheduled task "[SCL] Browser pass (Chrome, needs work computer)").
- **On what:** the **owner's work computer**, the one linked to the Claude desktop app. It must be **awake** at that time, with the **Claude desktop app open and signed in**, and **Chrome open with the Claude extension signed in to the same Claude account and organization**. The pass reads pages through that Chrome, so it sees them the way you do.
- **If the computer or Chrome is not reachable**, the run stops at once ("Claude in Chrome is not connected"), reads nothing, publishes nothing and sends the owner a notification. **That is what happened on Friday 2026-11-13**: no browser was connected, so nothing was read. The next scheduled run after that is Tuesday 2026-11-17 at 10:23 AM Pacific.
- **To run it now** (computer on, Chrome open, extension signed in): ask in a Claude Code session to run the browser pass now; the scheduled task can be fired on demand.
- A laptop that sleeps or a closed lid at 10:23 is the usual reason it does not run. A reminder that the owner can act on: leave the computer on and Chrome open on Tuesday and Friday mornings.

## Start
1. Open this repo (`socal-lights-app`). Read `docs/sweep-methods.md` (inclusion rule: date + time + place + seasonal title is enough; blurb restates the listing only; price "Not listed" when blank; 30-row INSERT limit), `docs/updating-events.md` and `public/seasons.js` (types per season).
2. In Chrome (new tabs), allow each site when asked. Close the tabs you opened when done.
3. Fetch `https://socallights.app/api/events` first so you skip events already on the map (match by address and season).

## Pages to read (Nov 2026 through Jan 2027; also Halloween leftovers through Nov 2)
| City | Open these |
|---|---|
| Whittier | https://www.cityofwhittier.org/ (Calendar, Special Events), https://www.whittierprcs.org/ (Calendar month view, then each holiday event), https://www.whittierprcs.org/recreation/holidays-in-whittier |
| Hawthorne | https://www.cityofhawthorne.org/ (Events, Parks & Rec) |
| Santa Monica | https://www.santamonica.com/events/ and https://www.smgov.net/ events |
| West Hollywood | https://www.weho.org/ (Events, Arts and Culture calendar) |
| Culver City | https://www.culvercity.gov/ (Events calendar) |
| Inglewood | https://www.cityofinglewood.org/ (Calendar, Parks & Rec) |
| Carlsbad | https://www.carlsbadca.gov/ (Calendar, Village events) |
| Chula Vista | https://www.chulavistaca.gov/ (Calendar, Holiday events) |
| Eastvale | https://www.eastvaleca.gov/ (Calendar, Special events) |
| Perris | https://www.cityofperris.org/ (Calendar) |
| LA County Parks | https://parks.lacounty.gov/ (Events, Trick or Treat Village, Harvest Festival, holiday events) |
| La Habra | the City of La Habra website (Events, Community Services) |
| Others on `docs/blocked-sites.md` | any host listed there as blocked |
| Watchlist venues marked blocked | run `node scripts/coverage-gaps.mjs --blocked` for the list (hotels, malls, gardens, tourism boards and other recurring venues whose site turned the bot away with a 403: SeaWorld, Irvine Spectrum, Visit Newport Beach, Visit San Diego, Visit Santa Barbara and others). Open each one's own holiday or events page in Chrome, and read the tourism boards' seasonal guides: they name hotels, rinks, light shows and markets the city calendars never list. Add the events by the usual rules, and set the photo and the video (the player embedded on the page, `docs/sweep-methods.md` 5.2) as for the city pages. |

For each city read the calendar month by month, open every holiday, Halloween, Thanksgiving, tree lighting, parade, Santa, lights, Día de los Muertos, turkey trot and New Year event, and note title, date, time, venue, street address, cost, and the page URL. Also check each city's decorating-contest or home-lights page for published home addresses.

## Why this is the route for blocked pages
The unattended runs never get past a bot challenge, a 403 or a spoofed identity (`docs/blocked-sites.md`); this pass reads the same public pages the way any visitor does, in the owner's own Chrome, with no tricks, so everything a person can see on a public page ends up on the map. Tell the owner which pages still would not open.

## Photos (owner, 2026-11-11: yes, grab the photos from the pages Chrome can read)
Many of these city pages refuse our bot, so events listed from them often have no photo. For every event on a page you load in Chrome, **both the events you add and the events already on the map whose `img` is empty** (include `img` in the slim fields you read from `/api/events`):
1. Take the event's own picture from the page: the photo in the event's own block or gallery, else the page's `og:image` (from the meta tags or the DOM).
2. In Chrome, check the image really loads (natural width 500 px or more) and **look at it** (screenshot or open it in a new tab). It must show the event or its place. Reject a logo, banner, ad, map, ticket graphic or site-wide default picture, a roundup page's single picture, and a picture that would sit on more than 3 events. A city or government event may use its city logo or seal only if nothing better exists.
3. Use the image address as is (hotlink; do not download or re-host from the cloud shell). Add the guarded `UPDATE events SET image='...', updated_at=datetime('now') WHERE id='...' AND (image IS NULL OR image='');` to the same migration. Never use an address containing `--` (split it with `'...-' || '-...'`).
4. If the page has no usable picture, look for the same event on the owner's other official site (`docs/sweep-methods.md` section 5.1), official sources only.
5. List the events you could not give a photo in the report, with their page addresses. Same safety rule as everything here: if Chrome is refused, do not work around it.

## Publish
1. Put every new event in ONE migration `migrations/<next number>_browser_pass_<date>.sql` (INSERT ... ON CONFLICT(id) DO UPDATE, at most 30 rows per INSERT). Geocode each address with Nominatim and accept only a result whose house number matches; set photos only from the event's own page (hotlink if under 1.5 MB).
2. Run `npm run validate`, fix every error, review every warning.
3. Commit, open a PR to `main` and merge it. Record what you added, and which pages still would not load even in Chrome, in `docs/status.md`.
4. Update the "Blocked hosts" table in `docs/blocked-sites.md`.

## Lessons from the 2026-10-30 run
- The cloud shell cannot reach `socallights.app` or Nominatim (curl returns nothing). Do both from Chrome instead: open `https://socallights.app/` and run `fetch('/api/events')` in the page (fields: `id, n, city, t, s, e, st, a, v, lat, lng, h, p, free, sn`); open `https://nominatim.openstreetmap.org/ui/search.html` and run the geocoding `fetch` calls there, at most one per 1.3 seconds. The browser tool blocks output that contains URLs, so return slim fields without `u` or `img`.
- Dedupe first. Most of this season's big events were already on the map (WeHo Carnaval, Leo Carrillo Dia, Woodlawn Dia, Starlight Parade as expected). Confirm those with a plain `UPDATE ... SET status='confirmed', hours=...` instead of re-adding them.
- Calendar URL patterns: Granicus sites take `/-curm-12/-cury-2026` appended to the calendar page (Whittier PRCS, Hawthorne, Chula Vista); Inglewood: `/calendar.aspx?view=list&year=2026&month=11`; santamonica.com: `/events/?mySearch=holiday&page-num=1` and `/event/<slug>/`.
- A "Full Calendar" button can leave the city's domain (Eastvale goes to calendarwiz.com). Chrome asks for permission per site; if it was not granted, ask the owner to allow it.
- Do not click cookie banners ("Got it"): accepting is not part of this task.
