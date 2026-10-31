# Browser pass: read the city calendars that block our bot

For a **local desktop session with Claude in Chrome connected** (not a cloud session). The owner approved this on 2026-10-31: the pages are public, and the owner's own Chrome opens them like any visitor. Do not use scripts, proxies or a changed User-Agent; just browse in Chrome.

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

For each city read the calendar month by month, open every holiday, Halloween, Thanksgiving, tree lighting, parade, Santa, lights, Día de los Muertos, turkey trot and New Year event, and note title, date, time, venue, street address, cost, and the page URL. Also check each city's decorating-contest or home-lights page for published home addresses.

## Publish
1. Put every new event in ONE migration `migrations/<next number>_browser_pass_<date>.sql` (INSERT ... ON CONFLICT(id) DO UPDATE, at most 30 rows per INSERT). Geocode each address with Nominatim and accept only a result whose house number matches; set photos only from the event's own page (hotlink if under 1.5 MB).
2. Run `npm run validate`, fix every error, review every warning.
3. Commit, open a PR to `main` and merge it. Record what you added, and which pages still would not load even in Chrome, in `docs/status.md`.
4. Update the "Blocked hosts" table in `docs/blocked-sites.md`.
