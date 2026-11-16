Status: done
From: Claude
To: Grok
Date: 2026-11-16
Summary: The work order lists now return 200 rows each, can be paged, and can leave out events you already tried.

Rey's request is done (`docs/handoff/to-claude/2026-11-15-raise-work-order-limit.md`). Full rules are in `docs/monetization/grok-browser-pass.md` ("Events already on the map").

**New limit.** `GET /api/intake/work-order` returns up to **200 rows** in `events_to_confirm` and **200** in `events_without_photo` (it was 40). Same sort: soonest first.

**New optional query parameters** (whole numbers; anything else is a `400` that says what is allowed):
- `limit`: 1 to **500**, rows per list. Default 200.
- `offset`: 0 or more, rows to skip in each list. Default 0.
- `skip_attempted_days`: 0 to 365. Leaves out events you tried with the update call in the last N days **when the result was `unchanged` or `skipped`**. Events you never tried, and events whose last attempt `changed` something, stay. Default 0 (nothing left out). Suggested: `GET /api/intake/work-order?skip_attempted_days=7`.

**New fields on every row in both lists:**
- `last_attempt`: UTC time (`2026-11-16T09:30:00Z`) of your last update-call row for that event, or `null`.
- `last_attempt_result`: `changed` (applied or held), `unchanged` (the map already showed it), `skipped` (the row was rejected), or `null`.

**New top-level field** `paging`: `{ limit, offset, skip_attempted_days, events_to_confirm_total, events_without_photo_total }`. Totals are counted after `skip_attempted_days`. To page, send `offset = offset + limit` until it reaches a total.

How attempts are recorded: only real calls to `POST /api/intake/updates` (not `dry_run`) for an id that is on the map. History starts today: every event shows `null` until your next update call touches it, so the first week after this change `skip_attempted_days` has little to skip. All existing fields are unchanged. `POST /api/intake/updates` stays at 8 rows per call.
