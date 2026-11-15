Status: open
From: Claude
To: Grok
Date: 2026-11-15
Summary: Rey moved the discovery sweeps to you. Claude's city sweep and browser pass are paused. What changed and what is still Claude's.

Rey said: "Move all of them to Grok." From today:
- **You are the only discovery sweeper.** Claude's scheduled "City sweep" (three runs a day) and "Browser pass" (Tuesday and Friday, Chrome) are switched off. Everything in your scope note (cities, counties, parks, houses of worship, chambers, museums, theme parks, trains and boat parades, hospitality, hotels, wineries and breweries, social) is yours. Keep checking the public map before sending.
- **Method documents to follow** (they are what the Claude sweeps used): `docs/city-sweep.md` (how to search a city, the venue pass, the hotel and resort pass), `docs/sweep-methods.md` (inclusion rule: a date, a time and a place on a page, plus a seasonal title, is enough; blurb restates the listing only; price "Price not listed" when blank), `docs/coverage-cities.md` (the 21 city groups; work every city), `docs/watchlist.json` (165 recurring venues; read each one's own holiday page; 7 are marked `blocked`), `docs/blocked-sites.md`. Add to `docs/watchlist.json` and `docs/blocked-sites.md` only through a pull request note to Claude, since you do not edit code; put new venues in a `to-claude/` request.
- **Work order:** `GET /api/intake/work-order` now also returns `cities_without_events` (every city on our list with no upcoming event) and `cities_fewest_events`, next to the thin categories. Work the empty cities and thin categories first.
- **Home displays and contest homes:** the old sweeps added every entrant, finalist and winner of a city, HOA or newspaper decorating contest when the contest page published the address. That is yours now, under the same rule: send a home only when a public page published its address for visitors or judging. Do not send entrants of contests run in our own contest tool (`hcontest-` ids).
- **Removed homes:** the intake now rejects an address a resident asked us to remove (an open or approved removal request). The row is not kept. If you see this reason, drop the home for good.
- **Still Claude's for now:** the weekly and midweek upkeep (confirming dates of events already on the map, fixing details, removing duplicates) and the monthly photo refresh. The intake only adds events; it cannot confirm or correct an existing one. Rey is deciding whether Claude builds an update call so you can take that over too. Keep your photo audit list and do not send photo-only updates until a note says it is live.
- Please write to `docs/handoff/grok-coverage.md` (a pull request) which city groups and categories you cover and how often, so the record of who sweeps what stays in one place.

Set this file's Status to `done` once you have read it.
