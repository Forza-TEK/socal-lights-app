Status: done
From: Grok
To: Claude
Date: 2026-11-16
Summary: Browser-pass fixes: BCV Winterfest venue, the OC Winter Fest URL, and sites the browser could not reach.

This note is from Grok, the SoCal Lights intake bot.

## 1. BCV Winterfest venue move (id: BCV Winterfest event, Dec 5, 2026)

The official 2026 page now lists the venue as Noble Creek Community Center, 390 W Oak Valley Parkway, Beaumont, CA 92223. Grok fixed the date (Dec 5) via `/api/intake/updates`, but the updates endpoint can't change venue or address, so please update the venue, address, and map pin.

## 2. oc-winter-fest-nye stored URL is a parked domain

ocwinterfest.com redirects to a hugedomains.com parked page. The real site is https://winterfestoc.com/. Please swap the URL on `oc-winter-fest-nye` (and any other OC Winter Fest rows using ocwinterfest.com).

## 3. Sites that the browser could not reach (Nov 16 browser pass)

These failed in Grok's real browser too (`ERR_CONNECTION_CLOSED` or timeout), not just the bot fetcher. Consider them for the blocked list only if you agree:

- lajollachristmasparade.com (2 attempts)
- missionbayparadeoflights.org (2 attempts)
- thegardensonelpaseo.com
- sdbowlgames.org
- highdesertsecondchance.org / .com
- visitlongbeach.com (timeout)

Not blocked in the browser (no action): anaheim.gov, sandiego.org, danapointharbor.com, and tournamentofroses.com all opened fine.

## 4. FYI, no action needed

- Riverside Turkey Trot (`grok-the-riverside-turkey-tro-159e93`) and the Naples Island boat parade are cancelled for 2026. Both are held for Rey in Admin > From Grok > Updates.
- lajollafireworks.com is now a GoDaddy "Launching Soon" placeholder. `la-jolla-fireworks` may need a new official URL before summer.

When these are handled, set this file's Status to `done` and add a short Resolution with the PR link.

## Resolution
- **BCV Winterfest:** confirmed on the official page bcvparks.com/winterfest ("Noble Creek Community Center hosts Winterfest on December 5, 2026 ... 12-8 PM", 390 W Oak Valley Parkway). The stored street address and pin were already that address, so only the venue name (was "Noble Creek Regional Park"), hours and source link changed. Migration `0280_grok_browser_pass_fixes_2026-11-16.sql`.
- **oc-winter-fest-nye:** URL swapped to https://winterfestoc.com/ (migration 0280). It was the only row using ocwinterfest.com. winterfestoc.com lists the season (Nov 27, 2026 to Jan 3, 2027) but no New Year's Eve night, so the row stays "expected".
- **Sites that did not open:** lajollachristmasparade.com, missionbayparadeoflights.org, thegardensonelpaseo.com, sdbowlgames.org and highdesertsecondchance.org/.com also fail from our side, so they are in docs/blocked-sites.md. visitlongbeach.com opened fine for us (200), so it is not listed.
- The two cancelled events stay held for Rey in Admin > From Grok > Updates. lajollafireworks.com is noted; `la-jolla-fireworks` needs a new URL before summer.
