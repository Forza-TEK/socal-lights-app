# Status

_Last updated: 2026-10-28_

## Where we are
Site is live at https://socallights.app. Event data is being maintained through weekly sweeps (see the latest `migrations/00NN_sweep_*` files and `docs/confirmation-plan.md`). The repository moved from the personal GitHub account to the `Forza-TEK` org on 2026-10-27.

## Next steps
1. Continue confirming `expected` holiday events per `docs/confirmation-plan.md`.

## Open questions / blockers
- **The cloud sandbox cannot reach many event sources.** Riverside County Library, San Bernardino County Library, Pasadena library, San Diego Public, Chula Vista, Carlsbad, Oceanside, Thousand Oaks, Inglewood, Hawthorne and Gardena city sites fail DNS or return 403. Fix: widen Network access in the cloud environment settings (cloud environment menu, Edit, Network access) for the session environment AND the scheduled routines' environment, adding `*.libcal.com`, `rivcolibrary.org`, `sblibrary.org` and the city sites, then re-run the library searches (see `docs/city-sweep.md`).
- **Leads not yet published (need a manual check or a reachable source):** Cudahy, Paramount and South Gate Halloween events (2026 dates only estimated from 2025); Leimert Park Kwanzaa parade (Dec 26, no loaded 2025 page); LA County Parks Trick or Treat Village and Harvest Festival (flyer images only); LA City Rec & Parks Halloween Activities List PDF (403); Riverside Bryant Park Halloween carnival (Oct 31, snippet only); Covina Woman's Club trunk-or-treat; Cerritos Artesia Park Spooktacular; Whittier Christmas parade; Bellflower tree lighting; Long Beach Aquarium NYE; HB Central Library Nutcracker shows (no fitting christmas type).

## Scheduled tasks (Claude Routines, unattended, publish directly to `main` after validation; see `docs/updating-events.md`)
| Routine | Schedule (America/Los_Angeles) | Job |
|---|---|---|
| SoCal Lights city sweep (Forza-TEK) (`trig_01NssBaBjV2agGcKqfFtMsdp`) | 4:13, 12:13 and 20:13 daily | Sweep one city group from `docs/coverage-cities.md` for new events; validates and publishes |
| SoCal Lights weekly upkeep (Forza-TEK) (`trig_01ALNHRk62UWcy9KRCZmHagW`) | Mondays 6:47 | Confirm dates, fix details, remove dead or duplicate events, season roll-overs; validates and publishes |
| SoCal Lights midweek upkeep, Nov-Dec (Forza-TEK) (`trig_016jHPtnoVU8ZMroW1hNSRFa`) | Wed and Sat 6:52, November and December only | Date confirmation for events starting in the next 6 weeks; validates and publishes |

No human review step: Rey authorized direct publishing on 2026-10-28. Check the Actions tab ("Apply database migrations") if something looks off.

The original three routines (`trig_01H9a1iYVJNgtgzyAi8kNpn5`, `trig_01VBEfN43zRQJwuHf4uqaHD7`, `trig_01Gm1USYSZ7oHRHQTTqkQoo5`) are **disabled**. They had `github.com/forza-tek/socal-lights` as their source, which stopped authenticating after the repo move (the 2026-10-27 12:14 sweep failed at startup). The replacements use the new repo name and clone it themselves. The old ones can be deleted from the Routines page once the new ones have each run once.

## Recently done
- Night mode is automatic: dark from 6 pm to 6 am (device time), light otherwise. The sun/moon button overrides it until the next 6 am / 6 pm switch, then auto resumes; a page left open flips on its own.
- Cache: Cloudflare gives CSS/JS a 4-hour browser cache that `_headers` can't override (the zone's Browser Cache TTL), so phones kept the old UI after deploys. `public/index.html` now loads `styles.css` and `app.js` with a `?v=` version; bump it whenever either file changes (rule added to `CLAUDE.md`). A zone-level fix would be to set Browser Cache TTL to "Respect Existing Headers" in the Cloudflare dashboard.
- Phone UI, all live on `main` (PRs #19-#21): the list uses one card format and is always vertical (sideways card row and the "cards" sheet stop removed); season tabs have no underline, and a dot in the season's color marks the selected tab; Holidays has a caret drop-down listing its event types plus "All Holidays"; the selected card stays visible when the sheet moves or after "Back to results".
- Phone list: the half and full-height list now uses the same cards as the collapsed sheet (84px image, dates and tags shown in both).
- 2026-10-28 library/park research push, all merged to `main` and applied: Huntington Beach Central Library (2), South Bay (8), Gateway Cities (5), Orange County libraries (11), San Diego/Ventura/Santa Barbara libraries (24), Long Beach and Southeast LA (15, plus a Santa Fe Springs tree lighting date fix to Nov 21), LA County/Glendale/Burbank/LAPL libraries (20), Inglewood/Gardena/Lawndale (3). Live feed went from 1,019 to roughly 1,100 events. `docs/city-sweep.md` now requires searching library and park calendars.
- Scheduled routines publish directly to `main` after validation; weekly upkeep and city sweep test runs both landed migrations successfully.
- City sweep group 21 (region-wide sources), 2026-10-27 evening: regional guides (enjoyorangecounty, lajollamom, sandiego.org, Visit Newport Beach, Secret LA, mommypoppins) are almost fully covered on the map already; added 1 event (Fairmont Grand Del Mar tree lighting, migration 0049). Left out for unverified 2026 dates: Park Hyatt Aviara Stocking Full of Christmas, Night of Lights OC, San Diego Harvest Festival at Dolores Magdaleno Rec Center (Nov 21, cost not listed).
- Coverage audit: all 210 incorporated cities checked against `docs/coverage-cities.md`; 13 missing cities added to groups and a priority list of 0–1-event cities added (see that file).
- Recreated the three scheduled routines against `Forza-TEK/socal-lights-app` and disabled the old ones (2026-10-28). Test-fired the city sweep; it cloned the repo and started searching.
- Verified `CLOUDFLARE_API_TOKEN` survived the transfer: a manual run of the migrations workflow on 2026-10-27 authenticated and applied cleanly to the live D1 database (no-op, everything already applied). Note the workflow skips itself and still shows green if the secret is missing, so check that the "Apply migrations" step actually ran.
- Cloudflare Pages Git connection re-pointed at `Forza-TEK/socal-lights-app` (the dashboard showed a stale-link warning after the rename). The Cloudflare Workers and Pages GitHub app now has access to the repo, the warning is gone, and auto-deploys from `main` work again.
- Header logo and browser-tab icon switched to the SoCal Lights badge.
- Repository moved to `Forza-TEK/socal-lights-app`; project context added (`CLAUDE.md`).
