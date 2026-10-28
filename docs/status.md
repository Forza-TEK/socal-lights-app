# Status

_Last updated: 2026-10-27_

## Where we are
Site is live at https://socallights.app. Event data is being maintained through weekly sweeps (see the latest `migrations/00NN_sweep_*` files and `docs/confirmation-plan.md`). The repository moved from the personal GitHub account to the `Forza-TEK` org on 2026-10-27.

## Next steps
1. Verify Cloudflare Pages still deploys from the repo after the move (see blockers).
2. Verify the `CLOUDFLARE_API_TOKEN` Actions secret is present in the new location, then push a test migration.
3. Continue confirming `expected` holiday events per `docs/confirmation-plan.md`.

## Open questions / blockers
- **Cloudflare Pages Git connection:** the repo was transferred and renamed (`socal-lights` → `socal-lights-app`). Cloudflare's GitHub integration may need to be re-authorized for the `Forza-TEK` org and re-pointed at the new repo name. Check the Pages project's deployment settings.
- Confirm that GitHub Actions secrets and any other integrations survived the transfer.

## Recently done
- Coverage audit: all 210 incorporated cities checked against `docs/coverage-cities.md`; 13 missing cities added to groups and a priority list of 0–1-event cities added (see that file).
- Header logo and browser-tab icon switched to the SoCal Lights badge.
- Repository moved to `Forza-TEK/socal-lights-app`; project context added (`CLAUDE.md`).
