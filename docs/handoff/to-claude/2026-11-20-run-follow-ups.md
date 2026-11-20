# Request: Nov 20 Grok run follow-ups (venue change, possible non-runs, intake rejects, watchlist)
Status: open
From: Grok (daily intake run 2026-11-20).

## 1. Changes the update call can't make
- **Crestline Family Christmas** (g18-crestline-family-christmas): open-web sources say the 2026 bonfire is replaced by "Carols, Cocoa & Christmas Cheer" *inside Goodwin & Sons Market*, Mon Nov 30, 5–8pm. That is a venue and name change. visitcrestline.org returned 403 to the box, so it's in tonight's browser queue for checking. If the browser confirms it, please update the name and venue.
- **Simi Valley Thanksgiving Day 5K**: RaceMenu registration is closed, and I couldn't find a 2026 race page. It may not run in 2026. Please verify. Remove it only if you find a clear statement.
- **Andaz San Diego NYElectric 2027 Rooftop** (grok-andaz-san-diego-nyelectr-39904a): Eventbrite now shows eventStatus EventCancelled. I sent cancelled:true today and it came back **held** for the owner. Please approve the removal.
- **Redondo Beach menorah lighting**: the stored date is Dec 6. The JCC Eventbrite page says Tue Dec 8 5:30pm in its header and Sat Dec 5 6:30pm in its body, so I didn't change anything. It's in the browser queue.

## 2. Intake rejects to look at
- Two Pechanga NYE parties (promogogo.com listings, Dec 31 9pm, Grand Ballroom, priced) came back **rejected: "does not look like a community event listing"**. Is that because of the promogogo host or the casino venue? If it's the host, I'll resend them with the official pechanga.com URL once the browser has read that page.
- The Oasis Posada geocoder problem from 11-19 (88775 Avenue 76) is still open.

## 3. Watchlist suggestions (docs/watchlist.json)
- SB County Library: tribe REST `https://library.sbcounty.gov/wp-json/tribe/events/v1/events?start_date=YYYY-MM-DD&per_page=50` (612 events, full address and times; it filled Muscoy today).
- Harbor Glow at West Harbor (San Pedro), `harborglownights.com/visit`: a yearly light show.
- Surf & Sand Laguna Beach NYE, SET Steak & Sushi NYE (setnewport.com/event/), Pechanga NYE (pechanga.com/entertain/nye): yearly NYE parties.

## 4. Blocked-site candidates (not confirmed yet; the browser checks them first)
These returned 403 on both 11-19 and 11-20: coronadotimes.com, cvchabad.org, palosverdesmagazine.com. They're new 403s today too: ausd.us, bowers.org, chabadatlacosta.com, cityofventura.ca.gov, edhat.com, guidedogsofamerica.org, yelp.com. I'll ask to add them only after the browser confirms it can't reach them. The 000 (connection) failures are box egress resets, not site blocks, so I'm not proposing those.

## 5. Earlier requests
The Nov 17 and Nov 18 to-claude requests were already filed and merged (PR #725 and PR #737). The Nov 19 request (watchlist, Oasis geocoder, polar-dip counting, Janss Jingle Bell Jump, and browser-pass results) is in open PR #742, waiting for Rey to merge; do not re-file it.

## 6. Browser pass results (Nov 20)

Posted by the browser pass: San Gabriel tree lighting (Dec 1, 6-8:30pm, Plaza Park), Redondo Beach menorah lighting moved from Dec 6 to Dec 8, 2026 (5:35pm, City Hall), the SeaWorld San Diego NYE photo, and a new event: Flo Rida New Year's Eve at Yaamava' Theater, Highland (Dec 31, 2026, doors 10pm, show 11pm).

Needs Claude's decision (not posted):
- Baldwin Park Parade & Winterfest: Dec 5, 2026, parade 9:45am, Winterfest 12-4pm; the page states no place.
- Laguna Niguel parade: Dec 12, 10am; no place stated.
- South Gate: the event is now "Christmas Festival", Dec 13, 12-6pm, tree lighting 6pm, South Gate Park, 4900 Southern Ave; no parade mentioned. Rename/retype?
- Artesia Jingle Bell Express: the page says both Dec 19 and Dec 20.
- Crestline: visitcrestline.org lists "Carols, Cocoa, & Christmas Cheer", Mon Nov 30, 5-8pm, Goodwin & Sons Market, 24089 Lake Gregory Dr; no year, no bonfire. Rename and venue change?
- Paseo Nuevo: the page says Dec 4 with no year; stored date is Dec 5.
- Stale pages (still last year's text): Palmdale, Steinmetz, Sylmar, Promenade PV, Blythe tree lighting, Temecula On Ice.
- Spring and summer 2027 rows: no 2027 info posted anywhere yet.
- Pechanga NYE (pechanga.com/entertain/nye): 4 parties 9pm-1:30am plus Round Bar Balloon Drop 7:30pm-1:30am, "Countdown to 2027", but the page states no Dec 31 date or address, so not posted.
- Hotel del Coronado "Rockin' New Year's Eve at The Laundry": Dec 31, 21+, no time or year yet; recheck later.
- Signal Hill tree lighting was Nov 19 (past). Piru, Guadalupe (connection closed) and Needles: no 2026 dates found.

Blocked list: no new requests. Every host that returned 403 to the box loaded fine in the browser today (yelp, cvchabad, chabadatlacosta, ausd, edhat, coronadotimes, bowers, cityofventura, guidedogsofamerica, palosverdesmagazine). That includes the yelp and coronado candidates in PR #742's file, so please don't block those.
