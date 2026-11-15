Status: open
From: Grok (SoCal Lights intake bot)
To: Claude
Date: 2026-11-15
Summary: Grok's event-intake scope, so Rey can split work with Claude.

Requested by Rey D'Angelo. Rey wants to make sure Grok and Claude don't overlap.

## What Grok does

- **Event intake only.** Grok reads event pages and POSTs rows to `POST /api/intake/events` (max 8 per call) using `GROK_INTAKE_KEY`, following `docs/monetization/grok-browser-pass.md`. Grok never edits code, the database, Admin, or existing records. Its only repo writes are notes in `docs/handoff/`, through pull requests.
- **Schedule.** An automated run every 2 days at about 9:11 AM PT (next run November 17, 2026), plus extra sweeps when Rey asks. November 15 had several.
- **Coverage.** 7 counties (LA, Orange, San Diego, Riverside, San Bernardino, Ventura, Santa Barbara), every city and community key in `public/cities.js`. Thinnest work-order categories first.
- **Seasons and types.** Thanksgiving, Christmas (including the new `santa` type), Hanukkah and menorah lightings, New Year's Eve, First Day hikes and polar plunges, Lunar New Year, and whatever else the work order lists.
- **Website sweep.** Official event pages from cities and parks and recreation, chambers, churches, museums, zoos and gardens, theme parks, malls and shopping centers, and holiday-light displays.
- **Hospitality sweep.** Restaurants, bars, hotels and resorts, wineries (Temecula, Santa Ynez and Los Olivos, Malibu, Ramona), breweries, distilleries and cideries. Covers holiday dinners and brunches, Santa breakfasts, pop-up bars, New Year's Eve parties, tree lightings and markets.
- **Social sweep (read-only, approved by Rey).** Signed-in Facebook (Events search), Instagram (`socal_lightsapp`), X, TikTok and Nextdoor. Read only. Never posts, likes, messages or RSVPs. An official page URL is preferred. A social URL is used only when no official page exists.
- **Photos.** Sends `image_url` only from the event's own official site, never from social image hosts.
- **Read-only photo audit.** On November 15 Grok ran a one-time read of `GET /api/events` and `GET /api/events/<id>` to check photos on all 1,222 records. No writes. Results: 456 working photos, 673 missing, 68 stock, 24 broken, 1 expiring Facebook image (`lo-lights-on-symphony-anaheim`), and 248 suggested official replacements. Grok cannot apply these because the intake rejects duplicates. The CSV is available on request.
- **Dedupe.** Grok checks the public map before sending and does not resend existing events.

## What Grok does NOT do

- No code, schema, migration, Admin approval, photo backfill or update of existing rows, seeding scripts, or bulk imports.

## Questions for Claude

1. Do you (or any script, cron, seed or import you maintain) add events from any of these sources or regions? Please list them, so Rey can split ownership.
2. Are there any sources, categories or ID prefixes (other than `grok-`) Grok should avoid?
3. Should the photo backfill for existing records be yours (an update path or Admin job)? Grok can hand over the audit list.

Please reply in `docs/handoff/to-grok/` and mark this file done.
