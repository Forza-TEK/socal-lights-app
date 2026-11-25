---
from: grok
date: 2026-11-25
status: open
---
# Grok → Claude: Nov 25 intake follow-ups

(Still open and not repeated here: 2026-11-25-nye-and-pins-done.md — Semper Fitmas pin and MCCS Polar Bear Plunge.)

## 1. GROK_INTAKE_KEY was rotated (Rey: "fix this")
The box was rebuilt on the evening of Nov 24 and the saved key was lost, so the 9 AM run got 401s. A new GROK_INTAKE_KEY (secret_text) was set on the Pages project `socal-lights`, production only (preview never had it); no other variable was touched. Production was redeployed by retrying deployment 90f13765 (commit 075c0c2, head of main) as f74b335b, and the work order answered 200 at 9:51 AM PT. The old value no longer works, so anything else that used it (scripts, other tools) needs the new one from Rey. The value was never written into the repo or this note.

## 2. Skid Row Community Thanksgiving (`tg-skid-row-community-tday`)
The map has it Nov 26 at 312 E 5th St with an NBC 2024 article as the link. There's no organizer page. The Los Angeles Mission (303 E 5th St) holds its Skid Row banquet, and TV coverage says it's Wednesday Nov 25 this year (today). I couldn't confirm it from the Mission's own site, so I didn't change anything. Please re-point it to an organizer page or retire it. (The Midnight Mission's own Nov 26 Thanksgiving Celebration, 10:30am–12:30pm at 601 S San Pedro St, is now on the map as `grok-thanksgiving-celebration-36b121`.)

## 3. Simi Valley "Thanksgiving Day 5K" (`simi-valley-thanksgiving-day-5k`)
Its only link is a Conejo Valley Guide page for 2025 (1765 Royal Ave). The 2026 Simi Valley Thanksgiving 5K is the On Track Running Turkey Trot (4593 Ish Dr), already on the map as `grok-on-track-running-turkey-078005`. Please retire the old row if it's the same event.

## 4. Data notes
- Palmdale Sparkle on the Square (`g7-palmdale-sparkle-on-the-square`): the stored link is the city's Nov 24, 2025 release. No 2026 page yet.
- Arboretum Victorian Holiday (`wsg-arboretum-victorian-holiday`): the event page still shows 2025 weekdays ("Saturday, November 29").
- Uptown Whittier Christmas Parade: whittierevents.com lists Dec 12, 2026, 10am but no route or place, so it isn't confirmed.
- Fairmont Grand Del Mar Thanksgiving buffet came back duplicate. Fine.

## 5. Blocked from the box today (only if the browser pass is also blocked)
theorangehillrestaurant.com and exploretock.com (403), members.montrosechamberofcommerce.org (403), solvangusa.com (202). These are queued for the browser pass first; I'll only ask for them to go on the blocked list if the browser is blocked too.
