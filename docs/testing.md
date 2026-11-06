# Testing

Last reviewed 2026-11-06 (after the engineering audit of 2026-11-07, "test gaps" and M3).

## How to run

```sh
npm install
npm test                 # about 350 tests; 15 to 30 seconds (the validator tests start a child process per case)
node --no-warnings --test tests/signin.test.mjs     # one file
npm run validate         # migration check for files added since origin/main (also runs in CI, with source URLs)
node scripts/validate-migrations.mjs --history --from 0170   # replays every migration (about 9 s), by hand only
```

CI runs `npm test` and `npm run validate` as the **Tests** check; `main` requires it. Node 22.13 or newer (built-in `node:sqlite`). No network is used: every test that would reach Stripe, Resend, Google, Turnstile, a geocoder or an event page stubs `fetch` (`stubFetch` in `tests/_pay.mjs`); the validator test uses a throwaway server on 127.0.0.1.

## The stand-in database (`tests/_d1.mjs`) and shared helpers (`tests/_pay.mjs`)

`makeDB()` applies **every** file in `migrations/` to an in-memory SQLite (`node:sqlite`) and returns `{ DB, raw }`: `DB` has the D1 API the code uses (`prepare().bind().all/first/run`, `batch`), `raw` is the SQLite handle for seeding and asserting.

What it does faithfully:
- The real schema and the real SQL in `functions/` (no mocks of queries).
- A migration that does not apply **throws** (it used to be swallowed into an array nobody read). If this fails, report it and add a new migration; never edit an old one.
- D1's 100 bound parameters per query and 100 KB per statement (throws like D1), and counts every query as one outgoing call (`DB.stats.calls`, `DB.stats.reset()`); a `batch` is one call and one transaction (rolled back on error). Tests assert paths stay under the Free-plan 50-call cap.

What it cannot do (know this before trusting a green run):
- **No concurrency.** One synchronous connection; interleaved awaits reproduce read-then-write races, but not real multi-connection or multi-isolate contention (`signin-attempts.test.mjs` says so).
- SQLite is not D1: error message text, `meta` fields other than `changes`, row/size/CPU limits other than the two above, and `datetime('now')` (the real clock, not `Date.now()`; code that mixes both cannot be frozen consistently) are different.
- No Cloudflare runtime: no `waitUntil` scheduling (tests pass their own), no edge cache (`caches.default` is only exercised where a test provides one), no 10 ms CPU limit, no request/subrequest limits except by counting calls.
- R2 is a hand-written in-memory object (`tests/submit.test.mjs`, `limits-r2.test.mjs`); Stripe, Resend, Google, Turnstile and geocoders are stubs, so request and response shapes are only as right as the stub. **Nothing here proves real email, payment or sign-in works.**
- Browser code (`public/*.js`) is not run; only the pure ES modules are (see "Not covered").

Helpers: `newEnv()` (env with DB), `addUser()` (user plus a session cookie), `addEvent()`, `stubFetch(reply)` (records calls, restores), `freezeNow(iso)` (freezes `Date.now()` only), `ptToday(offset)` (Pacific date). `tests/pacific-time.test.mjs` has `at(iso, fn)` which freezes both `Date.now()` and `new Date()`.

## Time

The server's "today" is the Pacific calendar date from `functions/_lib/time.js` (`ptToday()`, `ptDate(ms)`, `shiftDay(ymd, n)`), daylight saving included. Never write `Date.now() - 8 * 3600_000` again: `tests/pacific-time.test.mjs` fails if a fixed offset appears under `functions/`. Boundaries tested: 07:00Z (PDT midnight), 08:00Z (PST midnight), both clock changes, new year.

## What is covered (by file)

| Area | Tests |
|---|---|
| Email sign-in request, code hash and 10-minute expiry, per-address (4/h) and per-IP (12/h) caps, Turnstile, throwaway and suspended addresses, dev code only on localhost, verify, single-use code, session cookie flags and hashing, session expiry, same-person spellings; Google start/callback state, `safeNext`, unverified email, hostile picture, suspended | `signin.test.mjs`, `signin-attempts.test.mjs` (5 tries per code under parallel guesses, 30 verifies/h) |
| Admin Access JWT (`requireAdmin`): valid, audience string or list, wrong audience, expired, wrong issuer, bad signature, unknown key id, tampered payload, no header, not configured, certs endpoint down; `ADMIN_DEV_BYPASS` only on `localhost` | `admin-gate.test.mjs` (real RSA key, stubbed certs) |
| House and installer posts (`submit.js`): sign-in, validation, geocode hit / failure / far match, auto-publish, spam hold, installer profile, rate limits | `submit.test.mjs` |
| Add event (`submit-event.js`): sign-in, same origin, validation, geocode failure, page check (confirmed vs expected), duplicate, rate limits, daily auto-publish valve | `submit.test.mjs` |
| Contest creation (season, categories, trust notes, official-sounding hold, 3/day, judges), windows, announce (frozen snapshot, one write, locked, queued emails, podium with ties, confirmation prompts) | `contests.test.mjs` (plus `organizer-entries`, `limits`, `featured-homes` for entries, mail volume and podium purchases) |
| Event organizer tiers (quotes, caps, additive upgrades, webhook, refund/restore of the banner date, /api/banner event pills, admin floor, copy), installer Top of the list (quote, apply, upgrade, refund, banner vs card counts, top-only renewal) | `event-tiers.test.mjs`, `installer-top.test.mjs`, `sponsor-renewal.test.mjs` |
| Pacific time: Featured expiry, contest windows, events ended cutoff, counters, digest day and renewal window, submit-event end date | `pacific-time.test.mjs`, `featured-window.test.mjs` |
| Migration validator (`scripts/validate-migrations.mjs`): upsert/new/updated/removed, bad dates, hard vs soft rules, mass delete, destructive SQL, filenames, SQL errors, `--gate`, `--check-urls` (local server), `--base` with edited/deleted old migrations | `validate-migrations.test.mjs` |
| Every `functions/**/*.js` imports; route files export only valid handler names; every `public/**/*.js` parses; every `<script src>` exists | `smoke.test.mjs` |
| Pure browser logic: `norm.js` (also the server's field cleaning), `seasons.js`, `rules.js`, `sponsor-plans.js`, plan status and windows on the page against the server's checkout rule on a grid | `frontend-logic.test.mjs` |
| Payments, webhook, orders, refunds, sponsor rules and renewals, limits, mail outbox, alerts, privacy deletion, terms text, caching, event pages | the other files in `tests/` |

## Not covered (be honest in reviews)

- `public/app.js` (about 1,400 lines, no exports), `public/admin/*.js`, the other `public/*.js` that touch the DOM (`addflow`, `forms`, `banner`, `chrome`, `auth`, `tour`...), `public/sw.js` (cache names are bumped by hand), CSS, and every HTML page. The only browser check is manual (`docs/browser-pass.md`). Making `app.js` testable needs it split into modules; it was not touched here.
- Server routes with **no direct test**: `api/me/*` (profile, avatar, homes and events edit/delete, overview, badges), `api/drafts`, `api/help/*`, `api/address`, `api/report`, `api/posts/[id]/on`, `api/photo` and the contest/admin photo routes, `api/auth/me` and `logout`, `api/installers` (list, logo, hit), contest `changes`, `export`, `hit`, `judges`, `mine`, `nudge`, `sponsors`, `staff`, `stats`, `votes`, page routes `c/*`, `help/*`, `installer/*`, `past/index`, and most `api/admin/*` (claims, contests, emails, export, help, installers, log, mailpreview, normalize, overlaps, posts, reports, search, submissions index, users). Several are touched indirectly by other tests; nothing asserts their behavior.
- Admin endpoints are not tested for the Access gate one by one (the gate itself is; a route that forgets to call `requireAdmin` would not be caught: add a test that walks `functions/api/admin/**` and expects 401 without a token).
- Real services: Stripe live behavior, Resend delivery and quotas, Google OAuth, Turnstile, Census/Nominatim geocoders, R2, D1 limits and contention, Cloudflare cache, WAF and Access configuration, Pages deploys. Workflows in `.github/workflows` are not tested (they are the monitoring; see the operations audit).
- Concurrency (two requests at once on real D1), CPU time against the Free plan's 10 ms, and the 50-subrequest cap by actual enforcement (counted only).
- The validator's `--history` mode, and anything that needs a live database (is every migration applied in production: not checkable from the repo).
- Time: client `public/addflow.js` still computes "today" with a fixed UTC-8 (`today` at line 10); the front-end owner should switch it to `Intl` (`feature-plans.js` already does).

## Checklist: paths that must have tests when you change them

Change one of these and the change is not done until a test in the same PR covers it (add to the file named, or a new `tests/<area>.test.mjs`).

- [ ] **Anything that decides what day it is** (`time.js`, Featured windows, contest windows, event cutoffs, counters, renewals): a case at a PDT and a PST midnight in `pacific-time.test.mjs`. Use `ptToday()`, never an offset.
- [ ] **Sign-in and sessions** (`_lib/auth.js`, `api/auth/**`): `signin.test.mjs` and `signin-attempts.test.mjs`. Redirect targets go through `safeNext`; code attempts must stay atomic.
- [ ] **Admin access** (`requireAdmin`, `/api/admin/**`): `admin-gate.test.mjs`; every new admin route must refuse without a valid token.
- [ ] **Money** (`featured.js`, `stripe.js`, checkout, webhook, orders, refunds, sponsor): the payment test files, with server-side prices only and a refund flag on every path that removes a paid placement.
- [ ] **Public forms** (`submit.js`, `submit-event.js`, contest creation/entries, installer posting): validation, the limits (per hour, per day, per account), the failure of each outside service (geocoder, page check, R2, mail), and who owns the saved row.
- [ ] **Contest lifecycle** (announce, results, voting windows, judging, deletion): `contests.test.mjs`, `organizer-entries.test.mjs`; results are frozen and read from the snapshot.
- [ ] **Anything that sends many emails or makes many calls** (alerts, results, reminders, invitations, mail drain): a `limits`-style test asserting the number of outgoing calls stays under 50, with `DB.stats.calls`.
- [ ] **Migrations**: `npm run validate` locally; changes to `scripts/validate-migrations.mjs` need a case in `validate-migrations.test.mjs`. Never edit an old migration.
- [ ] **Deleting or exporting personal data** (`account.js`, `retention.js`, removal): `privacy.test.mjs`.
- [ ] **A new file under `functions/`**: nothing to do for the smoke test (it finds it), but a syntax error or bad import there now fails CI; route files may export only `onRequest`, `onRequestGet/Post/Put/Patch/Delete/Head/Options`.
- [ ] **`public/styles.css` or `public/app.js`**: bump the `?v=` tag in `public/index.html` (`asset-versions.test.mjs` checks it); logic you extract into an ES module without DOM use can be added to `frontend-logic.test.mjs`.
- [ ] **A bug fix**: a test that failed before the fix.

## Known bugs found while writing these tests (see `docs/status.md` for state)

- `functions/api/submit.js:100` and `:112`: photos are uploaded to R2 before the per-account daily limit check; that 429 returns without deleting them, so refused posts leave orphan files in `pending/`. Test marked `todo` in `submit.test.mjs` (flip it to a normal test when fixed).
- `functions/_lib/util.js:153`: an Access token with no `exp` claim is accepted (`payload.exp && ...`). Cloudflare always sets `exp`, so low risk; the test documents it.
- `submit.js` and `submit-event.js` have no Turnstile or honeypot field (sign-in replaced them); the 5 per hour per connection limit and the daily caps are the only throttle for a signed-in account.
