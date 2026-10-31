# SoCal Lights Finder (SoCalLights.app)

Christmas lights, Halloween, boat parades and other holiday events across Southern California on a street-level map, plus a "Showcase a House" gallery where homeowners and installers post their lights.

- **Live:** https://socallights.app
- **Admin:** https://socallights.app/admin/ (protected by Cloudflare Access; owner rey@forza-tek.com)
- **Owner:** Forza-TEK (GitHub org `Forza-TEK`)

## Stack
Runs on Cloudflare's free tier. See `README.md` for the full setup.

| Piece | Where |
|---|---|
| Static site | `public/` (plain JS, `index.html`, `app.js`, `seasons.js`, `stock.js`, `cities.js`) |
| Server code | `functions/` (Cloudflare Pages Functions: `api/events.js`, `api/submit.js`, `api/posts.js`, `api/photo`, `api/admin`) |
| Database | Cloudflare D1 (`DB` binding), schema and data in `migrations/` |
| Photos | Cloudflare R2 bucket `socal-lights-photos` (`PHOTOS` binding) |
| Admin login | Cloudflare Access; the admin API also verifies the signed Access token |
| Spam check | Cloudflare Turnstile (secret `TURNSTILE_SECRET` lives in Pages secrets) |
| Map | MapLibre with OpenFreeMap tiles |

Config is in `wrangler.toml`. No build step: the Pages output directory is `public`.

## Commands
```sh
npm install
npm run dev                  # local Pages dev server (wrangler pages dev)
npm run validate             # validate migrations added since origin/main and check their source URLs
npm run db:migrate:local     # apply migrations to the local D1 database
npm run db:migrate:remote    # apply migrations to the live D1 database (normally done by CI instead)
```

## How event data changes
Events live in the D1 database and change **only through new migration files** in `migrations/`.
Pushing a new migration to `main` runs `.github/workflows/d1-migrations.yml`, which validates it and applies it to the live database.

Read `docs/updating-events.md` before touching events. Key rules:
- Never edit an existing migration. Add a new one with the next number.
- Upsert events (`INSERT … ON CONFLICT(id) DO UPDATE …`), don't plain-insert.
- Only add real events found in public sources. Never invent events, dates or prices.
- Run `npm run validate` before pushing.

Contests, accounts and sign-in (branch work, not live yet): `docs/contests.md`.

Other docs: `docs/coverage-cities.md` (where to search), `docs/city-sweep.md`, `docs/confirmation-plan.md` (turning `expected` events into `confirmed`).

## Rules
- Cloudflare serves CSS/JS with a 4-hour browser cache that `_headers` can't override, so whenever you change `public/styles.css` or `public/app.js`, bump the `?v=` value on their tags in `public/index.html` (the HTML is always revalidated), or phones keep the old UI.
- Do not commit secrets. `CLOUDFLARE_API_TOKEN` is a GitHub Actions repository secret; `TURNSTILE_SECRET` is a Cloudflare Pages secret.
- The site redeploys on every push to `main`, and migrations apply to the **live** database. Prefer a branch for anything non-trivial. The scheduled routines are the exception: they publish event migrations straight to `main` after validation (see `docs/updating-events.md`).
- Update `docs/status.md` at the end of every working session.

## Where work happens and what runs on its own
See `docs/operating-guide.md` (one Claude Code session with this repo attached; table of the scheduled `[SCL]` tasks).

## Current status
See `docs/status.md`.
