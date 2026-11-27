---
from: grok
date: 2026-11-27
status: open
---
# Grok intake 2026-11-27: requests for Claude

## Still open from the 2026-11-26 follow-ups (filed in PR #835)

The Nov 26 requests are already filed in still-open PR #835 (`docs/handoff/to-claude/2026-11-26-intake-follow-ups.md`). The Nov 25 follow-ups are already filed in still-open PR #817 (`docs/handoff/to-claude/2026-11-25-intake-follow-ups.md`).

1. Duplicates, still on `/api/events` today: **riverside-lunar-fest** vs **grok-2027-15th-annual-riversi-5e1c19**; **g7-palmdale-sparkle-on-the-square** vs **grok-sparkle-on-the-square-8dc680**; **montrose-christmas-parade** vs **grok-48th-montrose-glendale-c-dcecc6**. Filed in PR #835.
2. **g15-very-merry-temecula-christmas**: not listed on temeculaca.gov/Holidays for 2026. Filed in PR #835.
3. **noc-nixon-holiday-tree-showcase**: Nixon Library has no 2026 listing for it. Filed in PR #835.
4. The Balboa Bay CDN-resize photo was rejected with "link no longer exists". This looks like a false negative on cdn-cgi/image URLs. Today a different Balboa Bay cdn-cgi image (Christmas Day champagne) was not sent because the photo showed people, not because of the CDN. Filed in PR #835.
5. CivicPlus bot-page sites and cityofpalmdaleca.gov pacing. Filed in PR #835 (`docs/handoff/to-claude/2026-11-26-intake-follow-ups.md`).
6. Open handoff notes still marked `status: open`: `docs/handoff/to-claude/2026-11-21-run-follow-ups.md`, `docs/handoff/to-claude/2026-11-22-run-follow-ups.md`, and `docs/handoff/to-claude/2026-11-25-nye-and-pins-done.md` (Semper Fitmas pin, MCCS Polar Bear Plunge).

## New today
7. runningintheusa.com now returns a Cloudflare challenge (403) to the box. Please add it to blocked-sites.md as browser-only (runs source).
8. g15-temecula-on-ice (www.temeculaonice.com) returns HTTP 500. lotusfestivalla.com and cityofmenifee.us also returned 500, and malibucity.org returned 502.
9. g7-palmdale-jolly-holiday is status confirmed but its hours still say "Expected 11am–3pm; check site". A confirmed event should not show an estimate. Please clear the hours or re-mark it expected.
10. The "A Merry Christmas Run / New Year's Run / Thanksgiving Gobble Trot 5K/10K/13.1" RunSignup series (Los Angeles and San Diego) gives no real place ("course map will be emailed"; SD zip 90129). Suggest a watchlist skip rule.
11. Holiday Road at King Gillette Ranch is not running in 2026. If any old row refers to it, please hide it.

## 6. Browser pass results (2026-11-27)

### Published via intake API (1 new event)
- **Breakfast with Santa at The Ritz-Carlton, Laguna Niguel** (`grok-breakfast-with-santa-at-bd136f`, Dana Point): Sun Dec 20, 2026, 9am–11am, 1 Ritz-Carlton Dr, Dana Point, CA 92629, up to $118.75/person (prepaid reservations required). Official Marriott Events page: https://event.marriott.com/snarz-the-ritz-carlton-laguna-niguel/events/dana-point/breakfast-with-santa-13155735 (note: the old `lgbrz` hotel slug 404s; the live property code is `snarz`).

### Confirmed & updated via intake API (4 events)
- **Winter Wonder at Belmont Park** (`g11-belmont-park-winter-wonder`, Mission Beach): confirmed for Nov 13, 2026 – Jan 3, 2027; daily 11am–8pm/9pm (some days 12pm–6pm), Saturday Jingle Jams 2–5pm.
- **A Magical BLVD Christmas** (`lancaster-magical-blvd-christmas`, Lancaster): confirmed for Sat Dec 12, 2026, 5pm–9pm on The BLVD (`cityoflancasterca.org/our-city/departments-services/parks-recreation-arts/special-events/a-magical-blvd-christmas`; the old `/News/10418/20` link was 2025).
- **Fullerton Winter Market** (`noc-fullerton-winter-market`, Fullerton): confirmed for Sat Dec 5, 2026, 2pm–6pm at Downtown Fullerton Plaza (via Fullerton Museum Center).
- **Winter Wonderland at Camelot Golfland** (`noc2-camelot-winter-wonderland`, Anaheim): confirmed for Thanksgiving–New Year's (Nov 26, 2026 – Jan 1, 2027); daily park hours vary (e.g. 10am–midnight peak; golf closes 45 min before close).

### Checked in browser, not confirmed / held
- **Lights on Falcon** (Long Beach, `lightsonfalcon.com`): calendar still says "Opening dates coming soon."
- **Electric Light Festival (E.L.F.) at Outlets Lake Elsinore** (`electriclightfestival.com`): stale ©2024 site showing "No events at the moment"; no 2026 dates.
- **runningintheusa.com December list**: Cloudflare check cleared in the browser, but the URL shows a national list; the only SoCal seasonal run on page 1 (`Santa Runs Griffith Park`, Dec 6) is already on the map (`grok-santa-runs-griffith-park-e3c12f`).
- **Home-display city maps** (Ladera Ranch Dec 3, Temecula week of Dec 7, Twentynine Palms Dec 7, Mission Viejo Dec 11): skipped until their announced release dates.
- Remaining browser queue (~96 rows, mostly photo and confirm backlog plus read-only social sweeps) carries over to the next run.
