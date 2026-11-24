# Restore rehearsal (owner, about 15 minutes, a few times a year)

Proves that the backup in `socal-lights-backups` can really bring back the database AND every file the database points at (audit F-22, F-23). It restores into a scratch folder on your computer. It never writes to production D1 or to the live photo bucket.

## What the backup covers
The nightly D1 export (`daily/`, `latest.sql.gz`, `monthly/`) and, copied on Sundays into `photos/<key>`, every file the rows reference: home photos (`p/`, `pending/`), photos a homeowner hid (`h/`), home clips (`v/`), event owner photos (`e/`), event clips (`ev/`), avatars, installer logos, contest logos, sponsor logos and sponsor receipts. The list of sources is `scripts/lib/photo-keys.mjs`; a test fails if the app starts writing a new key prefix that is not in it.
Files uploaded since the last Sunday copy are not in the backup yet, so a rehearsal done on a Wednesday can show a few missing newest files. Run it after a Sunday copy (or start "Nightly backup" by hand from GitHub > Actions > Run workflow first).

## Steps
1. On your computer, in a clone of the repo: `npm ci`, then `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` to the token that can read R2).
2. Download the newest export: `npx wrangler r2 object get socal-lights-backups/latest.sql.gz --file latest.sql.gz --remote`.
3. Run the rehearsal (needs Node 22.13 or newer):
   `node --no-warnings scripts/rehearse-restore.mjs --dump latest.sql.gz --from-bucket socal-lights-backups --live-bucket socal-lights-photos --sample 20 --scratch ./restore-scratch`
   It reads from R2 only. If you already downloaded the backup bucket to a folder, use `--from-dir <folder that contains photos/>` instead of `--from-bucket`.
4. Read the result:
   - `restore rehearsal: PASSED` and the line `files: N of N restored` mean every file the database points at came back.
   - `database:` lists the table and row counts (events, users, posts, contests, orders). Compare them with Admin (they should be close to live; the export is up to a day old).
   - `sample:` checks at least one object of every kind (photo, clip, logo, receipt...), that it is not empty, that its first bytes match its type, and with `--live-bucket` that it is byte for byte the live copy.
   - Any `missing:` line is a file the database points at that the backup does not have. Run "Nightly backup" by hand and repeat. If it stays missing, the file is probably also gone from production (a row pointing at nothing); `node scripts/verify-backup.mjs latest.sql.gz --photos socal-lights-backups --live-bucket socal-lights-photos` separates the two cases.
5. Write the date and counts into the "Testing the backup" section of `docs/runbooks/backup-restore.md`.
6. Delete the scratch folder (`rm -rf restore-scratch latest.sql.gz`): it holds emails and sponsor receipts. Do not run the rehearsal in GitHub Actions (its logs are public).

## Optional: a full database restore
The script loads the export into a SQLite file (`restore-scratch/restore.sqlite`), which you can query. To rehearse the real D1 path too, follow step 3 of "Restore" in `docs/runbooks/backup-restore.md` (a scratch D1 database named `socal-lights-restore`, deleted afterwards).

## What the nightly job already checks on its own
Every night the export is loaded into SQLite (`verify-backup.mjs`). On Sundays and on demand it also checks that every file the rows point at is in the backup bucket (`--photos`): it fails if a file that exists in production is missing from the backup, and only warns for rows that already point at nothing.
