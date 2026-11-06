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

**Plan note.** The audit (`docs/audit/2026-11-07/operations.md`) saw Function CPU above the free 10 ms with no CPU errors and "standard" usage model, which suggests the account may already be on Workers Paid. Check Cloudflare dashboard > Billing. If it is Paid, the Cloudflare limits above do not apply (see "Paid plan" below) and the panel is a conservative early warning.

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
