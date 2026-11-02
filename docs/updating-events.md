# Updating events

For where to look, see [coverage-cities.md](coverage-cities.md): the deep search checks every city in every region.

Events live in the D1 database. Changes go in through **new migration files** in `migrations/`.
Pushing a new migration to `main` runs `.github/workflows/d1-migrations.yml`, which applies it to the
live database (the site itself redeploys on every push through Cloudflare Pages).

## Rules

1. **Never edit an existing migration.** Add a new file with the next number:
   `migrations/0006_<short-name>.sql`, `0007_...`, and so on. Check `ls migrations` for the last number.
2. **Upsert, don't insert.** Use this form so a file can add new events *and* update existing ones:

   ```sql
   INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
   VALUES ('id', ...), ('id2', ...)
   ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
     type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
     free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
     blurb=excluded.blurb, url=excluded.url, season=excluded.season,
     venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
   ```

   To change only a few fields, a plain `UPDATE events SET start_date='…', end_date='…', status='confirmed', hours='…', updated_at=datetime('now') WHERE id='…';` is fine.
   Escape apostrophes by doubling them (`'Knott''s'`).
3. **Cancelled or postponed:** do not delete the event. Show it with a tag so people who saved it find out:
   `UPDATE events SET notice='cancelled', updated_at=datetime('now') WHERE id='…';` (or `'postponed'`). If the organizer later brings it back,
   `UPDATE events SET notice='' WHERE id='…';`. A normal upsert never touches `notice`, so a sweep that refreshes an event's dates leaves an
   organizer's or an earlier sweep's tag in place; clearing it is always an explicit statement like the one above. Cancelled events stay on the map
   with a red tag and are left out of the weekly email. When a postponed event gets new dates, update the dates **and** clear the notice in the same file.
4. **Price wording:** use `Free`, a real price or range (`$12`, `From $10`, `$10-$25`), `Price not listed` (no price anywhere), or `Check listing` (the source says to see its page). Do not invent other phrases such as "Not listed" or "Check site".
5. **Removing an event:** `DELETE FROM events WHERE id='…';` — only when it's cancelled for good.
4. Events that have ended disappear from the site automatically; don't delete them.

## Field rules

| field | rule |
|---|---|
| id | lowercase letters, digits, hyphens, ≤ 40 chars, unique. Reuse the same id for the same event every year. |
| county | one of: Los Angeles, Orange, Riverside, San Bernardino, San Diego, Ventura, Santa Barbara |
| season / type | season is a key in `public/seasons.js`; type must be one of that season's `types` |
| start_date / end_date | `YYYY-MM-DD`, end ≥ start |
| status | `confirmed` only when the organizer has published this year's dates; otherwise `expected` (dates estimated from last year, and `hours` says "check site") |
| free | 1 or 0 |
| venue | the place name people type into Google Maps (e.g. `Crown Valley Community Park`). For parades: the start or main viewing area. |
| address | full street address with ZIP (`29751 Crown Valley Pkwy, Laguna Niguel, CA 92677`) or an intersection (`Main St & Electric Ave, Seal Beach, CA 90740`). **Directions use this field**, so it must be right. |
| lat / lng | the venue itself, not the city center. Get them by geocoding the address (OpenStreetMap Nominatim: `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=<address>`) or from the venue's map listing; inside lat 32–35.8, lng −121.5 to −114 |
| blurb | one sentence in our own words, ≤ 180 chars — never copied text |
| url | the event's **own** page (organizer or venue) whenever one exists, not a roundup listing many events. The site adds a text fragment so roundup links scroll to the event's name, but an event page is better. |
| image | optional. The event's own photo: the `og:image` of its official page when that is a real photo of the event (not a logo, flyer or clip art), landscape, under 1.5 MB. Set it with `UPDATE events SET image='…' WHERE id='…';`. Leave it empty otherwise: the card then shows the stock photo for the event's type (`public/stock.js`). Avoid `--` inside the URL (split it as `'…-' || '-…'`), since the validator reads `--` as a comment. |

Only add real events found in public sources. Never invent events, dates or prices.

**Contest homes:** homes entered in or winning a decorating contest are added as events (Christmas `drive`; Halloween `haunt`/`family`) with the published street address and the contest page as `url`. Only use addresses a public page published for visitors or judging. Details in [city-sweep.md](city-sweep.md).

See [sweep-methods.md](sweep-methods.md) for the photo, pin-audit and migration-size rules that every run follows (never more than 30 rows per INSERT: D1 rejects larger statements).

## Rolling a season into next year

When a season's events have all ended, re-add them for next year with the **same ids** (upsert), new
dates and `status='expected'`, then confirm them as organizers announce dates. Also update that
season's `quickDates` and `dateRange` in `public/seasons.js` to the new year.

## Validate before you push

```sh
npm run validate                                  # checks migrations added since origin/main, and loads each source url
node scripts/validate-migrations.mjs --files migrations/0041_x.sql   # one file, no network
```

It replays every migration in a scratch database and checks the rows the new files add or change: id format,
county, season/type, real dates (end ≥ start), coordinates inside Southern California, a pin more than 30 km from
its city, blurb length, empty address/venue, bad or dead urls, duplicates, reused ids, and unguarded
`DELETE`/`UPDATE`/`DROP`. **Errors must be fixed. Warnings need a look.** A deliberate bulk change can carry the
comment `-- validate: allow-destructive`. The deploy workflow runs the same checks (hard errors only) before it
applies anything to the live database.

## Scheduled and unattended runs (publish directly)

As of 2026-10-28 the scheduled Claude Routines (city sweep, weekly upkeep, midweek upkeep) publish **without human review**. Rey authorized this. The safeguards are:

1. The run must verify every row against a page it actually loaded and leave out anything it cannot verify.
2. `npm run validate` must report **0 errors** (warnings are reviewed, and rows that cannot be defended are dropped).
3. The run fetches `origin/main`, uses the next free migration number, and pushes to `main` (rebasing and renumbering if another run landed first).
4. The deploy workflow (`d1-migrations.yml`) re-runs the validator's hard-error gate before it touches the live database.
5. The run checks that the deploy workflow succeeded and reports the failure if not.

If `main` is ever protected, the run falls back to a `staging/<task>-<date>` branch plus a PR and merges it itself once the "Validate migrations" comment shows 0 errors.

To undo a bad publish, add a new migration that corrects or deletes the rows (never edit an existing migration).

## Checking your work

```sh
npm ci
npx wrangler d1 migrations apply socal-lights --local
npx wrangler pages dev --port 8788   # then open http://localhost:8788/#<season>
curl -s localhost:8788/api/events | python3 -c "import json,sys,collections;print(collections.Counter(e['sn'] for e in json.load(sys.stdin)))"
```
