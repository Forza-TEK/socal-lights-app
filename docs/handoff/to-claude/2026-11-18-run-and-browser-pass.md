# To Claude: Nov 18 run + browser pass (watchlist, city keys, geocoder, blocked hosts, date checks)
Status: open
From: Grok, 2026-11-18

Note: the Nov 17 request (docs/handoff/to-claude/2026-11-17-browser-pass-fixes.md) is in PR #725, still open for Rey's merge, so it is not repeated here.

1. **Watchlist suggestions** (`docs/watchlist.json`): Westmont College music calendar, Plaza Theatre Palm Springs, Victoria Gardens events, Riviera Village (Redondo Beach), visitdelmarvillage.com, cardiff101.com events, paramountcity.gov events, pinevalleycampchristmas.com, socalchoralartists.org/concerts, pacificchorale.org events, communitychorusofredlands.com, sandiegosaintschoir.org.

2. **City keys.**
   - "La Crescenta" and "La Crescenta-Montrose" both still exist (also in the Nov 17 note).
   - Event `willowbrook-library-noon-year` (11737 Wilmington Ave, 90059) is filed under city "Los Angeles", but the "Willowbrook" key exists and shows empty. Please re-key it.

3. **Intake geocoder.** These were rejected with "the address was not found" and then accepted on a retry with slightly different wording:
   - Catamaran: rejected as "3999 Mission Blvd, San Diego, CA 92109", accepted as "3999 Mission Blvd, Pacific Beach, CA 92109".
   - Cardiff: rejected as "Aberdeen Dr, Cardiff, CA 92007", accepted as "Aberdeen Drive, Encinitas, CA 92007".
   - Oceanside: rejected as "1 Pirates Cv, Oceanside, CA 92054", accepted as "1 Pirates Cove Way".

   Pacific Palms NYE also got "address lookup unavailable" once. The lookup looks flaky. Could it retry, or fall back to a second geocoder?

4. **Blocked-list candidates.** Each of these failed from the server today AND failed again in my signed-in desktop browser:
   - cdmod.org: a "checking the site connection security" interstitial that never clears
   - christmascardlanepq.com: timeout on two tries
   - cityofneedles.com: robot challenge on the homepage
   - lajollafireworks.com: timeout, ERR_ABORTED and ERR_CONNECTION_CLOSED, four times
   - majesticgardenhotel.com: robot challenge, twice
   - solvangusa.com: an sgcaptcha check that never completes
   - www.lotusfestivalla.com: server error on http, certificate error on https
   - www.redwagonteam.com: Cloudflare 403
   - www.yelp.com: 403 with an empty page
   - yucaipa.gov: robot challenge

   (southernoakslights.com and cityofmenifee.us failed again too, but they're already in the Nov 17 note.)

   Do NOT block these. They failed from the server today but loaded in the browser: rpvca.gov (on retry), cityoflosalamitos.org (the non-www host), tournamentofroses.com (the check cleared on retry), janssmarketplace.com, whittieruptown.org, lake-elsinore.org, beaumontca.gov, cityofpalmdaleca.gov, moorparkca.gov, cityoflagunaniguel.org, sangabrielcity.com, temeculaonice.com, sanbernardino.gov, weho.org, parks.lacounty.gov, chulavistaca.gov.

5. **Stored rows to check.** I didn't confirm these because the page conflicts with the map or is too thin:
   - `south-gate-christmas-lane-parade`: the old URL is a 404. The city now lists a "Christmas Festival" on Dec 13, 2026 at South Gate Park, 4900 Southern Ave, 12–6pm, with no parade mentioned. Was the parade replaced?
   - `g6-artesia-jingle-bell-express`: the city page heading says Sat Dec 19, 2026, 10am, Artesia Park, but the body text and URL still say Dec 20.
   - `laguna-patriots-parade`: lagunabeachparade.com gives Sat Mar 13, 2027, 11am. The place is only "Downtown Laguna Beach".
   - `laguna-niguel-holiday-parade`: Dec 12, 2026, 10am, but the place is only "City of Laguna Niguel".
   - `la-jolla-fireworks`: the site is dead. The nearest current page is the La Jolla Sky Show drone show (La Jolla Shores, Jul 4, 2027, 8:45pm). Is it the same event?
   - `coronado-flower-show`: Apr 17–18, 2027, Spreckels Park. Hours will be posted in January.

6. **Possible cancellations. These were reported to Rey, and he decides; FYI only:**
   - Naples Island Holiday Boat Parade: cancelled per the Long Beach Post, Nov 7, 2026.
   - Riverside Turkey Trot: the organizer site says the 2026 event is cancelled.
   - Jingle Terrace Nights (Vista): moonlightstage.com says it has concluded and won't be produced again.

7. **Coverage**: see `docs/handoff/grok-coverage.md`, updated in this PR from today's run.
