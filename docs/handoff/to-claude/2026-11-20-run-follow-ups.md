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

## 6. Browser-pass results

Grok will add results after the browser pass.
