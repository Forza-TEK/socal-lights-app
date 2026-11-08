# Security audit, SoCalLights.app (2026-11-04)

Scope: repo `main` at adb35b3 (read-only) and https://socallights.app (unauthenticated GETs, empty or invalid POSTs only; no records created). Cloudflare Pages project config read through the API (variable names only). Items marked **(unverified)** were reasoned from code and not exercised.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 10 |
| Info | 4 |

Headline: one stored XSS (installer profile page) that needs only an ordinary account and is made worse by the total absence of a CSP. Admin gating, IDOR protection and SQL parameter binding are solid. Most remaining issues are hardening and abuse controls.

## Findings (ranked)

| ID | Sev | Area | Evidence | Impact | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| S-01 | High | XSS | `functions/installer/[slug].js:33` puts `JSON.stringify(inst.name)` inside an inline `<script type="module">`. `JSON.stringify` does not escape `<`, so a name containing `</script><script src=//x/a></script>` ends the script block. Name source: `findOrCreateInstaller` (`_lib/installers.js:9`, only `clean(name,80)`), reachable by any signed-in account via `/api/submit` (`biz` with kind=installer, or `installer_name` on a homeowner post); the profile page is live immediately (`status` default 'active'). Local check: `JSON.stringify("</script><script src=//a.bc/x></script>")` is unchanged. No CSP is served (S-02). Not exercised live (would create a record). | Stored XSS on a public URL. Runs as the visitor: can call same-origin APIs (vote, create contests and invites, `DELETE /api/me`). If an admin opens the link, the script can call `/api/admin/*` with the admin's Access cookie (export users, delete records). | Escape for script context everywhere: `JSON.stringify(x).replace(/</g,"\\u003c")` (shell.js already does this for JSON-LD; make a shared helper and use it in `installer/[slug].js:33`, `help/[slug].js:15,24`, `helpui.js:68`). Reject `<` `>` in installer/business names on write. Add a CSP (S-02). | S |
| S-02 | Medium | Headers | Live: `/` has nosniff, Referrer-Policy, Permissions-Policy; **no** CSP, X-Frame-Options/frame-ancestors, or HSTS. `/installer/*`, `/in/*`, `/help`, `/sitemap.xml`, `/api/*` carry none of the `_headers` values (Pages `_headers` applies to static assets only, not Function responses). | No defense in depth against XSS (S-01); clickjacking of vote, delete-account and checkout flows; function responses lack nosniff and referrer policy. | Add `functions/_middleware.js` that sets nosniff, Referrer-Policy, frame-ancestors/X-Frame-Options, and a CSP (start Report-Only; needs allowances for unpkg, fonts.googleapis/gstatic, challenges.cloudflare.com, tiles.openfreemap.org and the inline scripts or nonces). Enable HSTS in Cloudflare (SSL/TLS > Edge Certificates). | M |
| S-03 | Medium | Open redirect | `_lib/auth.js:93` `safeNext` blocks `//` and `\` but not tab/newline. `next=/%09/evil.example` is accepted: live `/api/auth/google/start?next=/%09/evil.example` set cookie `scl_oauth=...%7C%2F%09%2Fevil.example`. Callback (`google/callback.js:13,19`) sends it as `Location`; browsers strip the tab, giving `//evil.example`. Local `new URL("/\t/evil.example","https://socallights.app")` resolves to `https://evil.example/`. End-to-end login not run. | Post-login redirect to an attacker site from a trusted sign-in link (phishing). | Parse instead of prefix-match: reject `/[\u0000-\u001f\u007f\\]/`, then require `new URL(n,origin).origin===origin` and return pathname+search+hash. | S |
| S-04 | Medium | Authz / identity | Installer profile takeover or squat. `installers/[slug]/claim.js:18` auto-grants ownership when the claimer's email domain matches `inst.web`, but `web` is user-supplied: homeowner `installer_web` (`submit.js`, creation path) or a trusted `kind=installer` post that fills blank `web`/`phone`/`area`/`email` on an existing same-name profile (`_lib/installers.js:11-15`). Quote requests go to `owner_email \|\| email` (`installers/[slug]/quote.js:12`). | Someone can pose as another company, receive its quote leads (name, phone, email) and edit its public page. | Do not auto-claim from unverified `web`; never fill `email` on an existing profile from a post; make name-matched joins and claims go through admin confirmation until the site is verified. | M |
| S-05 | Medium | Abuse / email | `contests/[slug]/invite.js` sends `contest_invite` to up to 50 addresses per call with **no counter** (only auth + `ownerOf`). Any account can create 3 contests/day that go live immediately (`contests/index.js:44`). Judge invites (`judges.js`, 15 at create) and `contest_quote` also email arbitrary addresses. Mail is sent from the site's own domain. | Spam/phishing relay with the site's sending reputation (Resend suspension risk). | Per-user and per-contest daily caps (for example 100 recipients/day), dedupe against recent sends, require account age or admin-approved contest before invites. | S |
| S-06 | Medium | Email injection | `_lib/mailtpl.js`: values are substituted into the template (`fill`, line 188) **before** markdown-style parsing, so user text like `[Verify your account](https://evil)` in `note` (invite), `title`, `biz`, `reason` becomes a branded clickable button/link. Bare URLs are auto-linked, and `esc()` (line 213) does not escape `"`, which is used inside `href="..."` (lines 214, 221). Verified by reading, not by sending. | Branded phishing content delivered by SoCal Lights to arbitrary recipients (with S-05) and to organizers/installers. | Escape markdown/URL syntax in substituted variable values (or render variables after parsing as text); add `"` to `esc`; restrict links to https and to the site's host for user-supplied values. | M |
| S-07 | Low | Auth | `auth/email/verify.js:12-16`: attempt counter is read, then incremented after the compare, so parallel guesses can all pass the `tries >= 5` check (race, **unverified**). Each new code resets the budget (4 codes/email/hour). 6-digit code, 10-minute life; no per-IP limit on verify. | Small per-hour success chance by burst guessing; account takeover only with luck. | Atomic `UPDATE ... SET tries=tries+1 WHERE id=? AND tries<5 RETURNING` before comparing; invalidate older codes when a new one is issued; add per-IP verify limit. | S |
| S-08 | Low | CSRF | No `/api/admin/*` route calls `sameOrigin` (`_middleware.js` only checks Access); handlers parse JSON regardless of content-type. Protection relies on the Access cookie not being sent cross-site (SameSite value **unverified**). Public POSTs without sameOrigin (`/api/submit`, `/api/report`, `/api/help/*`, `posts/[id]/on`, `visit`, hit routes, alerts) are harmless or cookie-gated (submit needs the Lax cookie). | Possible cross-site admin actions if Access cookie were SameSite=None. | Add `sameOrigin` plus a JSON content-type requirement to the admin middleware for non-GET; check the Access app's cookie SameSite setting. | S |
| S-09 | Low | Supply chain | `public/index.html:31,81` and `public/admin/index.html:11,44` load maplibre-gl@4.7.1 from unpkg.com with **no SRI**; admin page included. Other hosts: fonts.googleapis.com, fonts.gstatic.com, challenges.cloudflare.com, tiles.openfreemap.org. | A compromised CDN response runs script in the admin origin. | Self-host maplibre in `public/vendor/` (already has qrcode.js) or add `integrity` and `crossorigin`. | S |
| S-10 | Low | Rate limit | `api/alerts/index.js`: only a global limit (60 sign-ups/hour), no per-IP or per-email limit; sends a confirmation email each time for unconfirmed addresses; response `already:true` reveals confirmed subscribers. Turnstile is on (secret present in production). | Attacker can exhaust the global quota (blocks real sign-ups), bomb a victim's inbox, or probe who is subscribed. | Per-IP and per-email limits; uniform response. | S |
| S-11 | Low | Abuse | Voting (`vote.js`) is per account only; accounts cost one working mailbox (catch-all domains, aliases; `DISPOSABLE` list is 18 domains; +tag and Gmail dots are normalized). Organizers can see voter emails and a burst flag only. | Vote stuffing in contests. | Velocity and domain-clustering checks, per-IP soft limits, larger disposable list. | M |
| S-12 | Low | Privacy | `_lib/account.js` deletion leaves: `alert_subs`, `email_prefs`, `contest_leads` (name, email, phone), `judges.email`, `contest_staff` rows in others' contests, `event_claims`, `listing_changes.by_email`, `installers.owner_email/email`. A later sign-up with the same email regains installer ownership and co-organizer rights. | Incomplete erasure; stale privileges by email. | Delete or blank these rows by email/user id (keep financial `feature_orders` with a documented retention reason). | S |
| S-13 | Low | Moderation | Homes and events auto-publish with only a keyword regex and daily caps (`submit.js:13`, `submit-event.js:13`). Event "verification" (`_lib/events.js:25`) trusts any page containing the name and year, so an attacker page forges "confirmed". `contests/[slug]/mine.js:30` lets an entrant rename an approved entry without re-review. User-supplied http(s) links go straight onto the map. | Link spam and phishing links on a trusted site. | Hold first-time accounts' links for review; re-review edits to approved entries; do not treat self-hosted pages as proof. | M |
| S-14 | Low | Uploads | `submit.js:23-29`, `sponsors.js`, `logo.js`: magic-byte sniff on first 12 bytes only; no decode/dimension check; **no EXIF/GPS stripping on the server** (relies on browser resize, bypassable). `me/avatar.js:25` checks only the declared Content-Type, no magic bytes. Limits OK: 8 files, 6 MB each; SVG not accepted; types stored from sniffed value. | Location metadata in originals served at `/api/photo/p/...` (cached immutable, 1 year); polyglot files. | Re-encode or strip metadata server-side (Cloudflare Images/`cf.image` or a Worker transform); sniff avatars. | M |
| S-15 | Low | Config | `verifyTurnstile` fails open when `TURNSTILE_SECRET` is unset (`_lib/util.js:83`). Pages **preview** config has no `TURNSTILE_SECRET`/`RESEND`/Google vars but binds the **production** D1 and R2 (`DB`, `PHOTOS`); preview URLs are public. | Anonymous endpoints on preview deployments skip Turnstile and write to production data. | Fail closed in production; bind separate D1/R2 for preview or protect preview hosts with Access. | S |
| S-16 | Low | Hygiene | `.github/workflows/android-keystore.yml` uploads the keystore and its password in one artifact (1-day retention). Actions are tag-pinned (`@v4`), first-party only. `android-app.yml:26` and `ios-app.yml:35` interpolate `inputs.*` into shell (dispatch by writers only). `_tmp_dummy` (empty) is tracked. Workflow `alerts.yml`, `contest-reminders.yml`, `submission-digest.yml` have no `permissions:` block (default token scope). | Minor. | Split password from keystore; add `permissions: {}` per workflow; pin actions to SHAs; delete `_tmp_dummy`. | S |
| S-17 | Info | Admin | `requireAdmin` (`_lib/util.js:114`) verifies RS256 signature against the team JWKS, `aud`, `exp` (only if present), `iss`; fails closed when `ACCESS_*` unset. Authorization is "anyone Access admits" (no email allowlist in code). Cron routes compare `x-alert-key` with `!==` (not constant time). | None today. | Optional: allowlist `ADMIN_EMAILS`; require `exp`; constant-time compare. | S |
| S-18 | Info | Identity | `normEmail` strips `+tag` for every domain, so `alice+x@corp.com` and `alice@corp.com` are one account; `okEmail` accepts `<` `>` characters. | Rare collisions. | Strip `+tag` only for Gmail; tighten regex. | S |
| S-19 | Info | Misc | `/api/address` is unauthenticated and unthrottled (Geoapify quota; cache only helps repeated queries). GET links change state (`alerts/confirm`, `alerts/unsubscribe`, `installers/confirm`), so mail scanners can trigger them (token-gated). Sessions last 30 days with no "sign out everywhere". | Quota exhaustion; accidental confirm/unsub. | Per-IP limit; confirm via POST page. | S |
| S-20 | Info | Privacy | Organizers and co-organizers see voter emails (disclosed in `public/privacy.html`). Any signed-in user can become an organizer instantly. | Accepted by policy; note for review. | Consider masking. | S |

## Route inventory (functions/)

Guards: **U** = `requireUser`/`getUser` 401, **A** = Cloudflare Access via `admin/_middleware.js` (verified live: 302 to Access), **SO** = `sameOrigin`, **T** = Turnstile, **K** = `x-alert-key`, **W** = Stripe signature, **tok** = unguessable token in URL, **none** = public.

| Route | Methods | Guard | Notes |
|---|---|---|---|
| `api/admin/**` (all 40 files: claims, contests, counts, dashboard, emails, events, export, help, installers, log, mailpreview, me, normalize, overlaps, photo, posts, reports, search, submissions, users) | GET/POST/PUT/DELETE | A (middleware) | No SO on mutations (S-08) |
| `api/admin-digest`, `api/alerts/send`, `api/contest-remind` | POST | K | 401 live |
| `api/stripe-webhook` | POST | W (HMAC, 5 min tolerance, event-id dedupe) | 400 live |
| `api/auth/email/start` | POST | SO, T, per-email 4/h, per-IP 12/h | |
| `api/auth/email/verify` | POST | SO, 5 tries/code | S-07 |
| `api/auth/google/start`, `callback` | GET | state cookie | S-03 |
| `api/auth/logout` | POST | SO | |
| `api/auth/me` | GET | getUser | no-store |
| `api/me/*` (index DELETE, avatar, badges, claims, events/[id], featurable, homes/[id], overview, profile) | GET/POST/DELETE | U (+SO on writes; GET `homes/[id]`, `overview`, `featurable` no SO, read only) | Ownership by user_id or verified email |
| `api/drafts`, `drafts/[id]` | GET/POST/DELETE | U, SO, `user_id` in every query | |
| `api/contests` | GET none; POST U+SO | create: 3/day | |
| `api/contests/[slug]` | GET public (+owner extras); PATCH U+SO creator only | | |
| `contests/[slug]/{manage,stats,changes,export,votes,photo}` | GET | U + staff (`ownerOf`) | votes POST SO |
| `contests/[slug]/{entries/[id],invite,nudge,judges,sponsors}` | POST/DELETE | U + staff + SO | invite uncapped (S-05) |
| `contests/[slug]/staff` | GET staff; POST/DELETE creator only | U + SO | |
| `contests/[slug]/judge` | GET/POST | U + judge row + SO | |
| `contests/[slug]/vote` | POST | requireUser + SO | |
| `contests/[slug]/mine` | PATCH/DELETE | U + `user_id` + SO | |
| `contests/[slug]/quote` | POST | U + SO, 2/day | |
| `contests/[slug]/hit` | POST | **none** | counter, no SO |
| `installers` (list), `installers/confirm` | GET | none / tok | confirm changes state on GET |
| `installers/[slug]/{claim,manage,logo,quote}` | POST etc. | U + SO (+ `owner_email` for manage/logo) | S-04 |
| `installers/[slug]/hit` | POST | **none** | counter |
| `feature/checkout` | POST | requireUser + SO + `ownsEvent` | |
| `submit` | POST | getUser (cookie), IP 5/h (60 for contests); **no SO**; Turnstile imported, unused | cross-site POST has no Lax cookie |
| `submit-event` | POST | U + SO, IP 5/h, 8/day/user | |
| `report`, `help/contact` | POST | **none**, IP 5/h (shared `submit_log`) | |
| `help/vote` | POST | **none**, per-fingerprint and 200/h/article | |
| `help/search`, `events`, `posts`, `photo/[[path]]`, `archive`, `config`, `address` | GET | none | photo key regex-locked to `p/<id>/<n>.(jpg\|png\|webp)` |
| `posts/[id]/on` | POST | **none**, 1/IP/home/day | |
| `visit` | POST | **none**, 20,000/day cap per click key (page views uncapped) | |
| `alerts` | POST | T, honeypot, global 60/h | S-10 |
| `alerts/confirm`, `alerts/unsubscribe`, `unsub` | GET (unsub also POST) | tok | |
| Pages: `c/[slug]` (+enter/judge/manage), `installer/[slug]` (+manage), `in/[city]`, `past/*`, `help/*`, `sitemap.xml` | GET | none (HTML shells; data via APIs) | S-01 |

State-changing routes without `sameOrigin`: admin mutations (Access only), `submit` (cookie-gated), and the anonymous counters/reports above. User-data routes without a user check: none found; the unguarded ones carry no user data.

## Verified OK

- Admin: live `/admin/`, `/api/admin/*` (including `/api/admin/photo/...`) and the same paths on `socal-lights.pages.dev` return 302 to Cloudflare Access. All admin handlers sit under one middleware. JWT signature, `aud`, `exp`, `iss` checked.
- Pages project (production and preview) has **no** `ADMIN_DEV_BYPASS` or `DEV_AUTH`. `ADMIN_DEV_BYPASS` additionally needs hostname `localhost`; the dev-code branch in `email/start.js:30` needs `localhost` and no Resend key. Production variable names: ACCESS_AUD, ACCESS_TEAM_DOMAIN, ALERT_CRON_KEY, GEOAPIFY_KEY, GOOGLE_CLIENT_ID/SECRET, MAIL_FROM, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TURNSTILE_SECRET/SITE_KEY (secrets are secret_text).
- IDOR: `me/homes`, `me/events`, `drafts`, `contests/[slug]/mine`, `feature/checkout` (same 404 for foreign ids), installer manage/logo all filter by `user_id` or verified email. Owner/co-organizer/judge checks are server-side (`ownerOf`, `judgeOf`); staff add/remove is creator-only; judges and voters cannot score or vote for their own home. Live unauthenticated GET/POST probes returned 401/403/400/404 as expected; the public contest JSON contained no email addresses.
- Sessions: random 32-byte token, SHA-256 hash stored, `HttpOnly; SameSite=Lax; Secure` (live cookie confirmed), 30-day expiry, logout deletes the row, suspended users are rejected at lookup, a new session is minted at login. Authenticated JSON is `no-store`.
- Google OAuth: state cookie compared, `email_verified` required, fixed redirect URI built from the request origin.
- Email codes: hashed with the email, 10-minute expiry, per-email and per-IP issue limits, Turnstile, same response whether or not the account exists.
- Cross-origin POST to `/api/auth/email/start` returns 403.
- SQL: all values are bound; template literals in `prepare()` interpolate only constant column/table lists or `?` placeholders (`admin/users/index.js` and `admin/log.js` offsets come from admin-only paging; not traced further).
- XSS elsewhere: `esc` covers `& < > " '` in shell.js, app.js, admin.js, forms.js; JSON-LD escapes `<`; `c/[slug].js` meta tags escape quotes; `webUrl/safeUrl` restrict links to http(s) with valid hostnames; CSV exports defuse `= + - @`.
- Photos: key regex and R2 lookup prevent traversal (`/api/photo/p/../..` normalizes to a static fallback); pending, declined and paused photos are not served by the public route.
- SSRF: the only server fetch of a user URL is `verifyEventPage` (6 s timeout, 400 KB slice); `webUrl` rejects IP literals and bare hosts, Workers cannot reach private ranges. Geocoders and address proxy use fixed hosts. (Redirects are followed; no private-range check in code, covered by platform.)
- Stripe webhook: HMAC with constant-time compare, timestamp tolerance, event idempotency, metadata set server-side.
- Secrets: no keys in tree or in `git log -p` (patterns sk_/rk_/whsec_/re_/AIza/GOCSPX/BEGIN/ghp_; 73 commits); `.dev.vars` ignored. `npm audit --omit=dev`: 0 vulnerabilities (no runtime dependencies).
- CORS: no `Access-Control-Allow-Origin` on `/api` JSON routes (static assets return `*`, normal for Pages). Service worker does not cache authenticated APIs.
- HTTP redirects to HTTPS (301).

## Not checked

- Live end-to-end exploitation of S-01/S-03 (would create records or need a Google login).
- Admin handler internals beyond the middleware (all `functions/api/admin/*` bodies were not read line by line).
- Cloudflare Access policy (who is allowed) and its cookie SameSite setting; Cloudflare WAF/rate-limit rules; HSTS at the zone level (header absent in responses, may be disabled).
- Authenticated flows (no test account), including the Turnstile widget behaviour and the voting UI.
- Whether the GitHub repository is public (artifact exposure for S-16); GitHub API for the repo was not reachable.
