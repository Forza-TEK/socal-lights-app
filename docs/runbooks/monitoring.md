# Monitoring you can trust (heartbeats, /api/health, external monitor)

Why: GitHub's scheduled workflows are best effort. Measured 2026-11-05/06: the "every 15 minutes" uptime check ran every 6 to 8 hours, the nightly backup had not scheduled by itself, the digest ran 2x a day instead of 3x. So nothing important may depend on GitHub cron alone. There are three layers:

| Layer | Where it runs | What it catches |
|---|---|---|
| 1. **Heartbeats** (dead-man's switch) | Each workflow reports "I ran" to `POST /api/heartbeat`; the site stores it in D1 table `job_heartbeats` (migration 0182) | A workflow that stopped running or failed |
| 2. **The site notices** | Admin home red banner, the admin digest ("Scheduled jobs and deploys"), `GET /api/heartbeat` (key), `POST /api/usage-check` (`stale` list), public `GET /api/health` (`stale` flag) | Reports "job X last ran N hours ago (expected every M)". Opportunistic: it works whenever anything at all touches the site |
| 3. **External monitor** (free, not on GitHub, not on Cloudflare) | Better Stack (steps below) polls `/api/health` every 3 minutes and receives the backup's ping | Site down, database down, a job stale, the backup not pinging: emails the owner even if GitHub and the digest are both dead |

## The jobs and when they count as stale
Defined once in `functions/_lib/heartbeat.js` (`JOBS`). Seed rows start every clock when migration 0182 is applied.

| Job | Workflow | Expected | Flagged after |
|---|---|---|---|
| `uptime` | uptime.yml | 15 min | 6 h |
| `usage-check` | usage-check.yml | 30 min | 4 h |
| `deploy-watch` | deploy-watch.yml | 10 min | 6 h |
| `mail-outbox` | mail-outbox.yml | hourly | 6 h |
| `digest` | submission-digest.yml | 3 a day | 15 h |
| `backup` | backup.yml | nightly | **30 h** |
| `sponsor-renewals` | sponsor-renewals.yml | daily | 30 h |
| `stripe-reconcile` | stripe-reconcile.yml | daily | 30 h |
| `alerts` | alerts.yml (weekly email, Thursdays) | weekly | 8 days |

A job is also flagged when its last report said it **failed**. The heartbeat step in each workflow runs `if: always()` and `continue-on-error`, so it never breaks the job; it needs the existing `ALERT_CRON_KEY` secret and is skipped without it.

## What happens when a job goes stale (no owner action needed)
1. The next time the digest or the 30-minute usage workflow runs (`.github/scripts/stale-issue.sh`) it opens one GitHub issue **"Scheduled job stopped reporting"** (emails the owner), and closes it when every job has reported.
2. **Backup catch-up:** if the backup is stale (30 h) and no backup run started in the last 3 hours, that script starts the Nightly backup workflow itself (`workflow_dispatch`).
3. Admin home shows a red banner; the digest subject starts with `STALE JOBS`; `/api/health` answers `"stale":true,"staleJobs":["backup"]`.
If GitHub is down or skipping everything, steps 1 and 2 cannot happen: layer 3 is what tells you.

## Owner setup: the free external monitor (about 5 minutes)
Pick **Better Stack** (free plan: one account does both the web check and the "heartbeat" ping; checks every 3 minutes; email alerts). Check the current free limits on their pricing page when you sign up; if it ever stops being free, use **UptimeRobot** (free, 5-minute checks, but its terms limit the free plan to non-commercial use, and this site sells placements) for the web check and **healthchecks.io** (free) for the backup ping, with the same steps.

**A. Create the account:** go to betterstack.com > Get started free > sign up with rey@forza-tek.com.

**B. The site check (keyword on `/api/health`):**
1. Left menu **Uptime** > **Monitors** > **Create monitor**.
2. "Alert us when": **URL becomes unavailable** (the free option; the keyword options are paid).
3. URL: `https://socallights.app/api/health`
4. Nothing else to choose: `/api/health` answers 503 with `"ok":false` when the site or database is down, which is what "unavailable" means.
5. Check frequency: 3 minutes (the free minimum). On-call/alert: **Email**, rey@forza-tek.com. Create.
6. Create a **second** monitor, "SoCal Lights: a scheduled job is stale". The Better Stack **free plan only has "URL becomes unavailable"** (keyword matching is paid), so use the strict address: URL `https://socallights.app/api/health?strict=1`, alert when **URL becomes unavailable**, same email. It answers 200 while every scheduled job is fresh and **503 when one has gone stale** (or the database is down); the body names the job(s) in `staleJobs`. (On a paid plan, a keyword monitor for `"stale":true` on the plain address does the same.) The first monitor can use the same type with the plain `/api/health` address (503 only when the site or database is down).
7. If socallights.app ever answers the monitor with a Cloudflare challenge, use `https://socal-lights.pages.dev/api/health` instead (same code and database).

**C. The backup dead-man's switch (heartbeat):**
1. **Uptime** > **Heartbeats** > **Create heartbeat**. Name: "Nightly backup". Expected every: **1 day**, grace period **6 hours**. Alerts: Email, rey@forza-tek.com. Create.
2. Copy the heartbeat **URL** it shows (looks like `https://uptime.betterstack.com/api/v1/heartbeat/xxxx`). It is a secret: anyone with it can fake a ping.
3. GitHub > the `Forza-TEK/socal-lights-app` repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**. Name `BACKUP_PING_URL`, value the URL > Add secret.
4. GitHub > **Actions** > **Nightly backup** > **Run workflow**. When it is green, the heartbeat in Better Stack turns "Up". From now on a missing or failed backup emails you within about 6 hours of the expected time. (The workflow pings `<url>` on success and `<url>/fail` on failure: that suffix is healthchecks.io style; on Better Stack a failed run simply does not ping, which also alerts.)

**D. Check it worked:** Better Stack > Heartbeats shows "Nightly backup" as Up after step C4, and both monitors show Up.

## Check by hand any time (no login needed)
`curl -s https://socallights.app/api/health` should print `{"ok":true,"db":true,"stale":false,"staleJobs":[]}`. It reads one tiny table and is edge cached for 30 seconds (errors too). If D1 is over its free daily read limit it answers 503 `{"ok":false,"db":false,"quota":true,...}` ("over quota", resets 00:00 UTC), distinct from a plain outage (`"quota":false`).
With the key (`ALERT_CRON_KEY`): `curl -s https://socal-lights.pages.dev/api/heartbeat -H "x-alert-key: $KEY"` lists every job: last run, hours ago, stale or failed.

## The Cloudflare clock (Worker `workers/mail-cron`, added 2026-11-11)
GitHub's scheduler is best effort (the hourly mail job really ran every 4 to 8 hours, and the 30-minute usage check kept showing "late"). So every scheduled job that only needs to CALL THE SITE now runs from one Cloudflare Worker with several cron triggers; each job calls its endpoint, decides ok or fail the way its old GitHub workflow did, and reports to the heartbeat. Cloudflare's scheduler is on time.
| Job | Cron (UTC) | Endpoint | Heartbeat |
|---|---|---|---|
| Send queued emails | every 5 minutes | `/api/mail/drain` (until empty) | `mail-outbox` |
| Cloudflare usage check | `7,37 * * * *` | `/api/usage-check?notify=1` (the site emails the owner at 90%+, at most every 6 hours, instead of a GitHub issue) | `usage-check` |
| Stripe reconcile | `47 14 * * *` | `/api/stripe-reconcile` (until done) | `stripe-reconcile` |
| Sponsor renewals | `17 15 * * *` | `/api/sponsor/renewals` | `sponsor-renewals` |
| Contest reminders | `15 17 * * *` | `/api/contest-remind` | `contest-reminders` (new) |
| Weekly lights email | `30 17 * * 4` | `/api/alerts/send` (batches until done) | `alerts` |
- **Stay on GitHub** (they need GitHub or wrangler): the admin digest (it also opens the GitHub "jobs stopped" issue and starts a late backup), the nightly backup, the deploy watch, the uptime check (Better Stack now does that job).
- **Deploy:** `.github/workflows/deploy-mail-cron.yml` (on a change under `workers/mail-cron/`, or by hand from Actions > Deploy mail cron > Run workflow). Needs the repository secrets `CLOUDFLARE_API_TOKEN` (with **Account > Workers Scripts > Edit**) and `ALERT_CRON_KEY`. The Worker keeps its first name `socal-lights-mail-cron`.
- **Check it:** Cloudflare dashboard > Workers & Pages > `socal-lights-mail-cron` > Triggers lists the six schedules; Metrics/Logs show the runs; Admin > Last run of each job shows each job reporting on time; `curl -s https://socallights.app/api/health` keeps `staleJobs` empty.
- **Stage 1 (now):** the old GitHub schedules still run too, as a safety net. This is safe because every job is built to run twice (mail rows are claimed before sending; renewals and reminders are once-only; reconcile is read-only; the weekly email only sends to people not yet sent).
- **Stage 2 (after a clean day):** remove the `schedule:` block from each moved workflow (`mail-outbox`, `usage-check`, `stripe-reconcile`, `sponsor-renewals`, `contest-reminders`, `alerts`), keeping `workflow_dispatch` as a manual fallback, and tighten the stale thresholds in `functions/_lib/heartbeat.js` (mail-outbox 6h to 1h, usage-check 4h to 1h).
- **Limits:** a Worker may make 50 outgoing calls per run (the loops use at most 31); cron triggers: 5 per account on the free plan, more on Workers Paid (this account is on Paid, 6 are used).

## Routines (sweeps, weekly and midweek upkeep, browser pass, photo refresh)
These are Claude Code scheduled tasks, not GitHub workflows, so they have no heartbeat endpoint call. Their trace is the migration or commit they leave. A routine that finds nothing leaves no trace at all, so check by hand:
- Last sweep: the newest `migrations/*sweep*` file name carries its date. Open GitHub > Actions > "Apply database migrations": the latest run date is the last time any routine published.
- If the newest routine migration is more than 36 hours old during the season (Nov to Jan), a routine has stopped: open Claude Code > scheduled tasks and look at the `[SCL]` task's last run.
A real routine heartbeat (a `routine_runs` row per run) needs the routine prompts changed, which is the owner's call: add "end every run with `curl -X POST https://socal-lights.pages.dev/api/heartbeat?job=...`" only after a `routines` job name is added to `JOBS`. Not done yet.

## Off-Cloudflare copy of the backup (monthly, 5 minutes)
The backup lives in the same Cloudflare account as the database. The repo is public, so the file is never put in GitHub artifacts, logs or commits. Once a month:
1. Cloudflare dashboard > **R2 Object Storage** > **socal-lights-backups** > open **latest.sql.gz** (or `monthly/socal-lights-YYYY-MM.sql.gz`) > **Download**.
2. Save it to private storage you control that is NOT this Cloudflare account (OneDrive "SoCal Lights App" folder, an encrypted drive). It contains emails and orders: do not email or share it.
3. Keep the last 3.
There is no automated off-Cloudflare copy because no private storage outside Cloudflare is set up (adding one needs an account and a secret from the owner, e.g. a Backblaze B2 bucket and an encrypted upload step: ask).

## Honest limits
- The heartbeat tells you a job reported, not that it did everything right (the job's own checks still apply).
- `/api/health` is cached 30 seconds, so an outage shows within about a minute of the monitor's check.
- If the whole Cloudflare account is down, Better Stack still alerts (it is outside it); the site cannot report that itself.
