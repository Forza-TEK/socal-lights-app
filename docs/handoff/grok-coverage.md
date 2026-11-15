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
