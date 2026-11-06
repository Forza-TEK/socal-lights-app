# Engineering quality audit (2026-11-07)

_Read-only audit of `main` at 668b381 (#379), by the Engineering Quality specialist. No application code was changed. Method: read code, ran `npm test` three times, GET-only checks of the live site, GitHub API reads. Previous audit: `docs/audit/2026-11-04/contests-engineering.md` (C-numbers below refer to it)._

**Not verified.** (1) The live D1 `d1_migrations` table: this session has no Cloudflare credential (no token in the environment, nothing through the proxy), so the live migration list could not be compared with `migrations/`. What can be said from the repo and GitHub is in section 1.3. (2) Whether the Cloudflare account is on the Workers Free plan (CLAUDE.md says "free tier"; two findings depend on it). (3) Pages preview-deployment bindings (dashboard only).

## Counts

| Severity | Count |
|---|---|
| High | 3 |
| Medium | 12 |
| Low | 11 |

Suite: 177 tests, 177 pass, 3 runs in a row (4.9 s, 5.0 s, 5.0 s), no flakiness seen. Nothing urgent (no active outage, no data loss in progress); the High items are latent.

## Top 5

1. **H1. Paid placements vanish with no refund flag on the owner self-service paths.** Deleting your own account, deleting your own home (`DELETE /api/me/homes/<id>`), and a contest creator's Unpublish (which deletes the contest's map event) all remove a row that carries a paid Featured placement, and none of them marks the order `refund_due`. Only the Admin paths were fixed. `publish_again` does not call `restorePlacement` either, so a republished contest event comes back without the placement the owner paid for.
2. **H2. The monitoring that replaced "no alerting" does not run at the promised cadence.** `uptime.yml` is scheduled every 15 minutes; GitHub ran it 8 times in the last 36 hours (gaps of 4 to 8 hours). A real outage can sit for half a working day. The nightly backup has been run only by hand so far (the first scheduled run was not visible at 11:07 UTC although it is due at 10:17).
3. **H3. The free-tier ceiling is the biggest single point of failure for growth.** One map visit costs about nine Function invocations (`/`, events, posts, config, banner, visit x2 to 3, auth/me) and Free allows 100,000 requests a day (about 10,000 visits), after which every `/api/*` call fails and the map shows "Events couldn't load". Also 50 subrequests per invocation on Free (see M9).
4. **M1. Anyone can force a full-table rebuild of the event list on every request** by adding a random query string (`/api/events?x=1`, `?x=2` ...): the edge cache key includes the query string and there is no single-flight on the stale rebuild.
5. **M2. The map's boot is one `Promise.all`, so a failure of `/api/posts` blanks the whole app**, and `/api/posts` has a silent D1 limit bug waiting (200 bound parameters, D1 allows 100; the test stand-in allows 32,766, so tests cannot see it).

---

## 1. Regression risk in the most-changed areas

### 1.1 What was checked and found sound
- **Event detail on demand** (`public/app.js:873-910`): in-flight de-duplication (`DFETCH`), 15 s abort, error classes, retry, details kept across the 15-minute refresh (`:1427`). A list from before the deploy (still carrying `b` and `u`) works with the new code. Good.
- **`/api/events` and `/api/events/<id>`**: ETag and 304 are correct, ended events open by id, 404 is JSON. Live check: `GET /api/events` 200, 619,450 bytes (matches status.md), `/api/events/does-not-exist` 404.
- **Stripe webhook** (`functions/api/stripe-webhook.js`): signature with 300 s tolerance and constant-time compare, event ids recorded only after success, 500 on retryable failure, refund/dispute arriving before the order handled, `applied` guard makes both batches replay-safe (`featured.js:77-84`, `sponsor.js:104-112`). The three product types (event, home, installer) share one order table and one `paid()` path and each branch is covered by `stripe-webhook.test.mjs`, `featured-homes.test.mjs`, `sponsor-pay.test.mjs`.
- **Checkout endpoints**: prices come from the server, same-origin check, per-account limit, idempotency key, Stripe-down answers a friendly 502 (tested).
- **Contests**: announced results are now locked on entries, votes, judges, mine and edits (`entries/[id].js:15`, `votes.js:26`, `mine.js:12`); tests in `organizer-entries.test.mjs`. C3 is closed.
- **Account deletion** scrubs frozen snapshots, judges, leads, claims and installer rows (`functions/_lib/account.js`), tested in `privacy.test.mjs`.

### 1.2 Findings

| ID | Sev | Finding | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| H1 | High | Paid placement lost with no `refund_due` on self-service deletes and contest unpublish | `markHomeRefundDue` is called only from `functions/api/admin/posts/[id].js:102,110,152`; `functions/_lib/account.js:53` deletes the user's homes and `:70` the contest events with no order handling for homes or installers; `functions/api/me/homes/[id].js:112` deletes a home (owner path) with no check; `functions/api/me/events/[id].js:62` deletes an event; `functions/api/contests/[slug].js:69` and `functions/api/admin/contests/[id].js:31,41` call `unlistFromMap` (a `DELETE FROM events`, `functions/_lib/contests.js:72`) with no `livePaidOrders`; `publish_again` (`[slug].js:~72`) calls `listOnMap` only, `restorePlacement` is used only in `admin/submissions/[id].js:61`. Contest owners can buy Featured for the contest event (C14). | A customer pays $10 to $25, the placement disappears, and nothing in Admin > Orders says a refund is owed. The account-deletion case also leaves a paid installer Sponsor order on a profile whose owner email is blanked. | One helper `retirePlacement(db, target)` that marks live paid orders `refund_due` (events, homes, installers) and call it from every delete/unpublish path; call `restorePlacement` from `listOnMap`. Add a test per path. | M |
| M1 (FIXED 2026-11-06) | Medium | `/api/events` cache key includes the query string; every stale hit starts its own rebuild | `functions/api/events.js:34` (`key = new Request(url.toString())`), `:36-38` (rebuild per stale request, no lock) | A script (or just campaign URLs with `?ref=`) makes each request a miss: a full `SELECT * FROM events` (1,254 rows, about 620 KB JSON) plus the posts match, on D1 and CPU. At 10x events the rebuild also becomes a thundering herd after every 2-minute expiry. | Build the key from the path only (ignore unknown params; keep `all`, `ended`, `full`); single-flight the rebuild with a short "building" marker. | S |
| M2 | Medium | One failed list blanks the whole map; and a D1 100-parameter limit bug in the public posts list | `public/app.js:1397` (`Promise.all` of events, posts, config; any rejection shows "Events couldn't load"); `functions/api/posts.js:23` slices to 200 ids, `:24` binds them all in one `IN (...)`, inside `try {} catch {}` | `/api/events` guards its posts lookup with try/catch but the client does not guard `/api/posts`; an error there takes the app down. Above 100 distinct winner accounts, D1 refuses the statement, the catch swallows it and every winner badge silently disappears from the map. Not visible today (one contest). | Client: fetch posts separately and tolerate failure. Server: chunk by 50 (as `badges.js:17` already does). | S |
| M3 | Medium | Server "today" is a fixed UTC-8; the client uses real Pacific time | 14 copies of `Date.now() - 8 * 3600_000` (`featured.js:72`, `funnel.js:5,35`, `contests.js:34`, `orders.js:51`, `util.js:67`, `checkout.js:42`, `featurable.js:9`, `claims.js:28`, `submit-event.js:38`, `visit.js:25,31`, `admin/dashboard.js:39`, `admin-digest.js:19`, `public/addflow.js:10`); `public/app.js:26` and `feature-plans.js:22` use `Intl` with `America/Los_Angeles` | From March to early November the server's day starts at 1 am Pacific. Featured windows, contest start/end, order flags and "today" in the dashboard are an hour late; the client and server disagree between midnight and 1 am (the page can say an event ended today while checkout accepts it, or the reverse). This is C17, still open and now in payments code. | One `pacificToday()` in `util.js` using `Intl`; replace all 14. | S |
| M4 | Medium | Code and schema deploy separately, with no ordering | `.github/workflows/d1-migrations.yml` (migrate job runs 1.5 to 2.4 minutes, from the run list) versus the Pages Git deploy on the same push | A PR that adds a column and the code reading it serves the new code against the old schema for the length of the migrate job: 500s on that path (for example 0173's `emailed_status`, 0171's sponsor columns). | Make schema changes additive and ship them one push ahead of the code, or run the deploy from the workflow after the migrate job. Document the rule in CLAUDE.md. | M |
| M5 | Medium | Asset versions: shared modules unversioned; no check that a changed file got a new tag | `app.js:2,4` import `/cities.js` and `/stock.js` with no `?v=`; `hit.js` (20 pages), `rules.js` also bare; `site-config.js` was changed on 2026-11-04 after its tag `20261031j` (found by comparing git history). `tests/asset-versions.test.mjs` only checks that all pages use one value per file | Cloudflare keeps CSS/JS 4 hours (CLAUDE.md). A new city in `cities.js` or a changed `stock.js` reaches phones up to 4 hours late and can mismatch a freshly tagged `app.js`. The "bump `?v=`" rule is manual and unenforced. | Tag every import; extend the test to compare a content hash of each file against a `v-manifest` (fail when content changed and tag did not). | S |
| M6 | Medium | Service worker and `app.js` have no tests | No test touches `public/sw.js` (cache names `scl-5` / `scld-5`, bumped by hand) or `app.js` (1,438 lines: deep links `#e-`/`#h-`, route planner, sponsor cards, banner). The browser runs described in status.md were manual | Deep link `#e-<id>` silently does nothing for an event outside the list (ended more than 3 days, or hidden behind an approved house; `app.js:1405-1410`), although the detail endpoint serves those ids and the calendar note embeds `#e-` links (`:117`). SW cache names must be bumped by hand when its logic changes. | One Playwright smoke in CI (list loads, `#e-`, detail fills, offline). Fall back to `/api/events/<id>` for an unknown deep-link id. | M |
| L1 | Low | Stale-tab risk after a deploy (documented in status.md) and calendar-before-details can block a pop-up | status.md "Risk" lines | Rare | Accept; the version tag covers new loads. | - |
| L2 | Low | Repeat purchase check is at checkout only | `feature/checkout.js:54-60` | A buyer with two checkout tabs can pay twice for a placement that adds nothing (webhook applies "never shorten") | Re-check in the webhook and flag `[auto] added nothing`. | S |
| L3 | Low | Webhook recomputes the expected installer price at webhook time | `stripe-webhook.js:80` (`sponsorWindow(plan, inst, ptToday())`) | A payment completed just before a season boundary (Jan 6 to 7) or a retried event gets a false "amount mismatch" note. It still applies; only a noisy flag. | Store the quoted cents in the Checkout metadata and compare to that. | S |

### 1.3 Migrations: numbering, order, and what could not be checked
- 199 files, highest 0175. **19 numbers are used twice or three times** (0016, 0023-0028, 0030, 0032, 0033, 0070, 0090-0093, 0118 x3, 0156, 0164, 0170).
- CI applies with `wrangler d1 migrations apply socal-lights --remote` (`d1-migrations.yml`). Wrangler lists files whose **name** is not yet in `d1_migrations`, sorts by filename and applies them; it does not require numbers to be unique or increasing, so a file added later that sorts before an applied one is still applied. The workflow's validate step checks only files added since the last successful run, so a late duplicate is not rejected.
- I checked every duplicate pair for overlap: no pair shares an event id, and the three pairs you named share no tables (0156: email prefs vs sweep rows; 0164: `post_claims` table vs events; 0170: help articles vs installers column). Fresh-database replay order (alphabetical) differs from the live apply order for 0156 and 0164 (the later-added file sorts first) but the result is the same. **Risk is low today**; it becomes real the day two same-numbered files touch the same table or row.
- Tests replay all 199 files on every `makeDB()` (93 ms) and the stand-in swallows a failing file into a `failed` array that no test reads (`tests/_d1.mjs:10-12`, grep for `failed` in tests: no assertion). Today it is empty (checked), so a fresh database does rebuild from migrations in SQLite; but a future bad migration would be skipped silently and the tests would run on a partial schema. Fix: assert `failed.length === 0` in a test (XS).
- Recent migrate runs: the last 6 are green (latest 2026-11-06 10:53Z). **Live comparison `d1_migrations` vs files: not done** (no credential). Owner or CI can run `SELECT name FROM d1_migrations ORDER BY id` and diff against `ls migrations`.
- Recommendation: let the next number be allocated by a script (`npm run migration:new <slug>`) that takes max+1 across `origin/main`, and make the validator fail a new file whose number already exists (warn only for the 19 historical ones).

### 1.4 Scheduled routines that push to `main`
- `main` is protected with the required check **Tests**, but `enforce_admins` is false and the routines (midweek upkeep, city sweeps) push directly as the owner; the migrate workflow's gate (`--gate`) is their only check. This matches CLAUDE.md. A routine that writes a migration which passes validation but is wrong (a real-looking event with a bad date) goes live to the database within minutes with no human review. Accept for the stated design; the safeguard is the validator, so its rules (county list, Southern California box, URL checks) are production code and deserve tests (none exist: `scripts/validate-migrations.mjs` has no test).

---

## 2. Test suite quality and engineering hygiene

### 2.1 Results
`npm test`: 177 tests in 22 files, 3 of 3 runs green, about 5 s. No retries, no time-dependent failures seen. `npm run validate` is also run in CI (`.github/workflows/test.yml`), and `main` requires the "Tests" check. Several tests compute dates from "now", so a run just after a season boundary could differ; none failed.

### 2.2 Untested critical paths, by risk
1. **Admin gate**: `requireAdmin` (Access JWT verification) and `admin/_middleware.js` (audit log): no test. A regression opens `/api/admin/*`.
2. **Sign-in**: email code start/verify, Google callback, session expiry, suspended users (`auth/email/*`, `auth/google/*`, `_lib/auth.js` `sendMail`): no test; everything paid depends on it.
3. **Public submission**: `submit.js` (photos, Turnstile, geocode, limits) and `submit-event.js`, `contests/index.js` (contest creation): no test.
4. **Announce path**: `[slug].js` announce, `notifyResults`, `contest-remind.js`: only `computeResults` and the lock are tested.
5. **Front end**: `app.js`, `sw.js`, `banner.js`, `tour.js`, `addflow.js`: no tests at all; only text-level checks (`terms.test.mjs`, `asset-versions.test.mjs`).
6. **Migration validator** (`scripts/validate-migrations.mjs`), the gate for routines that push straight to `main`.
7. Photo upload and moderation (`api/photo`, `admin/photo`), R2 deletes.
8. DB error paths: no test makes D1 throw. Covered error paths: Stripe down (`checkout.test.mjs:93`, `stripe-webhook.test.mjs:180`), failed email is logged and not marked sent (`alerting.test.mjs`).

### 2.3 Tests that assert implementation
`terms.test.mjs` and `event-funnel.test.mjs` match regexes over page source, so a wording change breaks them while behaviour is unchanged (acceptable for legal copy, brittle elsewhere). `asset-versions.test.mjs` asserts the tag format, not that a changed file was re-tagged (M5). Most payment tests call the real handler with real SQL, which is the right level.

### 2.4 In-memory D1 stand-in (`tests/_d1.mjs`) vs real D1

| Difference | Effect |
|---|---|
| Bound-parameter cap: D1 100, node:sqlite 32,766 | Hides M2 (`posts.js:24`, 200 ids). Also `IN (${ids...})` at `orders.js:39`, `me/overview.js:23-24`, `manage.js:28`: unbounded by code |
| `batch()` returns `[]`; D1 returns a result per statement | Any code reading batch results would pass or fail differently (none today) |
| `run()` returns `{meta:{changes}}` only; D1 also has `last_row_id`, `duration`, `rows_read/written` | Code using those cannot be tested |
| Migration failures swallowed | See 1.3 |
| Different SQLite build and no D1 limits (statement size, CPU time, subrequest counts) | Limits behave only on the real service |
| Same-statement concurrency: single connection, no interleaving | "applied=0" guard races (`featured.js:77`) can only be reasoned about, not tested |

Recommendation: wrap the stand-in so `bind()` throws above 100 parameters, count statements per invocation, and fail the test on a swallowed migration (S).

### 2.5 Lint, types, dead code
- **No linter, formatter or type check** (`package.json` has only `test`). Handlers are dense one-liners (many lines over 250 characters), so review by humans is hard. Cheapest win: `node --check` over all files in CI and `eslint` with `no-unused-vars` and `no-undef` (S). A JSDoc `// @ts-check` pass on `_lib/featured.js`, `sponsor.js`, `orders.js` (the money code) is a good second step.
- **Unused exports** (script scan, exports not referenced outside their file): 36, for example `archive.js` `yearOf`/`isRemoved`, `changes.js` `logContest`/`teamEmails`, `contests.js` `prizesOf`/`trimmedAvg`, `mailtpl.js` `usedVars`/`safeVars`/`savedFor`/`plainOf`/`toInviteHtml`, `podium.js` `ownsHomeRow`/`isOrphanHome`, `util.js` `validHost`, `public/tour.js` `routeUrl`. Some are used inside their file only. About 20 CSS classes in `styles.css` are not referenced by `app.js`, `index.html`, `banner.js` or `tour.js` (rough count; other pages may use them). Low priority.
- `judges.token` and the `/_tmp_dummy` file remain (C18, C22).

### 2.6 Duplicated logic that must stay in sync

| Logic | Copies | Risk |
|---|---|---|
| Event plan eligibility and dates | `functions/_lib/featured.js` `eventPlanProblem`/`applyPlan` and `public/feature-plans.js` `planStatus`/`planWindow`/`eventEligibility` | No parity test. The client uses real Pacific time, the server UTC-8 (M3). A drift shows the buyer one price window and charges another |
| Sponsor seasons | **Single source**: `sponsor.js` imports `public/seasons.js`; the only extra constant is `SPONSOR_XMAS_END` | Good. The page reads the server quote (`/api/me/sponsor`), also good |
| Prices | `featured.js` only, served by `/api/config`; pages use config | Good. The Terms and the help articles (database rows from migrations 0168, 0174, 0175) restate rules and some amounts in prose; edited articles (`updated_by != 'seed'`) never get updates, and every price change needs a new help migration |
| Counties | `util.js:11`, `scripts/validate-migrations.mjs:27`, plus admin/app lists | Three copies; they must change together for any expansion |
| "30 days", "90 days", "30 days before" | `featured.js`, `feature-plans.js` (`open = 30` default), Terms, Help | Parity by hand (`terms.test.mjs` covers some) |
| Today in Pacific time | 14 copies | M3 |
| Email address `info@socallights.app` | 19 files in `functions/` and `public/` | One constant would do |
| City list vs events | `public/cities.js` (CITY) vs `events.city` values | `app.js:1400` adds any event city missing from CITY at the event's own point; `contests.js:66` falls back to **Irvine** for an unknown city |

### 2.7 Error handling, logging, config
- **JSON error shape is consistent**: `err(status, message)` gives `{error}` at 376 call sites; only 2 handlers build their own JSON response. `/api/*` unknown paths return JSON 404. Good.
- **No global error boundary**: `functions/_middleware.js:15` awaits `next()` with no try/catch, so an unhandled exception gives Cloudflare's HTML 500 page and no log line; clients that call `res.json()` then fail in an unrelated way (this is part of M2). `wrangler.toml` has no `[observability]` block, so `console.error` output is not retained. Only 9 `console.*` calls; 46 empty `catch {}` and 50 `.catch(() => {})` in `functions/`. The `ops_log` table plus the admin digest is a reasonable substitute for the important cases (email, webhook) but not for the rest.
- **Config validation**: none at startup. 20 environment variables are read ad hoc (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET`, `ACCESS_*`, `MAIL_POSTAL_ADDRESS`, `ADMIN_NOTIFY_EMAIL`, `GEOAPIFY_KEY`, `ALERT_CRON_KEY` ...). A missing one degrades quietly (sign-in 503, webhook 400, digest not sent). Add an Admin page or `/api/admin/health` that lists which are set (names only) (S).
- `DEV_AUTH` and `ADMIN_DEV_BYPASS` are restricted to `localhost`; fine.
- HEAD on a GET-only function returns the JSON 404 (`curl -I /api/events` gave 404): an uptime tool using HEAD would see a false outage (Low).

### 2.8 Dependencies, build and deploy safety
- `package.json`: one devDependency, `wrangler 4.40.0` (pinned, lockfile in step). The previous audit recorded the latest as 4.157.0; I could not reach the registry from here, so freshness is unverified. `compatibility_date = "2025-09-01"`. No runtime dependencies. `app/` (Capacitor 7) has caret ranges and no lockfile in the audited tree.
- **No staging environment.** Pages preview deployments (every PR) are built from the same `wrangler.toml` bindings; whether the Preview environment uses the production D1 and R2 is dashboard-only and unverified. If it does, a PR preview can write to production. The previous audit raised this (S item 16).
- **Rollback**: no document mentions rolling back a deploy (grep of `docs/*.md`, `docs/runbooks`, README). Code can be rolled back in the Pages dashboard (previous deployment) but migrations are forward-only, so a rollback after a destructive migration needs Time Travel (`docs/runbooks/backup-restore.md` covers restore). Write a 10-line "bad deploy" runbook (XS).
- **CI workflows** (`.github/workflows/`): 10 files. Actions are pinned to `@v4`/`@v5` tags, not SHAs (C15). `Tests` runs `npm run validate` with `--check-urls` (outbound requests in a PR check: a source site being down fails an unrelated PR).
- **H2 detail.** `uptime.yml` cron `*/15`; GitHub run times in the last 36 hours: 09:13, 01:49, 21:36, 15:44, 07:16, 00:24 (UTC, Nov 5 to 6) and 19:15, 19:09 (Nov 4): about one run per 6 hours. `submission-digest` runs 3 times a day on its own cron and lands at 10:24, 01:52, 21:20, 10:22 ... so scheduled workflows run late and sometimes not at all. `backup.yml` has run 3 times, all `workflow_dispatch` (2 failed while the R2 permission was added, the last succeeded 03:32Z Nov 6); the scheduled run due 10:17Z had not appeared at 11:07Z. Fix: add a second, independent probe (a free external uptime service on `/api/events` with GET), have the backup job write a heartbeat row the digest checks ("no backup in 36 hours" = alert), and state the real cadence in the docs.

### 2.9 Docs accuracy
- `CLAUDE.md:43` says contests and sign-in are "branch work, not live yet". Both are live (status.md, 0156+ migrations, live `/api/config`). Misleads a new session.
- `README.md` step 4 still describes pasting `0001_init.sql` and `0002_seed_events.sql` ("50 events"); the database has 199 migrations and 1,254 events. Use `npm run db:migrate:remote`.
- `docs/status.md` is 541 lines with the "Start here" banner repeated mid-file; newest sections are first but the order is not strict. A "current state" page of 40 lines would serve better.
- `docs/operating-guide.md` still carries the 2026-10-30 date noted in C23; the new `docs/runbooks/backup-restore.md` is good and accurate against `backup.yml`.
- 45 files in `docs/`; several are one-time plans (`help-center-plan.md`, `video-prompt-*.md`, `contest-demo.md`).

### 2.10 Repo hygiene
- **No LICENSE** in a public repository (all rights reserved by default; fine if intended, but state it).
- **Size**: the Git pack is 661 MiB; `public/` is 475 MB, almost all `public/tutorials/*.mp4` (largest 19.6 MB). Every Pages deploy carries them and every clone downloads them (previous audit item, still open). Move to R2 or a video host.
- **Branches**: 215 remote branches (94 `claude/*`, 121 others, oldest 2026-10-26) and 15 agent worktrees under `.claude/worktrees`. Delete merged branches (GitHub setting "Automatically delete head branches"), prune worktrees.
- `.gitignore` is minimal (`node_modules`, `.wrangler`, `.dev.vars`, `.DS_Store`, `public/tutorials/_review/`); `.claude/worktrees` is not listed. `_tmp_dummy` still at the root (C22).

---

## 3. Architecture at 10x and national scale

| ID | Sev | Finding | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| H3 | High | Free-tier ceiling: 100,000 Function requests a day, about 9 per map visit | `public/_routes.json` sends `/` and `/api/*` to Functions; `app.js:1397` (events, posts, config), `banner.js:73`, `:24`, `hit.js` (`/api/visit` x2 to 3), `app.js:1155` (auth/me), `functions/index.js` for `/`; edge-cache hits still count as invocations | About 10,000 visits a day exhausts the quota; every API then fails until midnight UTC. A national launch or a viral share is the likely trigger, and it hits the paid-placement customers too. | Serve events and posts as static JSON built on change (R2 or a Pages asset refreshed by the migrate workflow) so the map costs 1 to 2 invocations; batch the three beacons into one; confirm the plan and consider Workers Paid ($5 a month, 10 million requests) before any launch. | M |
| M7 | Medium | Single D1 database, single region, and every public page reads it | `wrangler.toml` one `DB`; events list is `SELECT *` over all rows | At 10x events (12,000) the list is about 6 MB raw before the edge copy, far beyond what phones should download in one go; D1 reads per rebuild scale with it. | Query by viewport or region (`/api/events?bbox=` or per-metro files); keep the current shape for small regions. | L |
| M8 | Medium | Southern California is hard-coded in many places | `public/cities.js` (CITY, SoCal only); `util.js:11` and `validate-migrations.mjs:27` (7 counties, plus a Southern California coordinate box as a deploy gate); `app.js:23` `SOCAL` bounds; `util.js:180` geocoder query appends `, CA` (Nominatim restricted to `countrycodes=us`; the Census geocoder is US-wide but the `, CA` suffix biases or breaks other states); `submit.js:70`, `homes.js:61`, `addflow.js:86` build `", CA " + zip`; `contests.js:66` unknown city falls back to Irvine; 14 copies of the UTC-8 offset plus `America/Los_Angeles` in `app.js:26`, `sitemap.xml.js:7`, `alerts/send.js:14`, `posts.js:11` | A second metro (Phoenix, Seattle, Austin) cannot be added without edits in about 15 files; events in another time zone get a wrong "today" and wrong expiry; the validator would reject them as outside the box | Add `regions` (key, name, bounds, tz, states, counties) as a table and `/api/regions`; replace the constants with lookups; pass `tz` through `pacificToday()` once M3 is done. Plan it before the first non-California event is accepted. | L |
| M9 | Medium | Worker subrequest cap (50 per invocation on Free) vs sequential email and R2 loops | `functions/api/contests/[slug].js:188` sends up to 200 results emails in one `waitUntil`, each through `sendTemplate` (a settings read plus a Resend call), ending in `catch {}` at `:196`; `_lib/account.js:18` deletes photos one by one; `contest-remind.js:9` CAP 150 | If the account is on Free, a contest with more than about 20 entrants gets truncated result emails with no log (C13 persists, and the organizer's "sent" count is the only hint). On Paid the limit is 1,000 and this is fine | Confirm the plan. Either way: send in chunks of 20 per invocation using a queue table and the daily cron (the weekly alert already batches 20, `alerts/send.js:7`), and log the unsent remainder in `ops_log` | M |
| M10 | Medium | Seasons are one national calendar | `public/seasons.js` windows by month-day; `sponsor.js:23-27` hard-codes the Christmas sponsor end `01-06` and Jan 7 start | Fine for the United States holidays. Southern-hemisphere or other-country seasons, or region-specific windows (Diwali, Lunar New Year dates vary by year), need per-region tables | Move windows to the regions table when M8 is done | M |
| M11 | Medium | Single owner and single point of administration | CLAUDE.md: Access owner `rey@forza-tek.com`; GitHub org one maintainer; `enforce_admins` false; Stripe and Cloudflare account recovery undocumented | One lost account stops payments, deploys and refunds (C23, unchanged) | Add a second Access admin and a second GitHub owner; document account recovery | XS |
| M12 | Medium | Geocoder dependencies are free public services | `util.js:178-204`: US Census then Nominatim with a 4 s timeout each and the owner's address in the User-Agent | Nominatim's policy forbids heavy use (one request a second); a surge of submissions can be refused and `info.down` sends the user to manual placement | Add a paid or self-hosted geocoder behind the same function (the key variable `GEOAPIFY_KEY` already exists in 6 places) | S |
| L4 | Low | Plan copy and Help articles live in the database | migrations 0168, 0174, 0175 | A rule change after the owner edited a help article is never applied | Link Help to `/api/config` values or show a "check price" note | S |

### Biggest single points of failure, in order
1. The Workers request quota (H3) and the single D1 database.
2. Cloudflare Access plus one owner account (admin tools, M11).
3. Stripe webhook secret and the one endpoint (a wrong secret rejects every payment with 400; nothing alerts except the weekly digest; the digest depends on a GitHub cron that runs late, H2).
4. Resend: one provider for sign-in codes, receipts, results and the owner digest; a failure is logged but sign-in then returns the generic failure.
5. GitHub Actions as the only scheduler (uptime, backup, digest, reminders, alerts) and the only deploy path for schema.

---

## 4. Low-severity list (not ranked above)

| ID | Item | Evidence |
|---|---|---|
| L5 | HEAD requests to GET-only functions return JSON 404 | `curl -I https://socallights.app/api/events` |
| L6 | `/api/events/<id>` 404s are not cached; enumerating ids hits D1 each time | `functions/api/events/[id].js:19` |
| L7 | `checkoutLimit` check-then-insert is racy (small overshoot) | `functions/_lib/stripe.js:7-12` |
| L8 | No timeout on the Stripe API fetches (checkout, dispute lookup) | `stripe.js:17`, `stripe-webhook.js:62` |
| L9 | `todayPT`-style helpers duplicated in client and server (see M3) | - |
| L10 | Wrangler and compatibility date a year old | `wrangler.toml:3`, `package.json` |
| L11 | License, `_tmp_dummy`, dead exports, stale branches | 2.5, 2.10 |

## Recommended order
1. This week (XS to S): H1 (one helper plus tests), M1, M2, M3, assert migration failures in tests, fix CLAUDE.md line 43 and README step 4, bump `?v=` tags for imports (M5), a GET-based external uptime probe (H2).
2. Next (M): confirm the Workers plan, then H3 (static event JSON) and M9 (chunked mail), a Playwright smoke in CI (M6), additive-migration rule or deploy-after-migrate (M4), rollback runbook, second admin.
3. Before any non-California event is accepted (L): the regions table (M8, M10) and viewport queries (M7).
