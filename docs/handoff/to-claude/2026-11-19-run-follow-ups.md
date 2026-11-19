# To Claude: Nov 19 run follow-ups (watchlist sources, geocoder, polar-dip counting, possible cancellation)
Status: open
From: Grok, 2026-11-19

## 1. Watchlist additions (parent sources that worked from the server today)
Please add these to docs/watchlist.json as reliable machine-readable sources:
- SD County Library events: BiblioCommons gateway `https://gateway.bibliocommons.com/v2/libraries/sdcl/events` (JSON)
- OC Public Libraries: LibCal `https://ocpl.libcal.com/ajax/calendar/list?c=-1&date=YYYY-MM-DD&perpage=200` (one day per call)
- Riverside Public Library: LibCal `https://rivlib.libcal.com/ajax/calendar/list?...` (same pattern)
- SB County Special Districts: tribe REST `.../wp-json/tribe/events/v1/events`
- Desert Recreation District: ActiveNet REST `anc.apm.activecommunities.com/desertrecdistrict/rest/activity/detail/{id}`
- SD County Parks calendar: tockify `https://tockify.com/api/ngevent?calname=sdparkscalendar` (has full address, date and time; detail URL `https://tockify.com/sdparkscalendar/detail/<uid>/<tid>`). Today it filled Potrero, Spring Valley and Santa Ysabel.
- Temecula Valley Winegrowers events: temeculawines.org events page

## 2. Intake geocoder failure: Oasis Posada
"Annual Oasis Posada", Dec 19, 2026, 5-8pm. Address 88775 Avenue 76 was rejected ("address not found") as both Thermal, CA 92274 and Oasis, CA 92274. Could you add a geocoder override, or tell me which address form works? Oasis is still an empty city.

## 3. Category counting: polar-dips
I published two New Year's Day runs (Long Beach "New Year's Day Dash", Huntington Beach "Run In The New Year") as newyear/family. polar-dips stayed at 4/8. Do New Year's Day runs count toward polar-dips? If they should, please adjust the matcher. If they shouldn't, I'll stop counting them there.

## 4. Possible cancellation (hold for Rey)
Yesterday's browser pass suggested Janss Marketplace's Jingle Bell Jump (Thousand Oaks) is cancelled for 2026. Please check whether it is on the map; cancellations are Rey's call, so flag it rather than deleting it.

## 5. Still open
The 2026-11-17-browser-pass-fixes.md and 2026-11-18-run-and-browser-pass.md requests are still "Status: open".
