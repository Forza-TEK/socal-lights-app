# Data and operations audit, 2026-11-04

Scope: live D1 database (read-only SELECTs through the Cloudflare query API), `functions/`, `migrations/`, `.github/workflows/`, docs. Nothing was changed. Live counts at audit time: 2,013 events, 6 posts, 1 installer, 1 contest, 5 users, 179 migrations.

## Summary

| Severity | Count |
|---|---|
| High | 4 |
| Medium | 7 |
| Low | 7 |

The data itself is in good shape: no duplicate events, no bad coordinates, no wrong seasons or types, no date errors. The real risks are operational: no backup or restore runbook, a database that cannot be rebuilt from migrations, an events API that burns D1 reads and Function requests per visit, one dead-link source covering about 93 events, and no way to tell a quiet routine from a broken one.

## Ranked findings

| ID | Sev | Area | Evidence | Impact | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| F1 | High | Backups | No backup job in `.github/workflows/` (8 files); `grep -i "time travel\|backup\|restore"` in docs and README finds nothing relevant; `functions/api/admin/export.js` only exports CSVs of houses, events, installers and contests | A bad migration, a bad admin action or a Cloudflare incident has no documented recovery. Users, sessions, posts, contests, orders, claims and submissions exist only in the live DB | Add a nightly `wrangler d1 export --remote` workflow (see Backups section) and a one-page restore runbook in `docs/` | S |
| F2 | High | Docs / architecture | CLAUDE.md says events change "only through new migration files". But `functions/api/submit-event.js`, `admin/events/[id].js` (DELETE), `admin/submissions/[id].js`, `me/events/[id].js`, `stripe-webhook.js` (featured) and `contests.js` write the `events` table directly | The live DB is not reproducible by replaying migrations. A session that trusts the doc will assume the repo is the source of truth and can overwrite or lose live edits. It also raises the value of F1 | Reword CLAUDE.md and updating-events.md: migrations are the source for sweep data only; the live DB is authoritative; back it up | S |
| F3 | High | Cost / scaling | `functions/api/events.js:10` runs `SELECT * FROM events ORDER BY start_date, name` (2,013 rows read per cache miss). The cache is `caches.default`, which is per data center. The response header is `cf-cache-status: DYNAMIC` with `age: 3`, so the Function runs on every request, hit or miss. Payload is 1,358,496 B raw, 314,439 B gzip -9. 769 rows (38%) have already ended and are still served | Free caps are 100,000 Function requests/day and 5M D1 rows read/day (finance-pricing.md). Now about 5,600 requests/day, so about 6%. At 18x traffic the Function cap is hit; at about 2,500 misses/day the D1 cap is hit (5M / ~2,020 rows). With per-colo caching and s-maxage 120, roughly 3.5 busy colos can reach that. Over the cap, D1 queries fail and the map goes blank | Filter ended events in SQL (`end_date >= date('now','-1 day')`), drop the scan to about 1,250 rows, store a precomputed JSON snapshot (R2 or KV) rewritten when events change, and put a Cache Rule on `/api/events` so hits skip the Function. Test that last part, I could not verify it | M |
| F4 | High | Data / URLs | 120 sampled event URLs: 98 OK (81.7%), 13 dead (7 x 404, 5 DNS/TLS/disconnect, 1 x 502), 9 blocked (8 x 403, 1 x 429). Six of 8 sampled `socalhauntlist.com` URLs end in 404 or a redirect to a `/?post_type=gd_event&p=N` page. `SELECT count(*) FROM events WHERE url LIKE '%socalhauntlist.com%'` = 93, all confirmed or expected Halloween rows | Probably most of those 93 events point at dead pages. Halloween is over (ends Nov 2), so the damage is small now but they are the second most common host | Replace the links with the organizer's own page, or clear them. Add a "dead-link rate by host" step to the monthly photo refresh or weekly upkeep | S |
| F5 | Med | Data / status | 94 `expected` events have already ended (`end_date < 2026-11-04`, mostly Halloween and Dia). 19 `expected` events start within 14 days (14 christmas, 5 halloween/Dia, e.g. `123farm` Nov 5, `citadel` Nov 7, `pasadena` Nov 13, `americana` Nov 13). 362 `expected` start within 30 days | Imminent unconfirmed events show estimated dates and "check site" hours as if reliable. The Nov 7 Dia group has 5 expected rows | Midweek upkeep should triage the 19 first. Add a rule that ended `expected` rows are rolled to next year or removed | S |
| F6 | Med | Scheduled work | `d1_migrations` shows sweep migrations on only 8 of the last 9 days and 1 to 4 per day against 3 scheduled runs per day. A no-op run leaves no trace. No browser-pass migration since 0124 (applied 2026-10-31 01:35 UTC), so the Tue Nov 3 run left nothing. No photo migration since 0114 (2026-10-30), so the monthly photo refresh of Nov 1 left nothing. No sweep migration since 0154 (2026-11-04 04:16 UTC). Sweep group order is irregular (g17, g18, g15, g10, g18, g19, g20, g21) | A run that fails and a run that finds nothing look identical. The browser pass needs the owner's computer on, and it is the likeliest to be silently skipped | Have each routine write a one-line heartbeat (a `routine_runs` table, or a commit to `docs/`) even when it adds nothing. Alert if none in 36 h | M |
| F7 | Med | Migrations | 17 numbers are used twice (0016, 0023-0028, 0030, 0032, 0033, 0070, 0090-0093, 0118, 0156). `ls migrations` has 179 files and `d1_migrations` has 179 rows with identical names, so the DB and the files agree. `scripts/validate-migrations.mjs:33` sorts file names, and `wrangler d1 migrations apply` tracks by full file name and runs unapplied ones in name order. No check in the validator or the workflow rejects a reused number | Today harmless: the two 0156 files are independent, and a clash in name order differs from apply order (`0156_email_prefs` sorts first but was applied second, id 178 vs 177). A dependent pair (create table, then seed it) with the wrong alphabetical order would fail in the workflow, or on a fresh local DB | Add a validator warning for a reused number. Rule: renumber on rebase, or use a timestamp prefix | S |
| F8 | Med | Caching | `/in/<city>` runs `SELECT * ... WHERE end_date >= ?` (about 1,244 rows) per cache miss, with s-maxage 3600. `/sitemap.xml` runs `SELECT DISTINCT city ... WHERE end_date >= ?`. The only events index is `events_season(season, end_date)`, which cannot serve an `end_date` range | About 310 city values. A crawler that walks every city page from a cold cache reads about 390k rows per sweep. Fine now, bad at 50x | Add `CREATE INDEX events_end ON events(end_date)`. Select only the needed columns. Consider one cached `/api/events` snapshot shared by all pages | S |
| F9 | Med | City data | 310 distinct city values, 227 of them not in `public/cities.js` (that file has 83 centers), covering 713 events. Neighborhoods are stored as cities: `Downtown L.A.` (21), `Downtown` (6), `Hollywood`, `Point Loma`, `Balboa Park`, `Mission Bay`, `Boyle Heights`, `Venice` next to `Los Angeles` (84). No spelling variants found | Each city value becomes a `/in/<slug>` page and a sitemap URL, so LA events are split across thin pages. `Downtown` alone has no city name. What cities.js is meant to cover is unclear, so I could not tell whether 227 missing is a bug | Decide the rule (city = incorporated city, neighborhood goes in venue). Fold `Downtown` and `Downtown L.A.` into `Los Angeles` | M |
| F10 | Med | Docs drift | See Docs drift below. Highest: CLAUDE.md "contests ... branch work, not live yet" (they are live: 1 live contest, 5 users and 5 sessions, `/past` in the sitemap) | A future session may refuse to touch or may mis-describe live features | Fix the two lines | S |
| F11 | Med | Data / labels | 42 events (all `expected`, e.g. `cg2-glendale-651-w-doran`) carry "2025 winner" or "2025" in the name but are dated 2026-12-01..31 | A visitor reads a 2025 contest result as a 2026 listing. These are last year's winning homes shown as expected this year. The doc rule is only to confirm them from the home's own page | Rename "(2025 contest winner, 2026 display not confirmed)" or hold them until confirmed | S |
| F12 | Low | Hours and price | 934 events (46%) have "check" in hours. 194 of them are `confirmed`. 13 `expected` rows lack "check site" (the rule in updating-events.md). 1 event has empty hours. All prices fall in 3 vocabularies: `Free` 1,065, `Price not listed` 228, `Check listing` 121, plus free-text; 192 rows have `free=1` with a long price string such as "Free to watch" | Cosmetic, but 194 confirmed events with unknown hours is a confirmation gap | Sweeps: fill hours from the organizer page when confirming | S |
| F13 | Low | Images | 965 events (48%) have no image and fall back to stock photos. Of 60 sampled image URLs, 76 rows are local `/img/events/*.jpg` (76 files exist in `public/img/events`, not matched one by one). Of 56 remote images tested, 5 failed (4 DNS failures: `static1.squarespace.com` and `alhambralunarnewyear.com` over `http://`, 1 x 500 from eventbrite) | About 9% of remote images dead. The monthly photo refresh is meant to catch this | Run the dead-image check in the refresh. Prefer `https://` | S |
| F14 | Low | Schema | No index on `posts.user_id` (queried by `functions/_lib/account.js:27`, `me/*`), `login_codes.ip` (rate limit, `auth/email/start.js:18`), `submit_log.created_at` alone (prune `submit.js:122`; the index is `(ip, created_at)`), `events.keep_listed`/`address` (`posts.js:15`, `_lib/wins.js:24`). `votes` has `UNIQUE(contest_id,user_id,category)` and `votes_post`, which cover the contest paths | All tables are tiny (posts 6, votes 0, login_codes 0), so no cost today. They become full scans if posts or logins grow | Add `posts(user_id)` and `login_codes(ip, created_at)` when volume appears | S |
| F15 | Low | Unbounded tables | `site_hits` is bounded (one row per day and page). `submit_log`, `login_codes` and `sessions` are pruned only as a side effect of writes (`submit.js:122`, `auth/email/start.js:25`, `_lib/auth.js:46`). `admin_log` (21 rows), `listing_changes` (0), `stripe_events` (0), `contest_hits`, `installer_hits`, `help_searches` and `help_votes` have no cleanup | Not a problem at this volume. `stripe_events` and `admin_log` will grow forever | Add a monthly cleanup (`DELETE ... WHERE at < date('now','-180 days')`) to the weekly upkeep routine when needed | S |
| F16 | Low | Homes / installers | 6 posts, all `approved`; no orphans: no post with a missing contest, installer or user, no contest with a missing owner or event. The `c-irvine-holiday-lights-contest` event exists. Issues: the Rancho Santa Margarita post has `photos='[]'`; two Lake Forest posts share identical lat/lng but have different addresses (geocoded to the same point); the one installer (`lights-up-today`) has no `owner_email`, `area` or `logo`, so nobody can claim or manage it | Minor. Both show a pin on the same spot. The installer page looks thin | Geocode the two posts separately. Fill the installer's area | S |
| F17 | Low | Hygiene | `_tmp_dummy` (empty file) is tracked at the repo root (commit c1c8809). A one-time exception for `0083` remains in `validate-migrations.mjs:60`, although 0083 is applied (id 95) | Clutter, and a hole in the "never edit a migration" guard | Delete the file and the exception | S |
| F18 | Low | Data | 2 events lack a ZIP, 1 event has an `http://` URL (`lotus-festival`). 8 events sit more than 30 km from their city center (e.g. `soc-la-smoakdale-cemetary`, `soc-la-starry-night-zone-a-halloween-tri`, 35 to 37 km); the 4 Avalon events fail a rough county box but Catalina is in Los Angeles County, so they are fine | Probably intended (county-wide haunts) | Spot-check the 8 pins | S |

## Docs drift (most misleading first)

1. CLAUDE.md line 43: "Contests, accounts and sign-in (branch work, not live yet)". Live: `docs/contests.md` says "Live on main", and the DB holds a live contest, 5 users and 5 sessions.
2. CLAUDE.md "How event data changes ... change only through new migration files". Not true; see F2.
3. `docs/contests.md` line 3: "pages unlinked and noindex ... Sign-in is off until the Google and Resend secrets are set". Sessions exist, `/past` is in the sitemap, and the Featured and Pricing pages are linked. I could not verify the secrets.
4. `docs/data-audit.md`: "6 homes and 2,004 events" and "3 of 2,004 have no ZIP". Now 2,013 and 2. Dated 2026-11-02, so it is a snapshot, not an error.
5. `docs/confirmation-plan.md`: "As of Oct 26 ... 512 events: 193 confirmed, 319 expected". Now 1,066 christmas events (526 confirmed, 540 expected). The wave table (A to E) is stale. The goal "turn expected into confirmed" still holds.
6. `docs/updating-events.md`: the numbering example `0006_`; rule numbering has two "4."; "Events that have ended disappear automatically" (true in the client only; the API still returns them). It does not mention that duplicate migration numbers exist.
7. `docs/operating-guide.md` ("Last updated 2026-10-30") lists 5 routines and no GitHub workflows (alerts weekly Thursday, contest-reminders daily, submission-digest 3x daily).
8. `docs/monetization.md` says "Cash App" in the first lines while later lines say Stripe only. `docs/status.md` is about 81 KB (368 lines) and CLAUDE.md tells every session to update it; it is too big to read in full.
9. `docs/coverage-cities.md` says 21 groups; the sweep has used g1 to g21, which agrees.

## Item 3: migrations and schema notes

- Runner: `d1-migrations.yml` first runs the validator gate against commits since the last successful deploy, then `wrangler d1 migrations apply socal-lights --remote`. Wrangler records each file by name, so two files with the same number are legal. It orders by name, not by number.
- `d1_migrations` (179) matches the file list (179), with no file missing and none unapplied.
- Last 3 `Apply database migrations` runs (run numbers 175, 176, 177) all succeeded.
- "Migrations never edited": a local `git log --diff-filter=M` returns nothing, but the clone is shallow (73 commits since 2026-11-02), so this proves nothing. The validator's `existing-migration-edited` rule enforces it, with the one 0083 exception noted in F17. I could not verify the full history.

## Item 4: scheduled work health

| Routine / workflow | Evidence | Last seen | Verdict |
|---|---|---|---|
| City sweep (3x daily) | migrations `*_sweep_g*` | 0154 applied 2026-11-04 04:16 UTC | Runs, but leaves no trace when empty; 0 sweep migration since. Unverified |
| Weekly upkeep (Mon) | 0146 | 2026-11-02 15:26 UTC | Healthy |
| Midweek (Wed, Sat) | 0156 | 2026-11-04 14:58 UTC | Healthy |
| Browser pass (Tue, Fri) | 0123, 0124 | 2026-10-31 01:35 UTC | Nothing since; Tue Nov 3 left no trace. Needs owner's computer |
| Monthly photo refresh (1st) | 0114 last photo migration | 2026-10-30 | Nov 1 run left no trace |
| `d1-migrations.yml` | 3 latest runs | 2026-11-04 18:22 UTC | Success |
| `submission-digest.yml` (cron 3x daily) | 3 latest runs | 2026-11-04 10:29 UTC | Success (6 runs total, so GitHub scheduled runs are running less often than the cron) |
| `contest-reminders.yml` (daily) | 2 runs | 2026-11-03 22:17 UTC | Success |
| `alerts.yml` (weekly Thursday) | 2 runs, both manual; the first (Nov 1) failed, the second succeeded | 2026-11-01 | No scheduled run yet; first due Thursday Nov 5 |
| `validate-migrations.yml`, `ios-app.yml`, `android-*.yml` | not queried | n/a | Unverified |

I could not read Claude routine run history (it is not exposed to these tools), so "ran with nothing to add" cannot be separated from "did not run".

## Item 5: backups and recovery

- D1 Time Travel is built in (point-in-time restore by timestamp or bookmark, `wrangler d1 time-travel restore`). From memory, the retention is 30 days on paid and about 7 days on the free plan. I did not check the current docs.cloudflare.com limits, so confirm. A restore rewinds the whole database in place, including users and posts created after the chosen time, so it is a blunt tool.
- Nothing exports the DB to anywhere else. The admin CSV export covers four lists and omits users, votes, orders and claims. R2 photos (`socal-lights-photos`) have no copy.
- A bad migration: the validator blocks DROP, TRUNCATE and DELETE or UPDATE without WHERE, but a wide `UPDATE ... WHERE` on events or any table other than posts and submit_log passes. Events can be replayed from migrations only in part (F2). Live-only data (users, sessions, posts, contests, votes, orders) would be lost without a backup.
- No restore runbook exists.
- Cheapest safe backup, cost $0: a nightly GitHub Actions job (it already has `CLOUDFLARE_API_TOKEN`) running `npx wrangler d1 export socal-lights --remote --output backup.sql`, uploaded as a private workflow artifact with 30 to 90 days retention. Do not commit it: it holds emails. The file is about 2 MB. For photos, a weekly `rclone sync` of the R2 bucket to a second free-tier R2 bucket or to the owner's drive. Write the restore steps (Time Travel first, then `wrangler d1 execute --file backup.sql` into a new DB) in `docs/`.

## Item 6: caching and cost

- `/api/events`: `cache-control: public, max-age=60, s-maxage=120`; 1.36 MB raw, 314 KB gzip -9, and the live response was served with `content-encoding: br`. About 1,040 B per event. `/api/posts`: `max-age=60`. `/in/<city>`: `max-age=600, s-maxage=3600`. `/sitemap.xml`: `max-age=3600`. `/api/archive`: `max-age=300`. Home HTML: `max-age=0, must-revalidate`.
- Rows read per request (estimates from the code, one confirmed: D1 reported `rows_read` 2,013 for a count): `/api/events` about 2,020 per miss; `/in/<city>` about 1,250 per miss; `/sitemap.xml` about 1,250 plus small queries; `/api/archive` up to 300 contests; submit paths read all 2,013 events for the coordinate check (`submit.js:113`, `submit-event.js:60`, `contests.js:48`).
- Headroom (finance-pricing.md, 56,487 requests in 10 days): about 5,600/day against 100,000 Function requests/day and 5M D1 reads/day. The Function cap is the first limit to break, at about 18x traffic; D1 reads follow, depending on cache misses. At 50x: about 280,000 requests/day, over the cap, so the free plan fails closed unless upgraded. Static assets do not count.
- Scales badly at 50x: `/api/events` payload (1.4 MB x every visit), full-table SELECTs, per-colo cache, `SELECT *` including unused columns, and the sitemap and `/in/` scans. Cheap fix order: F3, then F8.

## Data quality scorecard

| Metric | Value | Target |
|---|---|---|
| Duplicate events (name+date+city) | 0 | 0 |
| Same address + start date | 18 pairs, all distinct events at one venue (reviewed) | 0 unreviewed |
| Coordinates outside SoCal / null / zero | 0 / 0 / 0 | 0 |
| End before start | 0 | 0 |
| Type not valid for season | 0 | 0 |
| Start date outside the season window | 44 (mostly Dia in Nov 7, LNY in Feb; legitimate overlaps) | review |
| Expected events already ended | 94 | 0 |
| Expected starting within 14 days | 19 | 0 |
| Confirmed share | 1,260 / 2,013 (62.6%) | rising |
| Missing url / address / venue / price | 0 / 0 / 0 / 0 | 0 |
| Missing image | 965 (48%) | below 30% |
| Hours say "check" | 934 (46%) | below 25% |
| Event URL dead (sampled 120) | 10.8% (13), plus 7.5% blocked | below 3% |
| Remote image dead (sampled 56) | 9% | below 3% |
| Eventbrite / Facebook / Instagram links | 83 of 2,013 (4.1%) | informational |
| City values not in `cities.js` | 227 of 310 | decide the rule |
| Orphan rows (posts, contests, installers) | 0 | 0 |

## Verified OK

- `d1_migrations` equals the migration files (179 = 179, none unapplied). The last 3 deploys succeeded.
- All 2,013 events have valid ids, county, dates, status values, lat 32 to 35.8 and lng -121.5 to -114, and blurbs of 180 characters or fewer.
- No city spelling variants (case, saint/st, stray spaces). No duplicate name, date and city rows.
- All event rows have `notice=''` (nothing cancelled or postponed) and no featured events.
- Prices use the approved wording for the 3 standard values.
- No orphan rows between posts, installers, contests, users and events.
- `/api/events` is edge-cached (age header present) and compressed (br).
- Rate-limit tables (`submit_log`, `login_codes`, `sessions`) do prune themselves.

## Could not verify

- Claude routine run history and failures (only their migration output).
- Whether the Cloudflare Cache Rule idea removes Function invocations, and the current D1 Time Travel retention for the free plan.
- Full git history of migrations (shallow clone), `validate-migrations.yml` and the app workflows' run results.
- Whether the 76 local images match the rows, R2 object existence, and whether `cities.js` is meant to list every city.
- URL results come from one sandbox IP, so 403 and 429 are bot blocks, not proof of a dead link. The sample is random but small (120 and 60); the `socalhauntlist` finding rests on 8 sampled URLs.
