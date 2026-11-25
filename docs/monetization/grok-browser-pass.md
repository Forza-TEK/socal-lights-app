# SoCal Lights event intake (hand this whole file to Grok)

_Self-contained. Base URL `https://socallights.app`. Written 2026-11-15._

## What this is
You read event pages in **your own browser** (the sites that turn our server bot away let a normal browser in) and send what you read to the site. The site checks every row with the same rules as our sweeps. Rows that pass go on the map as **confirmed** events tagged **From Grok**; the owner can take any one off with one click. You never edit or delete anything: a row that matches an event already on the map (or one the owner took down) is answered `duplicate` and nothing changes.

## Hard rules (follow every one)
1. **Only publish what the event's own page states: the date, the time and the place.** If any of the three is missing, unclear or "TBD", skip the event. Never guess, estimate, copy last year's dates or invent a price. If the price is not listed, say `"price": "Price not listed"` with `"free": false`.
2. **Read pages like a normal visitor.** Public social posts and event pages are fine when they open without an account. Do not log in, do not solve CAPTCHAs or "verify you are human" checks, do not use tricks to get past a block, and do not read a page whose terms or robots.txt say no. If a page blocks you, skip it and list it in your summary. Never retry the same page under another identity.
3. **No personal information.** Events only: nothing about people, no emails or phone numbers in any field.
4. **Christmas, Halloween, holiday lights, boat parades, tree lightings, light shows, holiday markets and similar seasonal events** in Southern California only (Los Angeles, Orange, San Diego, Riverside, San Bernardino, Ventura, Santa Barbara counties). Cities must match our list exactly (the API tells you when one does not).
5. The key lives in your secret store as `GROK_INTAKE_KEY`. Never paste it in a chat, a file or a message.
6. Do not retry a rejected row unchanged. Fix what the reason says, or skip it.

## Authentication, User-Agent, errors
Every call needs:
```
Authorization: Bearer <GROK_INTAKE_KEY>
User-Agent: SoCalLights-Grok-Intake/1.0
Content-Type: application/json
```
Always send that custom `User-Agent` (Cloudflare blocks default script agents with an HTML `403`). `401` wrong or missing key. `503` the intake is not switched on yet: wait and tell the owner. `405` wrong method. `429` more than 30 calls a minute: wait and retry. `400` the body was wrong (the message says how).

## Step 1: get the work order (every run)
`GET /api/intake/work-order` returns what is thin on the map **today**: for each active season, the categories (tree lightings, parades, light shows, hotels, trains, and so on) that are EMPTY, THIN or LOW, with the searches to run and the places to look. Work the thinnest first. It also repeats the field list and limits.

## Step 2: read pages and send rows
`POST /api/intake/events`, at most **8 rows per call** (send more events in more calls):
```json
{ "dry_run": false, "rows": [ {
  "name": "Festival of Lights",
  "city": "Riverside",
  "season": "christmas",
  "type": "show",
  "start": "2026-11-27",
  "end": "2027-01-06",
  "hours": "5:30pm–9:30pm",
  "free": true,
  "price": "Free",
  "blurb": "One or two sentences, 20 to 180 characters, restating the listing. No links.",
  "url": "https://example.org/the-event-page",
  "image_url": "https://example.org/images/festival-of-lights.jpg",
  "venue": "The Mission Inn",
  "address": "3649 Mission Inn Ave, Riverside, CA 92501",
  "shows": ["date", "time", "place"],
  "evidence": "A short quote of what the page says about the date, time and place.",
  "seen": "2026-11-15"
} ] }
```
Field rules (the same rules our sweeps use; a row that breaks one is `rejected` with the reason):
- `season` and `type` come from the work order (`christmas` types: trot, thanks, walk, drive, parade, park, tree, nativity, **santa**, tour, show; the work order lists every season's types). Use `santa` for Santa photos, breakfast or brunch with Santa, and Santa visits and arrivals. Santa and Christmas names are never rejected: Santa Claus, St. Nick, Saint Nicholas, Father Christmas and Kris Kringle sent as the type become `santa`; Noel, Christmas, Xmas and X-mas sent as the season become `christmas`, and sent as the type they become the christmas type that fits the event (`santa`, `parade`, `tree`, and so on, otherwise `show`). Capitalization and punctuation do not matter.
- `start` / `end` are `YYYY-MM-DD`; `end` may equal `start`. An event that already ended is rejected.
- `hours` are the real times on the page, written like `7pm`, `7:30pm`, `5pm–9pm` (one en dash). Never "TBD" or "check site".
- `free` is `true` only when general admission is free; then `price` must start with "Free". Otherwise put the price text (for example `"Adults $15; kids $8"`).
- `url` is the `https` page you read. **Prefer the event's own website or its page on the venue's or city's site.** If the only source is a **public social post or event page** (Facebook, Instagram, TikTok, YouTube, Nextdoor, X) that you could open without logging in and that states the date, time and place, send that link instead. Use the post's own address (not a login or share link; tracking parameters are removed for you). Never a homepage or a page that only says "see our page".
- `image_url` is **optional**: a photo **link**, taken from the event's own page or post (its main picture, the event's flyer, or a photo of the venue). The site **links** to it exactly as it does for every event photo (the card shows it from that site and credits "Photo: <the site>"); it never copies or stores the picture, so do not upload anything. Rules: `https`; a normal picture address (jpg, png or webp); not a badge, newsletter cover, banner or page graphic, and a logo only for a **city or government event** (organizer or venue like "City of ...", "Parks and Recreation", a public library, or a .gov / .ca.us / cityof... website): that event may keep its city logo or seal, exactly as in our sweeps; for any other event a logo is dropped and the stock photo is used; no stock or watermarked images; no pictures with private individuals as the subject; no Facebook or Instagram picture-server links (`fbcdn`, `cdninstagram`), which expire within days: use the picture from the event's own website, or leave the field out. If unsure, leave it out. A bad link never rejects the row: the photo is dropped and the answer says why in `image`.
- `address` is the full street address with ZIP (or two cross streets for a parade). The site looks it up; an address it cannot find is rejected.
- `shows` must list `"date"`, `"time"` and `"place"`: your statement that the page showed all three. `evidence` quotes it. `seen` is the day you read the page.
- Unknown fields are rejected on purpose.

## Step 3: read the answer
```json
{ "ok": true, "dry_run": false, "publishing": true, "published": 1, "held": 0, "duplicate": 1, "rejected": 1,
  "results": [ { "index": 0, "name": "...", "verdict": "published", "image": "linked", "id": "grok-...", "map": "https://socallights.app/#e-grok-..." },
               { "index": 1, "verdict": "duplicate", "reasons": ["..."] },
               { "index": 2, "verdict": "rejected", "reasons": ["hours must be the real times from the page ..."] } ] }
```
- `published`: on the map now. `image` is `linked` when your photo link was kept, or `image dropped: <reason>` when it was not (the event is still published).
- `held`: passed every check but publishing is switched off (or the daily cap of 600 published rows was reached); the owner publishes it from Admin.
- `duplicate`: already known. Do not resend.
- `rejected`: read `reasons`; fix and resend once, or skip. A "lookup was unavailable" reason means resend later.

## Run schedule
**Every 2 days.** Start with **`"dry_run": true`** on your first run (every check, nothing stored) and show the owner the verdicts before sending real rows. A normal run: work order, read the thinnest categories' pages, send in batches of up to 8, then give the owner a short summary: how many published, held, duplicate, rejected, the pages that blocked you (so the owner can read them in the owner's own browser pass), and anything odd. Do not message the owner about each row.

## Events already on the map: the update call
New events go to `POST /api/intake/events`. For an event that is **already on the map**, use `POST /api/intake/updates` (same key and headers, at most **8 rows per call**, `dry_run` supported). It confirms an event or corrects it from the event's own page. The work order lists `events_to_confirm` (status `expected`, soonest first) and `events_without_photo`, each with the event's `id`; the same ids are in `GET /api/events`.

**Size and paging of those two lists.** Each list returns up to **200 rows** by default (about 80 KB for both). Query parameters on `GET /api/intake/work-order`, all optional, all whole numbers (anything else is a `400` that says what is allowed):
- `limit`: rows per list, 1 to **500** (default 200).
- `offset`: rows to skip in each list, 0 or more (default 0), for the next page. Lists are sorted soonest first, then by id, so pages do not shuffle.
- `skip_attempted_days`: 0 to 365 (default 0 = leave nothing out). Leaves out events you tried through the update call within that many days **with an `unchanged` or `skipped` result**; events whose last attempt `changed` something, and events never tried, always stay. Use `?skip_attempted_days=7` to see past rows that cannot be done yet.

Every row has two extra fields: `last_attempt` (UTC time like `2026-11-16T09:30:00Z` of your last real, non-dry-run update call for that event, or `null`) and `last_attempt_result` (or `null`): `changed` (applied or held), `unchanged` (the map already showed it), or `skipped` (the row was rejected, for example the hours were not real times). The answer also has `paging`: `{ limit, offset, skip_attempted_days, events_to_confirm_total, events_without_photo_total }` (totals after `skip_attempted_days`; page on while `offset + limit` is below the total). `dry_run` calls and ids that are not on the map are not recorded.
```json
{ "rows": [ {
  "id": "the-event-id-from-the-map",
  "url": "https://example.org/the-event-page",
  "shows": ["date", "time", "place"],
  "evidence": "A short quote of what the page says about the date, time and place.",
  "seen": "2026-11-16",
  "start": "2026-12-05", "end": "2026-12-05", "hours": "6pm–9pm",
  "price": "Free", "free": true,
  "image_url": "https://example.org/images/lights.jpg"
} ] }
```
- Send **only what you read.** With just `id`, `url`, `shows`, `evidence` and `seen` the row means "this page states the event's date, time and place": an `expected` event becomes `confirmed`. Add `start`/`end` (both), `hours`, or `price` with `free` only when the page differs from the map; the same rules as new events apply (real dates not already past, hours like `7pm` or `5pm–9pm` and never an estimate, `free` true only when the price text starts with "Free"). A date, time or price change needs `shows` listing `date`, `time` and `place`, an `evidence` quote and `seen` (the day you read the page).
- `image_url` alone (no other change) replaces a missing or dead linked photo, with the same checks and rules as for new events (link only, official site, no social picture-server links). It never replaces a photo we host or one the organizer added, and a photo alone does not confirm an event.
- `cancelled: true` (with `url`, `evidence`, `seen`) reports a cancellation. It is never applied automatically: it is held for the owner.
- You cannot change names, venues, addresses, types or remove anything.
- Answers per row: `applied` (changed on the map; the owner can undo it in Admin > From Grok > Updates), `held` (waiting for the owner, with the reason), `unchanged` (the map already shows this), or `rejected` (with reasons: fix or skip). Held always means: organizer-managed event (`u-` ids, contest homes, anything an organizer added), an event with a paid placement, a cancellation, a start more than 60 days from an already confirmed start, a daily limit of 600 applied updates, or the owner has switched the intake off. Do not resend held rows.

## Venues with no street address; casinos (added 2026-11-25)
Rows may carry `lat` and `lng`. They are used only when the address lookup fails: the row is published at that pin. A pin more than 40 km from the city key is rejected. Casino and resort venues and promo wording are allowed when the event fits a season (owner rule); the other spam words are still rejected.
