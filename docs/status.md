# Status

_Last updated: 2026-10-27_

## Where we are
Site is live at https://socallights.app. Event data is being maintained through weekly sweeps (see the latest `migrations/00NN_sweep_*` files and `docs/confirmation-plan.md`). The repository moved from the personal GitHub account to the `Forza-TEK` org on 2026-10-27.

## Next steps
1. Verify the `CLOUDFLARE_API_TOKEN` Actions secret is present in the new location, then push a test migration.
2. Continue confirming `expected` holiday events per `docs/confirmation-plan.md`.

## Open questions / blockers
- Confirm that GitHub Actions secrets and any other integrations survived the transfer.

## Recently done
- Cloudflare Pages Git connection re-pointed at `Forza-TEK/socal-lights-app` (the dashboard showed a stale-link warning after the rename). The Cloudflare Workers and Pages GitHub app now has access to the repo, the warning is gone, and auto-deploys from `main` work again.
- Header logo and browser-tab icon switched to the SoCal Lights badge.
- Repository moved to `Forza-TEK/socal-lights-app`; project context added (`CLAUDE.md`).
