# Status

_Last updated: 2026-10-27_

## Where we are
Site is live at https://socallights.app. Event data is being maintained through weekly sweeps (see the latest `migrations/00NN_sweep_*` files and `docs/confirmation-plan.md`). The repository moved from the personal GitHub account to the `Forza-TEK` org on 2026-10-27.

## Next steps
1. Continue confirming `expected` holiday events per `docs/confirmation-plan.md`.

## Open questions / blockers
- **Scheduled routines point at the old repo URL and fail.** All three Routines below have `https://github.com/forza-tek/socal-lights` as their source. The 2026-10-27 city sweep failed at startup with "Authentication failed while accessing the repository". Fix: in the Claude Routines settings, change each routine's repository to `Forza-TEK/socal-lights-app` (and optionally update the repo name in each prompt; GitHub redirects the old name for API calls). The `update_trigger` tool cannot change a routine's source.

## Scheduled tasks (Claude Routines, all unattended, all publish a PR for review, never push to `main`)
| Routine | Schedule (America/Los_Angeles) | Job |
|---|---|---|
| SoCal Lights city sweep (`trig_01H9a1iYVJNgtgzyAi8kNpn5`) | 4:13, 12:13 and 20:13 daily | Sweep one city group from `docs/coverage-cities.md` for new events; opens a `staging/sweep-g<N>-<date>` PR |
| SoCal Lights weekly upkeep (`trig_01VBEfN43zRQJwuHf4uqaHD7`) | Mondays 6:47 | Confirm dates, fix details, remove dead or duplicate events, season roll-overs; opens a `staging/upkeep-<date>` PR |
| SoCal Lights midweek upkeep, Nov-Dec (`trig_01Gm1USYSZ7oHRHQTTqkQoo5`) | Wed and Sat 6:52, November and December only | Date confirmation for events starting in the next 6 weeks; opens a `staging/midweek-<date>` PR |

Rey merges the PRs, which is what publishes the changes.

## Recently done
- Verified `CLOUDFLARE_API_TOKEN` survived the transfer: a manual run of the migrations workflow on 2026-10-27 authenticated and applied cleanly to the live D1 database (no-op, everything already applied). Note the workflow skips itself and still shows green if the secret is missing, so check that the "Apply migrations" step actually ran.
- Cloudflare Pages Git connection re-pointed at `Forza-TEK/socal-lights-app` (the dashboard showed a stale-link warning after the rename). The Cloudflare Workers and Pages GitHub app now has access to the repo, the warning is gone, and auto-deploys from `main` work again.
- Header logo and browser-tab icon switched to the SoCal Lights badge.
- Repository moved to `Forza-TEK/socal-lights-app`; project context added (`CLAUDE.md`).
