# Confirming the 2026 holiday events (Nov 1 – Dec 20)

Goal: turn `expected` rows into `confirmed` (or fix/remove them) before families plan their nights.
**Numbers in this file are a dated snapshot. Get today's from `node scripts/coverage-report.mjs`** (one anonymous read of the public `/api/events`; it prints expected vs confirmed, expected rows due in 14 days, drive-by lights, expected rows that already started or ended, and expected rows whose hours do not end in "check site").
Snapshot 2026-11-11 (audit DAT-03): 1,095 upcoming events, 575 confirmed, 520 expected (47.5%); only 8 of the 153 drive-by lights listings (`drive`) are confirmed, and 39 expected rows start within 14 days.
Most organizers have not posted yet, so check each row when it is due, not all at once.

## What to confirm first (owner decision 2026-11-11)

1. **Drive-by and neighborhood lights (`drive`) first.** They are the core "lights" use case and the least verified. Confirm a home only from its own site, the organizer's or an official city/HOA page (rule 4 below).
2. **Everything that starts or runs within the next 14 days**, whatever its type (families plan this week).
3. Then the waves below, by start date.
4. Every promotion to `confirmed` sets `lc` (last checked) through the sweep; cards can show it. A row whose source cannot be loaded stays `expected` and is listed in the run report.
5. **Expected rows that already started or ended (DAT-08):** the weekly query is `SELECT id,start_date,end_date,url FROM events WHERE status='expected' AND end_date >= date('now') AND start_date < date('now')` (started) and `... AND end_date < date('now')` (ended); `coverage-report.mjs` prints the same ids. Resolve each one only where a public page proves it: confirm with the page's dates, correct the dates, or tag it `notice='cancelled'`. If no public page proves it, leave the row and list it for the owner. Never end or delete a row on a guess.

## Priority order (by start date of the expected rows)

| Wave | Rows start | Count (Oct 26 snapshot) | Check from | Re-check |
|---|---|---|---|---|
| A | by Nov 6 | 2 | now | every Monday |
| B | Nov 7–20 | 33 | Oct 26 | every Monday |
| C | Nov 21–Dec 4 | 167 (mostly tree lightings, parades) | Nov 2 | every Monday; twice a week from Nov 16 |
| D | Dec 5–14 | 110 | Nov 9 | every Monday; twice a week from Dec 1 |
| E | Dec 15+ | 7 | Nov 23 | weekly |

Within a wave: check Thanksgiving trots/feasts first (`trot`, `thanks`), then ticketed shows (`walk`, `tour`, `park`),
then parades and tree lightings (`parade`, `tree`), then neighborhood and home displays (`drive`) last.

## How to confirm one row

1. Open the row's `url`. If it is dead, find the event's current official page (organizer, venue, or the city's events page) and update `url`.
2. The organizer's page must show **2026** dates. Then set `status='confirmed'` and correct `start_date`, `end_date`, `hours`, `price`, `free`.
3. If the page says the event is not happening this year, `DELETE` it only when the notice is clear and official. Otherwise leave it `expected`.
4. Home displays: never promote a private home to `confirmed` from a roundup; only from its own site or an official city/HOA page.
5. If nothing is posted yet, change nothing. Do not invent dates.

## Hygiene

- Expected rows whose hours do not end in "check site" (the validator warns; `coverage-report.mjs` counts them: 36 on 2026-11-11, 26 on Oct 26). Add it, so families know the times are estimates. Write it as `; check site` after the times.
- Hours text has one style (validator rule `hours-style`): times like `7pm` or `7:30pm`, one en dash in ranges (`5pm–9pm`, `Fri–Sun`), and `; check site` as the only estimate phrase. `normalizeHours()` in `scripts/event-rules.mjs` gives the exact text.
- The `free` flag must agree with the price text (validator rule `free-price`): `free=1` only when the price starts with "Free"; a price such as "Kids $5; adults free" is `free=0`.
- Each run writes one migration `migrations/<next>_confirm_<date>.sql` (UPDATE statements), at most 60 changes per run, then pushes to `main`.
- After a run, spot-check three changed rows in the live API.

## Halloween rows

27 Halloween rows are still `expected`; the season ends Nov 2. Leave them; they roll over next year.
