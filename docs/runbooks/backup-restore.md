# Backup and restore runbook

## What is backed up
| What | How | Where | Kept |
|---|---|---|---|
| The whole D1 database (events, users, posts, contests, votes, orders, claims, submissions) | `.github/workflows/backup.yml`, every night about 2-3 am Pacific, `wrangler d1 export socal-lights --remote`, gzipped, checked for size and tables, uploaded, read back and compared | PRIVATE R2 bucket `socal-lights-backups`, `daily/socal-lights-YYYY-MM-DD.sql.gz` (+ `.sha256`), `latest.sql.gz`, and on the 1st of each month `monthly/socal-lights-YYYY-MM.sql.gz` | **Retention rule:** `daily/` 35 days, `monthly/` 400 days (R2 lifecycle rules set by the workflow), `latest.sql.gz` is overwritten each night |
| Photos (house photos, avatars, installer and sponsor logos still referenced by the database) | Same workflow, Sundays and on demand: `scripts/backup-photos.mjs` | Same bucket, `photos/<key>` | Add-only, never deleted (a few MB; 10 GB is free) |
| Rolling point-in-time history | Cloudflare D1 Time Travel (built in) | Cloudflare | Free plan 7 days, paid 30 days (confirm in the dashboard: D1 > socal-lights > Time Travel) |

**Never** store a backup as a GitHub artifact or commit it: this repository is public and the file holds emails.
A failed backup opens (or comments on) a GitHub issue titled "Nightly backup failed", which emails the repository owner.
Run it by hand any time: GitHub > Actions > "Nightly backup" > Run workflow.

## Setup (one time, owner)
The workflow needs the existing `CLOUDFLARE_API_TOKEN` repository secret to also have R2 permission.
1. Cloudflare dashboard > top right avatar > My Profile > API Tokens.
2. Find the token used for GitHub (the one with "D1 Edit") > Edit.
3. Add permission: Account > Workers R2 Storage > Edit. Continue to summary > Update token. (The token value does not change, so the GitHub secret stays as is.)
4. GitHub > Actions > "Nightly backup" > Run workflow. It creates the private bucket `socal-lights-backups` itself. Never give the bucket a public URL or custom domain.
   If you prefer to do it by hand: Cloudflare > R2 Object Storage > Create bucket > name `socal-lights-backups` > leave "Public access" off.
5. Once a run is green, check R2 > socal-lights-backups for today's file.

## Restore, from least to most drastic
1. **A recent bad change (last 7 days): Time Travel.** It rewinds the whole database in place, so anything created after the chosen time (new users, posts, orders) is lost.
   `npx wrangler d1 time-travel info socal-lights` shows the current bookmark; `npx wrangler d1 time-travel restore socal-lights --timestamp=<ISO time before the mistake>` rewinds. The command prints the previous bookmark so the restore itself can be undone.
2. **A single table or some rows:** restore the backup into a scratch database (step 3), then copy only what you need with `INSERT ... SELECT` or a one-off `wrangler d1 execute --file`.
3. **Full restore from the nightly file (Time Travel too old, or the database is gone):**
   1. Get the file: Cloudflare > R2 > socal-lights-backups > `daily/...` > download, or `npx wrangler r2 object get socal-lights-backups/latest.sql.gz --file latest.sql.gz --remote`. `gunzip latest.sql.gz`.
   2. Check it: `sha256sum` against the `.sha256` file if you use a dated copy (the hash is of the gzipped file).
   3. Create a new database: `npx wrangler d1 create socal-lights-restore`.
   4. Load it: `npx wrangler d1 execute socal-lights-restore --remote --file latest.sql`. The export includes the schema and the `d1_migrations` table, so no migrations need to be run.
   5. Check it: `npx wrangler d1 execute socal-lights-restore --remote --command "SELECT COUNT(*) FROM events"` and users, posts, contests.
   6. Switch the site: in `wrangler.toml` change `database_id` (and keep `database_name` consistent with the workflows) to the new database, merge to `main`, and confirm the site loads. Also update the D1 binding in Cloudflare Pages > Settings > Bindings if it is set there. Keep the old database until you are sure.
4. **Photos:** copy from `socal-lights-backups/photos/<key>` back to `socal-lights-photos/<key>` with `wrangler r2 object get` and `put --remote`.

## Testing the backup
Once a quarter: do step 3 into a scratch database and compare row counts with live. Delete the scratch database afterwards.

## Not covered
Cloudflare Pages secrets, Access settings and the DNS zone are not in the database. Their list is in `docs/operating-guide.md` and the README setup steps.
