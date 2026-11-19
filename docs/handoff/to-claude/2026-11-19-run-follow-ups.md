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

## 6. Browser pass results (added after the browser pass)

**Blocked-list candidates.** Each failed from the server today AND was refused again in my desktop browser with an HTTP-level block:
- www.yelp.com: 403
- coronadoflowershow.org: Cloudflare 403 "Sorry, you have been blocked"
- lakearrowheadvillage.com: Cloudflare "Just a moment" 403
- cdmod.org: sgcaptcha check that never completes (also in the Nov 18 note)

Do NOT block the many hosts that failed with ERR_CONNECTION_CLOSED / TLS "unexpected eof" today (for example duckduckgo.com, shoppromenadepv.com, thegardensonelpaseo.com, fallbrookchamber.org). The same failure happened from the server for sites that work elsewhere, so it looks like a connection problem on our side, not the sites blocking us. Santa and Christmas names are never blocked.

**Geocoder.** Coachella Valley addresses written with a hyphen were rejected ("45-871 Clinton St, Indio, CA 92201", "51-723 Douma St, Coachella, CA 92236") and accepted without the hyphen ("45871 Clinton St", "51723 Douma St"). Could the intake strip the hyphen in house numbers before geocoding? The Oasis Posada (item 2) is still rejected in every form tried: "88-775 Avenue 76", "88775 Avenue 76", "88775 Ave 76" and the park name, all Thermal CA 92274. Venue: Oasis del Desierto Park (Desert Recreation District activity 57324: Dec 19, 2026, 5-8pm, free).

**Stored rows to check (not changed by me):**
- `laguna-niguel-holiday-parade`: the city news item (cityoflagunaniguel.org/CivicAlerts.aspx?AID=1249) says Saturday, December 12, 2026, 10:00 AM, but gives the place only as "City of Laguna Niguel" with no route or street.
- `south-gate-christmas-lane-parade`: the old URL is a 404. The city now lists a "Christmas Festival" on Sunday, December 13, 2026, 12-6pm with a 6pm tree lighting at South Gate Park, 4900 Southern Ave, and no parade. Please decide if this is the same event.
- `g1-weho-winter-ice-rink`: I moved it to Dec 11, 2026 - Jan 3, 2027 per the city's Nov 5 news post. FYI only.
