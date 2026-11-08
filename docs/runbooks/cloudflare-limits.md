# Cloudflare free-plan limits runbook

Admin > **Cloudflare usage** shows today's usage against the free-plan limits, with a 7-day trend. It is read-only. Numbers come from Cloudflare's GraphQL Analytics API through `GET /api/admin/usage` (cached 5 minutes in D1, so the page does not use quota). All limits live in one file, `functions/_lib/cflimits.js`, each with its source URL; they were checked against Cloudflare's and Resend's documentation on 2026-11-06.

Colors: **Watch** from 70%, **Warning** from 90%, **Limit reached** at 100%.

## The limits, what they mean, what breaks
Daily limits reset at **00:00 UTC** (4 pm Pacific in winter, 5 pm in summer). "Today" in the panel is the UTC day.

| Limit (free plan) | Source | What counts | What breaks at the limit |
|---|---|---|---|
| D1 rows read: **5,000,000 a day** | developers.cloudflare.com/d1/platform/pricing/ | Every row a query scans, not rows returned. An unindexed filter or a full table scan counts every row. Crawlers and bots are most of it. | Every D1 query fails until midnight UTC. The map goes blank (after the 15-minute stale copy), pages that read the database error. |
| D1 rows written: **100,000 a day** | same | Every INSERT/UPDATE/DELETE row, plus one per index touched. | Every save fails (submissions, sign-in codes, votes, orders); reads still work. |
| D1 storage: **5 GB** total, 500 MB per database | developers.cloudflare.com/d1/platform/limits/ | All databases, tables and indexes. | New data cannot be saved until you delete data. (We use about 2 MB.) |
| Workers and Pages Functions requests: **100,000 a day** | developers.cloudflare.com/workers/platform/limits/#daily-requests and /pages/functions/pricing/ | Every Function invocation (one page visit is about 7). Static files are free. | Cloudflare returns Error 1027 instead of the Functions until midnight UTC. |
| Worker CPU: **10 ms per request** | developers.cloudflare.com/workers/platform/limits/#cpu-time | CPU time only, not waiting. | That request fails (status "exceeded CPU"). The panel shows today's count. |
| Subrequests: **50 per request** | same page, Subrequests | `fetch()` and D1 calls in one request. | "Too many subrequests" error for that request. |
| R2 Class A: **1,000,000 a month** | developers.cloudflare.com/r2/pricing/#free-tier | Writes and lists (PutObject, ListObjects ...). Deletes are free. | No outage: billing starts at $4.50 per million. |
| R2 Class B: **10,000,000 a month** | same | Reads (GetObject, HeadObject ...). | No outage: billing starts at $0.36 per million. |
| R2 storage: **10 GB** | same | Photos and the backup bucket. | No outage: $0.015 per GB-month beyond. |
| Resend (free): **100 emails a day, 3,000 a month** | resend.com/docs/knowledge-base/account-quotas-and-limits | Sent and received. The panel counts what this site sends (a counter, `fn:email-sent` in `site_hits`). | Sign-in codes, order emails, the digest and weekly alerts stop until the next day. People cannot sign in. |

R2's monthly allowance is shown as calendar-month-to-date (UTC); Cloudflare's own meter may roll on a different date, so treat it as an estimate. If the plan constants are wrong for your account, change `CLOUDFLARE_PLAN`, `RESEND_PLAN` and the numbers in `cflimits.js` (any entry with `verified: false` shows "unverified").

**Plan note (updated 2026-11-08).** The owner upgraded to **Workers Paid ($5/month)** on about 2026-11-08 after the free-tier D1 rows-read outage. The panel, digest and check are now plan-aware: `CLOUDFLARE_PLAN` (in `wrangler.toml` `[vars]`, default `paid`; set `"free"` to go back) selects the limits in `functions/_lib/cflimits.js`. On Workers Paid the allowances are monthly and are NOT stops (D1 25 billion rows read and 50 million rows written a month, 5 GB storage, Workers/Functions 10 million requests a month; beyond that Cloudflare bills $0.001 per million rows read, $1.00 per million rows written, $0.75 per GB-month, $0.30 per million requests; verified 2026-11-08 on developers.cloudflare.com d1/platform/pricing and workers/platform/pricing), so "100%" means **extra charges start**, with an estimated overage shown. The daily free-plan numbers in the table below apply only when `CLOUDFLARE_PLAN = "free"`. Earlier note: the audit (`docs/audit/2026-11-07/operations.md`) saw Function CPU above the free 10 ms with no CPU errors and "standard" usage model, which suggests the account may already be on Workers Paid. Check Cloudflare dashboard > Billing. If it is Paid, the Cloudflare limits above do not apply (see "Paid plan" below) and the panel is a conservative early warning.

## Alerts
- **Digest email** (3 a day): a "Cloudflare free-plan usage" section with every metric at 70% or more and always the top one; the subject starts with `LIMIT` at 90% or more, or if the site logged a quota error in the last 2 hours.
- **GitHub issue** "Cloudflare free-plan limit reached or near": `.github/workflows/usage-check.yml` runs every 30 minutes (and the digest workflow runs the same check, because GitHub's schedule can be late). It opens the issue at 90% (GitHub emails you), comments at most every 6 hours, and closes it when everything is under 90%. It uses the existing `ALERT_CRON_KEY` repository secret; nothing new to add in GitHub.
- **Quota errors seen at runtime** are filed in the error log with kind `limit` (D1 "exceeded" / "rows read" / "daily limit", "Too many subrequests", Error 1027, Resend `daily_quota_exceeded`). Admin home shows a banner for 24 hours, and the panel and digest say "limit hit at <time>". This works even when analytics is not connected. (If D1 itself is over quota the log row cannot be written; the analytics numbers still show it.)

## What to do when a limit is reached
**D1 rows read (most likely).**
1. Wait: it resets at 00:00 UTC. Nothing is lost.
2. Find the cause in Admin > Cloudflare usage (7-day trend). Crawler traffic is the usual cause; the home page and event list were the heaviest queries (audit finding H5: ~4,600 rows read per home page hit, fixed or in progress).
3. Cheap fixes: cache more at the edge (`s-maxage`), add an index so a query stops scanning the whole table, in Cloudflare > Security > Bots turn on Bot Fight Mode or add a rate-limiting rule for `/` and `/api/events`, block abusive crawlers (Security > WAF > custom rule).
4. If it keeps happening: upgrade (below).

**D1 rows written.** Look for a loop or a burst (many submissions, a script hitting a form). Turnstile already protects forms. Wait for midnight UTC.

**Requests (100,000).** About 14,000 page visits a day. Same fixes: cache, block crawlers. Static assets are free, so serving more as static files helps.

**R2 / Resend.** R2 only starts billing: set a billing alert. For Resend, wait for the next day; sign-in codes are the most important mail, so pause the weekly alerts (do not run the "Send weekly lights email" workflow) until the quota resets.

## When to move to the paid plan
- **Cloudflare Workers Paid: $5 per month** (includes Pages Functions and D1). Includes 10 million requests a month, 25 billion D1 rows read, 50 million rows written, 5 GB D1 storage; beyond that, $0.001 per million rows read and $1.00 per million rows written. It removes the daily limits, typically within minutes of upgrading. Move up when the issue opens more than about twice a month, or any day a limit stops the site. Dashboard: Workers & Pages > Plans > Change plan (or Billing).
- **Resend Pro: $20 per month**, 50,000 emails a month, no daily limit. Move up if the daily 100 is hit by normal sign-ins.
- R2 stays cheap: free allowance, then pennies.

## One-time setup (owner, about 5 minutes)
Do this in the Cloudflare dashboard. Paste secrets only into the dashboard, never into chat or the repository.

**1. Create the API token (read-only)**
1. Cloudflare dashboard > your avatar (top right) > **My Profile** > **API Tokens**.
2. **Create Token** > scroll to **Custom token** > **Get started**.
3. Token name: `socal-lights usage (read only)`.
4. Permissions: first dropdown **Account**, second **Account Analytics**, third **Read**. (Only this one row.)
5. Account Resources: **Include** > **Specific account** > your account.
6. Leave client IP filtering and TTL as they are (or set an expiry you will remember). **Continue to summary** > **Create Token**.
7. Copy the token now (it is shown once). Keep the tab open until step 3 below is done.

**2. Find your Account ID**
It is the long code in the dashboard address (`dash.cloudflare.com/<account id>/...`) and also on Workers & Pages > Overview, in the right-hand column under "Account details".

**3. Add the two secrets to the Pages project**
1. Workers & Pages > **socal-lights** > **Settings** > **Variables and Secrets** > **Add**.
2. Type **Secret**, name `CF_ANALYTICS_TOKEN`, value: the token. Environment: **Production**. Save.
3. Add again: type **Secret**, name `CF_ACCOUNT_ID`, value: the Account ID. Environment: **Production**. Save.
4. **Redeploy** so the secrets take effect: Deployments > the latest production deployment > **Retry deployment** (or push any change to `main`).

**4. Check**
Open Admin > Cloudflare usage and press **Refresh now**. The "Not connected" box should be gone and the cards filled. If a card says "Permission missing: Account > Account Analytics > Read", the token lacks that permission. If it says Cloudflare refused the token or the account id, re-check step 2.

No GitHub secret is needed: the 30-minute workflow reuses `ALERT_CRON_KEY`. The first time, run it by hand: GitHub > Actions > "Cloudflare usage check" > Run workflow.

## Testing without a real token
`tests/cf-usage.test.mjs` stubs the GraphQL answer. For the screen, run `npm run dev` with `ADMIN_DEV_BYPASS=1` in `.dev.vars`; without the secrets the panel shows the "Not connected" state. `CF_GRAPHQL_URL` (local tests only) points the check at a stub server; never set it in production.

## Verified API facts (2026-11-06, read-only queries)
Datasets used on the account GraphQL node: `d1AnalyticsAdaptiveGroups` (sum: `rowsRead`, `rowsWritten`, `readQueries`, `writeQueries`), `d1StorageAdaptiveGroups` (`max.databaseSizeBytes`), `pagesFunctionsInvocationsAdaptiveGroups` (sum: `requests`, `errors`, `subrequests`; dimension `status`, e.g. `success`, `scriptThrewException`, `clientDisconnected`, `exceededCpu`; quantile `cpuTimeP99` in microseconds), `workersInvocationsAdaptive` (`requests`, `errors`; empty for this account, which uses Pages Functions), `r2OperationsAdaptiveGroups` (`actionType`, sum `requests`), `r2StorageAdaptiveGroups` (max `payloadSize`, `metadataSize`). All need only **Account Analytics: Read**.

---


_Section below written 2026-11-06 from the live Cloudflare documentation. Other sections of this file (account setup steps) are written separately; keep them apart and rebase carefully._

## Per-request limits and how the code stays under them

The owner is on the **Workers/Pages Free plan**. Pages Functions are billed and limited as Workers (Cloudflare: "Requests to your Pages Functions count towards your quota for the Workers Free plan"). Verified against the Cloudflare docs on 2026-11-06 (pages last updated by Cloudflare Oct 29 to Oct 30, 2026):

| Limit | Free plan value | What happens past it | Source |
|---|---|---|---|
| Requests | 100,000 a day (Pages Functions and Workers share it; resets 00:00 UTC) | Error 1027 for the request (Pages: fails or falls to static, depending on route mode) | developers.cloudflare.com/workers/platform/limits/ (Daily requests), /pages/functions/pricing/ |
| CPU time per HTTP request | **10 ms** (Paid: 30 s default, up to 5 min). Waiting on fetch or D1 does not count. | The request is terminated: Error 1102 "Worker exceeded resource limits" (outcome `exceededCpu`). Each isolate gets "some flexibility" for rare overruns; if it keeps hitting the limit it is terminated. | workers/platform/limits/ (CPU time) |
| Memory | 128 MB per isolate (shared by concurrent requests on it) | In-flight requests finish, a new isolate starts; Error 1102 (`exceededMemory`) | same |
| **Subrequests per invocation** | **50** (Paid 10,000) | Further calls fail with "Too many subrequests"; code that swallows the error goes on silently | workers/platform/limits/ (Subrequests) |
| What counts as a subrequest | Every `fetch()` **and calls to Cloudflare services such as R2, KV and D1**. Each hop of a redirect counts. The Cache API (`put`, `match`, `delete`) shares the same quota. | | same, and Cache API limits section |
| Subrequests to "internal services" | 1,000 (separate allowance listed in the table) | | same |
| D1 queries per Worker invocation | 50 on Free (1,000 Paid). **A `db.batch()` counts as ONE**, however many statements it holds (the docs say a 2,000-statement batch runs in one invocation, while 2,000 separate queries fail with "Too many API requests by single Worker invocation"). | The query errors | d1/platform/limits/ |
| D1 bound parameters per query | **100** (applies to each statement in a batch) | The query fails | d1/platform/limits/ |
| D1 SQL statement length | 100,000 bytes (each statement in a batch) | fails | same |
| D1 batch size | No statement-count limit is documented, only the per-statement limits and the 30 s query duration (applies to the whole batch call). The code keeps batches at 100 statements or fewer. | | same |
| D1 query result size | 50 MB (takes effect 2026-11-04) | fails | same |
| D1 rows read / written | **5,000,000 reads a day, 100,000 writes a day** (resets 00:00 UTC) | "you will not be able to run queries against D1" until the reset; D1 returns errors | d1/platform/pricing/ |
| D1 storage | 500 MB per database, 5 GB per account (Free) | writes fail | d1/platform/limits/ |
| Simultaneous open connections | 6 per invocation (waiting for response headers): `fetch`, KV, Cache API and R2 calls (R2 `list/get/put/delete/head`), Queues, outbound sockets. D1 also: "up to six connections to D1". A 7th is queued, not failed. | Queued | workers/platform/limits/ (Simultaneous open connections), D1 FAQ |
| `waitUntil()` | Work can run **up to 30 seconds after the response is sent or the client disconnects**. It shares the request's CPU and subrequest budget. | Work past 30 s may be cancelled | workers/platform/limits/ (Duration) |
| Request body size | **100 MB** on the Cloudflare Free plan (it follows the zone's plan, not the Workers plan; Pro 100 MB, Business 200 MB) | 413 | workers/platform/limits/ (Request limits) |
| Response body | no enforced limit | | same |
| Log data per request | 256 KB (console output, exceptions) | further context not recorded | same |
| Cron Triggers per account | 5 (Pages has none: the site uses GitHub Actions schedules) | | same |
| R2 | Free: 10 GB storage, 1 million Class A and 10 million Class B operations a month, free egress. `delete()` takes **up to 1,000 keys in one call**. Max object 5 TiB; single-part upload 5 GiB; per-key writes 1 a second. | | r2/platform/limits/, r2/pricing/ |
| Resend (mail, not Cloudflare) | Batch endpoint `POST /emails/batch`: up to **100 messages per call**, `to` up to 50 per message, no attachments, supports `Idempotency-Key` (24 h). Rate limit 10 requests a second per team; **free plan daily quota 100 emails (UTC day) and 3,000 a month**; over it: HTTP 429 `daily_quota_exceeded` or `monthly_quota_exceeded`. | 429 | resend.com/docs/api-reference/emails/send-batch-emails, /rate-limit |

Not verified from a live account (cannot be read from the docs): whether the Cloudflare account is actually on Free or Paid. The audit saw CPU p50 of 14 ms, which on Free would already be failing, so the account may be on Paid; the code is written so that it is safe on Free either way. **Owner: confirm the plan in Workers & Pages > Plans.**

### The rule the code follows

Count every `await env.DB...`, `env.PHOTOS...`, `fetch(...)` and Cache call in one request (including work in `waitUntil`). Keep the worst case under **50**, with margin. Prefer:

- `env.DB.batch([...])` for several writes (one call; also atomic).
- One `IN (...)` query per at most **90** ids (`selectIn` in `functions/_lib/dbchunk.js`), never one query per id.
- `env.PHOTOS.delete([...keys])` (up to 1,000 keys in one call), `r2Delete` in `functions/_lib/dbchunk.js`.
- Email: Resend batch endpoint through `functions/_lib/mailbatch.js` (never `sendTemplate` in a loop).
- Work that cannot fit in one request goes into a small persisted queue and is finished by the next request or the scheduled workflow, never into a silent `catch {}`. A failure is logged with `logOp(env, kind, detail)` (table `ops_log`; no email addresses or personal data; the admin digest reports it).

The test stand-in `tests/_d1.mjs` now enforces the D1 100-parameter and 100 KB statement limits and counts calls (`env.DB.stats.calls`, `env.DB.stats.reset()`), so a test can assert that a request stays under 50 when it adds its own fetch count. `tests/limits.test.mjs` and `tests/organizer-entries.test.mjs` do this.

### Request paths that fan out, and what each costs now

| Path | Before | Now |
|---|---|---|
| Announce winners (`PATCH /api/contests/<slug>` announce): results emails | Up to 200 sequential `sendTemplate` calls in one `waitUntil`, 3 to 5 outgoing calls each, ending in `catch {}`. Past about 10 to 16 recipients the rest got nothing and nothing was logged. | `queueResults` writes all recipients (entrants, winners, judges, organizer) to table `mail_outbox` in batches of 100 (a few D1 calls; dedupe key `results:<contest>:<template>:<email>`, so a repeat queues nothing twice), then `waitUntil(drainMail)` sends the first 40 in one Resend batch call (rendering 100 emails measured about 9 ms of CPU, and Free allows 10 ms, so a drain handles 40). The rest go out when the hourly workflow `.github/workflows/mail-outbox.yml` calls `POST /api/mail/drain` in a loop (40 messages and about 6 outgoing calls per call, up to 40 calls per run). |
| Voting reminders (`POST /api/contest-remind`, daily) | Up to 150 sequential sends per contest and kind, each 3 to 5 calls; no per-contest cap on D1 calls. | Same outbox, dedupe key `remind_open:<contest>:<email>` or `remind_close:...`; the contest is marked reminded once its messages are queued; cap 1,000 per contest and kind, logged if exceeded. |
| Outbox retry rules | n/a | A failed chunk is retried after 10 minutes (attempts 1 to 2), then 2 hours, up to 8 attempts, then `failed` and an `ops_log` line (`email`). A 429 (Resend quota) pauses the run, waits 3 hours and does **not** use up an attempt. A refused batch is split in halves (up to 12 extra calls) so one bad address does not block the rest. Unsubscribed addresses are marked `skipped`. Still queued after 5 days: marked `failed` and logged. Sent and skipped rows are deleted after 3 days, failed after 30, and message values are cleared as soon as a row is sent. |
| Small lists: contest invitations (10 at a time), judge invitations (15), judge reminders, co-organizer team notices, weekly alert groups (40) | One `sendTemplate` per address: 2 to 5 calls each (settings read, prefs read and insert, fetch). 20 weekly alerts cost about 44 of the 50. | `sendNow` renders with one settings read per template and one prefs read per 90 recipients, and sends one Resend batch call (up to 100). 40 weekly alerts: 1 Resend call. |
| Organizer adds homes (`POST /api/contests/<slug>/entries`) | Up to 100 homes per call (UI sent 25), each 1 to 2 geocoder fetches: up to 200 fetches per call; even 25 homes could need 50. | **10 homes per call** (`MAX_HOMES_PER_CALL`): at most 20 geocoder fetches plus about 15 D1 and mail calls; the test asserts under 50 with both geocoders hit for every home. The page (`public/organizer.html`) sends chunks of 10 with "Checking x of y" and "Adding x of y" progress and keeps failed lines in the box. Dry run unchanged. Hourly limit is now 1,000 homes and 120 calls per account (it was 10 calls). Per-contest cap 500 unchanged. |
| `GET /api/posts` (public map) | `IN (...)` with up to 200 user ids in one query: over D1's 100 parameters, inside `try {} catch {}`, so winner crowns silently disappeared, and `winnerBadges` made one query per announced contest (up to 200). | `selectIn` slices of 90 (up to 1,000 ids), `winnerBadges` reads all contests' winners in one slice pass; failures go to `ops_log` (`posts`, `badges`) and the list is still served. |
| Map boot (`public/app.js` `load()` and `refreshData()`) | One `Promise.all` of events, posts and config: any failure showed "Events couldn't load". | `Promise.allSettled`: only a failed events list shows the error; homes and settings fall back to empty, and a failed homes list is retried after 10 seconds, then every 15 minutes. |
| Delete account, delete contest, delete home | One `PHOTOS.delete` per photo, `.catch(() => {})` (a contest with 500 homes and 3 photos each: 1,500 calls, silently stopped near 50 while the database rows were deleted anyway, leaving orphan files). | `r2Delete`: one call per 1,000 keys, failure logged (`r2`). |
| Change log (`logHome`, `logContest`) | One INSERT per changed field | One `batch()` |
| Installer dashboard (`/api/installers/<slug>/manage`) and admin Homes list | `IN (...)` of up to 100 ids (exactly at D1's limit) / unbounded | `selectIn` |

### Paths reviewed and left as they are

- `functions/api/admin/dashboard.js`: about 26 D1 queries in one request (read-only, admin only). Under 50; if more panels are added, move them into a `batch()`.
- `functions/api/admin-digest.js`: about 10 reads and one send. Fine.
- `functions/sitemap.xml.js`, `functions/in/*`, `functions/past/*`, `functions/installer/[slug].js`: 2 to 5 queries each, edge-cached. Fine.
- `functions/api/me/overview.js`: homes list is `LIMIT 50`, so its `IN (...)` has at most 50 parameters.
- `functions/_lib/retention.js` (`pruneIps`): one `batch()` of three statements.
- `functions/api/admin/normalize.js`: batches of 40 statements (one call each) for at most the admin's chosen set.
- Photo approval (`approveEntry`, `movePhotos`): 3 R2 calls per photo, 3 to 4 photos per entry, so about 12 calls. Fine.
- Single transactional emails (sign-in code, claim decision, order and payment mail): one `sendTemplate` each (3 to 5 calls). Fine.

### Open items (owned elsewhere or deferred)

- **Sponsor automatic renewals job** (`functions/_lib/renewal.js` `processRenewals`, daily workflow): up to 200 rows per run, about 6 to 10 outgoing calls per renewal (installer read, ownership check, reminder or charge, Stripe call, order apply, mail). On the Free plan about 5 renewals fit in one run; the rest are not lost (each row stays due and the daily run, or a manual `workflow_dispatch`, picks it up; a missed charge day is still charged later) but they wait a day each. Recommended change for the renewal owner: `LIMIT 5` per call and let the workflow loop while `remaining` is true, exactly like `/api/mail/drain`.
- **CPU time 10 ms**: a cold `/api/events` rebuild (about 1,250 rows to JSON, 600 KB) and `/` with the events list probably exceed 10 ms. They are edge-cached and rebuilt rarely. If Cloudflare Analytics shows `exceededCpu`, upgrade the plan before optimizing further. Not measurable from the repo.
- **Resend free daily quota (100 emails)**: with the outbox, a results announcement to more than about 90 people spreads over two UTC days (the run pauses on 429 and resumes after midnight UTC). Sign-in codes share the same quota; there is still no budget that reserves headroom for them (audit M9). Upgrade Resend (or reserve headroom) before a large contest announces.
