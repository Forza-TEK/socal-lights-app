# Production deploy stalled (Cloudflare Pages)

Audit operations H3: three incidents in 5 days. Pages builds run **one at a time**, so one hung build (often a *preview* build) holds up every production deploy, every sweep and every merge. The database can then get ahead of the deployed code, because migrations apply separately.

## Detection (read-only)
- `.github/workflows/deploy-watch.yml` every 10 minutes (GitHub may run it late) and the admin digest (3 a day, section "Scheduled jobs and deploys") use one rule, `functions/_lib/deploys.js`:
  1. a deployment, preview or production, still **active** 8+ minutes after it was created;
  2. the newest production deployment **failed** (reported for 4 hours);
  3. (workflow only, it knows main's head) production has **no deployment for main's latest commit** 20+ minutes after that commit.
- It opens or comments on the GitHub issue **"Production deploy stalled"** (emails the owner) and closes it when healthy. It never writes to Cloudflare.
- **Permission needed (owner, once):** the check calls `GET /accounts/<id>/pages/projects/socal-lights/deployments`. Add **Account > Cloudflare Pages > Read** to the tokens:
  1. Cloudflare dashboard > top right avatar > My Profile > API Tokens.
  2. Token `CLOUDFLARE_API_TOKEN` (the one in GitHub secrets, "D1 Edit" + "Workers R2 Storage Edit") > Edit > Add permission: Account > Cloudflare Pages > Read > Continue to summary > Update token. The value does not change.
  3. For the digest: the same edit on the token stored as the Pages secret `CF_ANALYTICS_TOKEN` (or create a token and store it as Pages secret `CF_PAGES_TOKEN`); `CF_ACCOUNT_ID` is already used by the usage panel.
  Until then the check reports "Deploy check not_configured" (a notice, never a failed run, and one line in the digest).

## Manual fix (2 minutes)
1. Cloudflare dashboard > **Workers & Pages** > **socal-lights** > **Deployments**.
2. Find the deployment that says **Building** / **Deploying** for many minutes (look at "Preview" ones first: a stuck preview blocks production). Click it > **...** (or "Manage deployment") > **Cancel deployment**. Do not delete anything.
3. Open the newest **Production** deployment (branch `main`). If it is Failed, Canceled or Skipped: **...** > **Retry deployment**. If production is on an old commit and no deployment exists for the latest commit, push nothing; use **Create deployment** > Production > branch `main`.
4. Wait for **Success**, then check https://socallights.app loads and `curl -s https://socallights.app/api/health`.
5. Close the GitHub issue if it did not close itself.

## Stop the cause: turn off preview deployments (owner setting, recommended)
79 previews were built in one day and each blocks the queue. In Cloudflare: Workers & Pages > socal-lights > **Settings** > **Builds** (or "Builds & deployments") > **Branch control** > **Preview branch** (or "Branch deployments") > choose **None** (or "Custom branches" and leave the list empty) > Save. Production builds from `main` are unchanged. (To test a branch later, switch it back to "All non-production branches" temporarily.) If previews stay on, they are isolated from production data: see `preview-isolation.md`.
Also consider: Settings > Builds > **Build watch paths** (Include paths `public/*, functions/*, wrangler.toml, package.json`) so docs-only and migration-only pushes do not trigger a build, if your plan shows the option.
