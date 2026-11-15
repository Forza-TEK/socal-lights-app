# SoCal Lights: operating guide

Last updated 2026-11-07. This is the one page that says where SoCal Lights work happens.

## Where to work
- **All SoCal Lights work happens in a Claude Code session (claude.ai/code) with the repo `Forza-TEK/socal-lights-app` attached.** The repo is what makes a session know the setup: it loads `CLAUDE.md`, which points here. The claude.ai Project "SoCal-Lights" is optional extra context; a copy of this guide is stored there too.
- The session can also be linked to the work computer (Claude desktop app) for OneDrive files and Claude in Chrome. Link it when the work needs Chrome or the OneDrive folder `SoCal Lights App`.
- Source of truth for code and event data: GitHub (`socal-lights-app`). OneDrive holds non-code files only (notes, raw reading files). Never keep a git working copy inside OneDrive.
- Design mockups and one-off pages are artifacts titled `[SCL] ...`.

## Background agents (all in the Code scheduled-task list, prefix [SCL])
| Task | When (Pacific) | Needs work computer? | Job |
|---|---|---|---|
| (GitHub Actions, not a scheduled task) Send queued emails | hourly (`mail-outbox.yml`) | No | Sends contest results and voting reminders waiting in `mail_outbox`, retries failures (`/api/mail/drain`, key `ALERT_CRON_KEY`) |
| [SCL] City sweep | 4:13, 12:13, 20:13 daily | No | One city group per run: new events, contest homes, venue pass (wineries, breweries, taprooms, distilleries; "<city> winery holiday", "<city> brewery tree lighting"), hotel and resort pass ("<city> hotel tree lighting", "<city> resort holiday lights", Ritz-Carlton and other resort holiday pages), the gap report and work order (`node scripts/coverage-gaps.mjs --group N`: thin season categories, venue watchlist `docs/watchlist.json`, tourism-board guides), photos |
| [SCL] Weekly upkeep | Mondays 6:47 | No | Confirm dates, fix details, remove dupes, season roll-overs |
| [SCL] Midweek upkeep (Nov-Dec) | Wed + Sat 6:52, Nov-Dec | No | Date confirmation, contest homes, photos |
| [SCL] Monthly photo refresh | 1st of month 2:37 | No | New photos, replace dead ones |
| [SCL] Browser pass (Chrome, needs Rey-Home-Office) | Tuesdays and Fridays at 10:23 AM Pacific | **Yes: the Rey-Home-Office (the owner's home computer)** must be awake, with the Claude desktop app open and Chrome open with the Claude extension signed in to the same account and organization | Reads, in the owner's own Chrome as a normal visitor, the pages that turn the bot away: city calendars, the watchlist venues marked `blocked` (`node scripts/coverage-gaps.mjs --blocked`) and tourism-board guides |

All publish straight to `main` after validation (owner authorized 2026-10-28). Check the GitHub Actions run "Apply database migrations" if anything looks off. Full prompts live in the tasks; the rules they follow are in the repo docs (`docs/sweep-methods.md`, `docs/updating-events.md`, `docs/browser-pass.md`).

## GitHub workflows (best effort: GitHub runs scheduled workflows late or skips them)
Each reports to the site's heartbeat; a quiet one raises a banner, an issue and an email (`docs/runbooks/monitoring.md`). Direct pushes to `main` by the routines work only because the pusher is an administrator (branch protection requires the `Tests` check but `enforce_admins` is off): do not turn on "Do not allow bypassing" without moving the routines to pull requests.
| Workflow | Schedule (UTC) | Job |
|---|---|---|
| `uptime.yml` | every 15 min (really 6 to 8 h) | site check, issue "Site is down" |
| `deploy-watch.yml` | every 10 min | Pages stalled-deploy check, issue "Production deploy stalled" |
| `usage-check.yml` | every 30 min | Cloudflare usage issue (plan-aware: Workers Paid = extra charges, free = hard limits), stale-job issue, late-backup catch-up |
| `mail-outbox.yml` | hourly | queued emails |
| `submission-digest.yml` | 03:00, 15:00, 21:00 | owner digest (fails if the email was not sent) |
| `backup.yml` | 10:17 daily | D1 export, restore test, private R2 copy, external ping |
| `sponsor-renewals.yml` | 15:17 daily | automatic renewals |
| `stripe-reconcile.yml` | 14:47 daily | Stripe vs orders, read-only |
| `alerts.yml` | Thursday 17:30 | weekly email |
| `d1-migrations.yml` | on push to `migrations/**` | live and preview migrations |
| `test.yml` | every PR and push | the required `Tests` check |
The `[SCL]` routines above have no heartbeat (they are not workflows): see "Routines" in `docs/runbooks/monitoring.md` for how to tell "ran, found nothing" from "did not run".

## Rules of the road
- Events change only through new numbered migrations in `migrations/`; never edit an old one.
- Never invent events, dates or prices; only add what a loaded public page shows.
- If a site refuses Claude in Chrome, stop on that site and list it in `docs/blocked-sites.md`.
- Update `docs/status.md` at the end of every working session.
- Task names start with `[SCL]`; use `[DA]` for David August, Inc. and `[WEB]` for website projects so lists stay readable.

## Known limits
- Scheduled cloud tasks cannot open Chrome; only the browser pass (bound to the work computer) can.
- Picking up on the home computer is set up but untested (see `docs/workstation-setup.md` in the repo).

## AI assistant
Off by default. Switch, kill switch, cost cap, usage and "unanswered topics" are in Admin > AI assistant; setup, environment variables and launch steps are in `docs/ai-assistant.md`. Weekly while it is on: open Admin > AI assistant, look at Unanswered topics and write or fix the Help Center articles they point to; after changing a listed public page, the tutorials or `docs/ai-assistant-kb.md`, run `node scripts/build-chat-kb.mjs` and commit the result.

## Ads link (Grok builds the Facebook and Instagram ads)
Grok reads the approved ads from `GET /api/ads/brief` and reports status to `POST /api/ads/report` about every 2 days (contract: `docs/monetization/grok-ads-api.md`; Bearer `ADS_API_KEY`, a Pages secret, 503 until you create it). Watch Admin > Ads: spend against the $300 budget ($280 loaded, $20 reserve), per-ad status, alerts (over budget, disapproved, running past Dec 8, no report in 48 hours) and a CSV. Grok never creates or changes a budget without you. Ad copy and status change only by a new migration. Creative files are served from `/ad-assets/` (not linked, noindex) after `node scripts/build-ad-assets.mjs --from docs/marketing/ad-assets`.

**Grok event intake** (staging, checks, publish tagged From Grok, one-click unpublish in Admin > From Grok): Grok sends rows it read in its own browser to `POST /api/intake/events` (Bearer `GROK_INTAKE_KEY`, a Pages secret, 503 until you create it; rows that pass publish at once; `GROK_INTAKE_PUBLISH=0` is the kill switch). Hand Grok `docs/monetization/grok-browser-pass.md`.
