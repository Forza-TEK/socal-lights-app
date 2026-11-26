---
from: grok
date: 2026-11-26
status: open
---
# Grok intake 2026-11-26 — requests for Claude

## Duplicates on the map
1. **riverside-lunar-fest** (Jan 24–25, 2027) duplicates **grok-2027-15th-annual-riversi-5e1c19** (Jan 23–24, 2027 per calfestival.com). Please merge and keep the dates from the official source.
2. **g7-palmdale-sparkle-on-the-square** (expected) duplicates **grok-sparkle-on-the-square-8dc680** (confirmed). The 2026 Palmdale press release (newsflash Detail/2392) says Light Up the Square is Dec 1, 4–8pm, and the display runs nightly dusk–10pm through Jan 3.
3. **montrose-christmas-parade** (expected) duplicates **grok-48th-montrose-glendale-c-dcecc6** (Dec 5, 6:10pm). Please merge.

## Possibly not happening in 2026
4. **g15-very-merry-temecula-christmas** is no longer on temeculaca.gov/Holidays for 2026. Please review or hide it.
5. **noc-nixon-holiday-tree-showcase**: the Nixon Library has no 2026 showcase listing. Its 2026 holiday event, "A Revolutionary Christmas" (Dec 8), is already on the map.

## Update API gaps
6. The image check rejected the Balboa Bay Resort Thanksgiving photo with "link no longer exists" (assets.milestoneinternet.com cdn-cgi/image URL), but the hotel page still uses it. The check may be failing on CDN resize URLs. Low priority.

## Carried over (still open)
7. The Nov 25 follow-ups are already filed in PR #817 (`docs/handoff/to-claude/2026-11-25-intake-follow-ups.md`, still open and unmerged): key rotation note, Skid Row Thanksgiving item, Simi 5K item.
8. `docs/handoff/to-claude/2026-11-25-nye-and-pins-done.md` is still `status: open` (Semper Fitmas pin, MCCS Polar Bear Plunge).

## Watchlist / blocked-site suggestions (no repo edits made)
- CivicPlus sites that return only a "Powered and protected by Privacy" bot page to the box: laquintaca.gov, palmspringsca.gov, glendaleca.gov, manhattanbeach.gov, hermosabeach.gov, arts.torranceca.gov. Suggest a `browser_only` note.
- cityofpalmdaleca.gov drops the connection after about 3 requests. Suggest pacing it at 1 page per run, or browser only.
- montereypark.ca.gov and sdcnyfair.org: no connection from the box today.

## 6. Browser pass results (2026-11-26)

### Published via intake API (4 new events)
- **Old Town Montrose Christmas Market and Tree Lighting** (`grok-old-town-montrose-christ-27dd58`, Montrose): Fri Nov 27, 2026, 5pm–9pm (tree lighting 6:15pm), 2200 Honolulu Ave, Montrose, CA 91020, Free. Official page: https://members.montrosechamberofcommerce.org/event-calendar/details/old-town-montrose-christmas-market-and-tree-lighting-1994954 (no usable photo; flyer/logo only).
- **Dreamers Holiday Market at Bella Terra** (`grok-dreamers-holiday-market-ceda4c`, Huntington Beach): Sat Nov 28, 2026, 12pm–4pm, Bella Terra The Green, 7777 Edinger Ave, Free. Official page: https://www.bellaterra-hb.com/event/45369-dreamers-holiday-market (note: `bellaterra.com` is a parked GoDaddy domain; the live official domain is `bellaterra-hb.com`).
- **Season of Santa Holiday Market at Bella Terra** (`grok-season-of-santa-holiday-f0b1d2`, Huntington Beach): Sat Dec 19, 2026, 12pm–4pm, Bella Terra The Green, 7777 Edinger Ave, Free. Official page: https://www.bellaterra-hb.com/event/45370-season-of-santa-dreamers-holiday-market.
- **Breakfast with Santa at AVEO, Waldorf Astoria Monarch Beach** (`grok-breakfast-with-santa-at-1c27f7`, Dana Point): Dec 6, 12, 13, 19 & 20, 2026, 9am–11am, AVEO Table + Bar, 1 Monarch Beach Resort N, Dana Point, CA 92629, $75 adult / $24 child (reservations required). Official page: https://www.waldorfastoriamonarchbeach.com/dine/aveo.

### Checked in browser, held / not published (missing official hours or site down)
- **Rockin' New Year's Eve Party at The Laundry, Hotel del Coronado**: `hoteldel.com` lists Dec 31 (21+) but no time or price yet ("Tickets will be available soon").
- **San Diego Tết Festival 2027** (`sdtet.com`): confirms Feb 12–14, 2027 (not Feb 5–7 as `sandiego.org` shows), Preble Field, NTC Park, Liberty Station, Free, but hours are "2027 SCHEDULE: TBD".
- **Holiday Magic at Candy Lane** (Albert S. White Park, Riverside): `riversideca.gov/fol/` and Zeffy confirm Thu–Sun Nov 27–Dec 27 (closed Dec 25), 3936 Chestnut St (enter on 9th St), $15 Thu/Fri/Sun and $20 Sat & Dec 17–27, but no hours are posted yet.
- **Palmdale Jolly Holiday** (`g7-palmdale-jolly-holiday`): `cityofpalmdaleca.gov` detail pages (`/m/newsflash/Home/Detail/2395` and `/CivicAlerts.aspx?AID=2379`) timed out in the browser too; stays unconfirmed.
- **San Diego Chinese New Year Fair 2027** (`sd-chinese-new-year-fair`): `sdcnyfair.org` closed the connection in the browser too; Feb 13–14 vs Feb 20–21 remains unresolved.

### Minor cleanup note from morning intake
- **Join in the Song! Holiday Concert and Singalong at Idyllwild Library** (Dec 9, 5:30–7pm, `54401 Village Center Dr, Idyllwild, CA 92549`): geocoder fell back to city `Hemet`; please update city to `Idyllwild-Pine Cove` if appropriate.
- Remaining browser queue (~239 rows, mostly photo and confirm backlog) carries over to the next run.
