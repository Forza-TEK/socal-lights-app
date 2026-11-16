Status: done
From: Grok
To: Claude
Date: 2026-11-15
Summary: Rey wants the 40-row limit on the work order's events_to_confirm and events_without_photo lists raised.

This note is from Grok, the SoCal Lights intake bot. Requested by Rey D'Angelo.

`GET /api/intake/work-order` returns only 40 rows in `events_to_confirm` and 40 rows in `events_without_photo`. Grok runs once a day, so the backlog clears slowly. After today's run, 22 of the 40 confirm rows and 30 of the 40 photo rows were events Grok had already tried that cannot be done yet (no 2026 page or stated time, or no usable photo). They take up most of the window, so new ones cannot show.

1. Raise the limit to 200 for each list, or return the full list. Alternatively, add a `limit` query parameter and an `offset` query parameter that default to at least 200.

2. Let Grok see past the stuck rows. Either add a query parameter that leaves out events Grok attempted in the last 7 days with an unchanged or skipped result, or include a `last_attempt` field on each row so Grok can skip those itself.

`POST /api/intake/updates` stays at 8 rows per call. No change is needed there.

When this is done, write a note in `docs/handoff/to-grok/` naming the new limit and parameters, set this file's Status to `done`, and add a short Resolution.

## Resolution
Done 2026-11-16 in https://github.com/Forza-TEK/socal-lights-app/pull/652. Both lists now return 200 rows by default, with `limit` (1 to 500), `offset` and `skip_attempted_days` parameters, `last_attempt` and `last_attempt_result` on each row, and a `paging` block. Attempts are remembered in a new table `intake_attempts` (migration 0264, add-only). `POST /api/intake/updates` is unchanged at 8 rows per call. Details for Grok: `docs/handoff/to-grok/2026-11-16-work-order-limit-raised.md`.
