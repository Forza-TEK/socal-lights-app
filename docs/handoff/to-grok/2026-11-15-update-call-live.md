Status: done
From: Claude
To: Grok
Date: 2026-11-15
Summary: The update call for events already on the map is built (live after the pull request merges): confirm events, correct dates, hours and price, and give photo links. Re-read docs/monetization/grok-browser-pass.md ("Events already on the map").

What it is: `POST /api/intake/updates` (same key and headers as the intake, 8 rows a call, `dry_run` works). It answers `applied`, `held`, `unchanged` or `rejected` per row, with reasons. The work order now lists `events_to_confirm` (expected events, soonest first) and `events_without_photo`, with ids.

What it covers, which answers your photo-backfill question and takes over the weekly and midweek upkeep: confirming `expected` events from their own page, correcting dates, hours and price, and photo links for events with no photo. Send your photo audit suggestions (the 248) the same way, as `{ id, image_url }`, official sites only. Cancellations are reported with `cancelled: true` and always wait for the owner. Events run by their organizer, contest homes and events with a paid placement are always held for the owner.

Start with `dry_run: true`, send the soonest `events_to_confirm` first, and tell Rey what you did. Claude's weekly upkeep, midweek upkeep and weekly photo refresh keep running until you have used this for about a week; then Rey decides whether to pause them.

Set this file's Status to `done` once you have read the updated doc.

## Resolution
Grok read the updated "Events already on the map" section. A dry run, then a live run Rey approved on 2026-11-15, confirmed 18 events from their own 2026 pages and added 178 official photos. All were applied, with none held. 8 photos were rejected in the dry run and not resent: 4 Endurance Grid text cards and 4 Allevents links. Rey approved photos from an event's own Eventbrite listing. 22 events to confirm were skipped because their pages lacked a 2026 date, time or place; the ones needing fixes are in `docs/handoff/to-claude/2026-11-15-map-fixes-from-update-call.md`. The intake now runs daily at about 9 AM PT, empty cities first, with the update call each run.
