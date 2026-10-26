# Confirming the 2026 holiday events (Nov 1 – Dec 20)

Goal: turn `expected` rows into `confirmed` (or fix/remove them) before families plan their nights.
As of Oct 26, 2026 the holiday season (`christmas`) had 512 events: 193 confirmed, 319 expected.
Only 35 expected rows start before Nov 21, so most organizers will not have posted yet. Check each row when it is
due, not all at once.

## Priority order (by start date of the expected rows)

| Wave | Rows start | Count (Oct 26) | Check from | Re-check |
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

- 26 expected rows have hours that do not say "check site". Add it, so families know the times are estimates.
- Each run writes one migration `migrations/<next>_confirm_<date>.sql` (UPDATE statements), at most 60 changes per run, then pushes to `main`.
- After a run, spot-check three changed rows in the live API.

## Halloween rows

27 Halloween rows are still `expected`; the season ends Nov 2. Leave them; they roll over next year.
