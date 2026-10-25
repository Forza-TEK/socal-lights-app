# Updating events

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
3. **Removing an event:** `DELETE FROM events WHERE id='…';` — only when it's cancelled for good.
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

Only add real events found in public sources. Never invent events, dates or prices.

## Rolling a season into next year

When a season's events have all ended, re-add them for next year with the **same ids** (upsert), new
dates and `status='expected'`, then confirm them as organizers announce dates. Also update that
season's `quickDates` and `dateRange` in `public/seasons.js` to the new year.

## Checking your work

```sh
npm ci
npx wrangler d1 migrations apply socal-lights --local
npx wrangler pages dev --port 8788   # then open http://localhost:8788/#<season>
curl -s localhost:8788/api/events | python3 -c "import json,sys,collections;print(collections.Counter(e['sn'] for e in json.load(sys.stdin)))"
```
