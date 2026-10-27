# Status

_Last updated: 2026-10-27_

## Where we are
Site is live at https://socallights.app. Event data is being maintained through weekly sweeps (see the latest `migrations/00NN_sweep_*` files and `docs/confirmation-plan.md`). The repository moved from the personal GitHub account to the `Forza-TEK` org on 2026-10-27.

## Next steps
1. Continue confirming `expected` holiday events per `docs/confirmation-plan.md`.

## Open questions / blockers

## Recently done
- Verified `CLOUDFLARE_API_TOKEN` survived the transfer: a manual run of the migrations workflow on 2026-10-27 authenticated and applied cleanly to the live D1 database (no-op, everything already applied). Note the workflow skips itself and still shows green if the secret is missing, so check that the "Apply migrations" step actually ran.
- Cloudflare Pages Git connection re-pointed at `Forza-TEK/socal-lights-app` (the dashboard showed a stale-link warning after the rename). The Cloudflare Workers and Pages GitHub app now has access to the repo, the warning is gone, and auto-deploys from `main` work again.
- Header logo and browser-tab icon switched to the SoCal Lights badge.
- Repository moved to `Forza-TEK/socal-lights-app`; project context added (`CLAUDE.md`).
