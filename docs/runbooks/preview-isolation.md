# Preview deployments and production data (audit operations H4)

## Facts (read from the Pages API 2026-11-06)
- Preview deployments (every non-production branch, `*.pages.dev`) were bound to the **production** D1 database `socal-lights` and R2 bucket `socal-lights-photos`. `wrangler.toml` had no `[env.preview]`, and a repo `wrangler.toml` overrides what the dashboard binds (identical `wrangler_config_hash`).
- Previews have no `TURNSTILE_SECRET`, and `verifyTurnstile` allowed everything when it was missing.
- A preview database `socal-lights-preview` (`b2f856bf-bb6c-44aa-b17b-c28040f4de52`) and bucket `socal-lights-photos-preview` exist and hold no real data.

## What the code now does (PR "monitoring you can trust")
- `wrangler.toml` has `[env.preview]` with its own `DB` (preview database), `PHOTOS` (preview bucket), the same public vars, and `TURNSTILE_REQUIRED = "1"`. Bindings are not inherited between environments in Pages, so all are repeated. Production keeps the top-level settings.
- `verifyTurnstile` (functions/_lib/util.js): with no `TURNSTILE_SECRET`, it refuses (fails closed) when `TURNSTILE_REQUIRED = "1"`. Local dev and production are unchanged.
- `.github/workflows/d1-migrations.yml` also runs `wrangler d1 migrations apply DB --remote --env preview` (best effort, never blocks the live migration), so the preview database follows the schema.
- Tested: config parses (`wrangler pages functions build`, `d1 migrations list --env preview`), `tests/monitoring.test.mjs` (Turnstile).

## Verify after the next preview build (owner or any session, 2 minutes)
1. Cloudflare > Workers & Pages > socal-lights > Settings > Bindings > switch the view to **Preview**: `DB` must say `socal-lights-preview` and `PHOTOS` `socal-lights-photos-preview`. (If the Bindings tab says "managed by wrangler.toml" that is expected.)
2. Open any preview URL's `/api/events`: if the preview database is empty or old it shows few events or an error. That is correct and proves isolation. If it shows the full live list, the binding is still production: do step 3.
3. Cannot be done from code: dashboard > Settings > Bindings > Preview > edit `DB` to `socal-lights-preview` and `PHOTOS` to `socal-lights-photos-preview` > Save. Then Settings > Variables and Secrets > **Preview** tab > add secret `TURNSTILE_SECRET` = `2x0000000000000000000000000000000AA` (Cloudflare's published always-fail test secret): previews then refuse every spam-checked post even if the code guard were missing.
4. The preview database must have the schema: run `npx wrangler d1 migrations apply DB --remote --env preview` once (or run the "Apply database migrations" workflow by hand). If it reports a table already exists, the preview database was seeded without the migrations table: recreate it (`wrangler d1 delete socal-lights-preview`, `wrangler d1 create socal-lights-preview`, put the NEW id in `[env.preview]`).

## Risk
Cannot be proven before a real preview builds. If `[env.preview]` were ignored by Pages the previous (unsafe) behaviour remains, so the safest fix is also the owner setting in `deploy-stall.md` (turn off preview deployments).
