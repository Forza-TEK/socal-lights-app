---
from: grok
date: 2026-11-24
status: open
---
# Grok → Claude: Nov 24 catch-up intake follow-ups (covers missed Nov 23 and Nov 24 runs)

The Nov 23 and Nov 24 scheduled runs didn't run (Grok Bot usage ran out). This is one catch-up run, including the Monday recurring-event re-check (work order fetched with `skip_attempted_days=0`, all pages).

(Not repeated here: 2026-11-21-run-follow-ups.md is still open. The Nov 22 follow-ups in PR #777 were merged on Nov 24.)

## 1. Casino and resort NYE parties are still rejected as "not a community event listing"
Rey's Nov 21 rule: list seasonal events even when they aren't community events, including casino, resort and hospitality NYE parties (Pala's was his example). The intake filter still rejects them. Dry-run verdicts today:
- **New Year's Eve Celebration at Pala** (https://www.palacasino.com/nye/): Thu Dec 31; live music from 11am, Rio Carnival Grande Parade 9pm and 11:30pm, Copa Countdown 11:50pm; Pala Casino Spa & Golf Resort, 11154 CA-76, Pala, CA 92059. Pala is in `cities_without_events`. Rejected: "does not look like a community event listing" (third time, reworded; not sent live).
- **New Year's Eve Rockin' Party at Agua Caliente Cathedral City** (https://www.aguacalientecasinos.com/agua-event/earth-to-mars-the-bruno-mars-experience/): Thu Dec 31, 8pm (doors 7pm), free standing room, Brobots 8–10pm then Earth to Mars; 68960 E Palm Canyon Dr, Cathedral City, CA 92234. Same rejection.
- Queued for the browser pass and likely to hit the same filter: Morongo Gras NYE (Cabazon, also an empty city).
Please relax the filter for the `newyear`/`nye` type at casinos, resorts and hotels (or add these by hand). I'm not re-sending them until the filter changes.

## 2. Camp Pendleton
- Thanks: `Camp Pendleton Mainside` and `Camp Pendleton South` are now keys in public/cities.js (both still in `cities_without_events`).
- pendleton.usmc-mccs.org still answers Akamai 403 to the box, so the MCCS Polar Bear Plunge (Jan 1, 2027, Del Mar Beach & Marina) and other base holiday events are in today's browser queue. Rey asked on Nov 21 to keep the plunge.

## 3. Rey's Nov 22 decisions (for the record)
- **southernoakslights.com: keep it blocked.** Rey says the site is all Halloween. Please leave it on the blocked list; I'm not queuing it anymore. (`g7-southern-oaks-christmas` is still in events_to_confirm with that link. Please re-point or retire it.)
- **Harbor Reef (Two Harbors):** published with the venue-name address "Harbor Reef Restaurant, Two Harbors, Avalon, CA 90704" (`grok-thanksgiving-buffet-at-h-61bb77`). Today it got a venue photo from its Visit Catalina event page. Please check that the pin landed at Two Harbors, not in Avalon town.
- **Irwindale Christmas Spectacular (Dec 4):** still no published time. It's queued for a flyer re-check.

## 4. Data notes from today
- **Peninsula Holiday Parade of Lights** (`peninsula-holiday-parade-of-lights`, map Dec 5): the Rolling Hills Estates page now says "hosted the annual Holiday Parade on Saturday, December 12, 2026" (past tense, no start time). I didn't change it. It's queued for a browser check, and you may want to look at it too.
- **Goleta Depot Candy Cane Train:** the depot's calendar shows it starting Nov 28 (not Dec 5), Sat/Sun 12pm–4pm through Dec 27. I corrected it through updates. Dec 5 opens at 11am. That's in the evidence, but the hours field says 12pm–4pm.
- **"Turkey Trot 5K Fun Run at Coach B's"** (Nov 28, 2527 University Ave, San Diego) came back `duplicate`, but I can't find it in /api/events. Was it taken down? If not, it may be hidden.
- **Very Merry Temecula Christmas** (`g15-very-merry-temecula-christmas`, Dec 10–12): temeculaca.gov/Holidays no longer lists it. The page lists Santa's Arrival, the Tree Lighting, the Electric Light Parade, the Holiday Bike Ride and the Grape Drop, and all of those are already on the map. It may not run in 2026. I'm not reporting it as a cancellation without a clear statement.
- **Nixon Library "A Revolutionary Christmas"** (Dec 8, 5–9pm, tree lighting, Santa) is listed on nixonfoundation.org/events. The stored link for `noc-nixon-holiday-tree-showcase` is that events index, which doesn't describe the tree showcase itself.

## 5. Watchlist suggestion
- **RunSignup public race API** (https://runsignup.com/Rest/races?format=json&state=CA&start_date=…&end_date=…): structured date, start time, address and fee for each race. Today it gave 23 of the published runs (Thanksgiving trots, Santa/jingle runs, New Year's Day runs). It would be a good parent source for the runs category.

## 6. Blocked-list candidates (failed from the box today; check in the browser pass before adding)
- morongocasinoresort.com (403)
- majesticgardenhotel.com (202 bot check)
- whittierevents.com event detail pages (SiteGround sgcaptcha "One moment, please"; the browser should clear it after 10–30 s, so probably not a real block)
- palmsprings.com (403; a listing site, low priority)

## 6. Browser pass results (Nov 24, evening)

Browser checked 19 of 28 priority rows (bp1-out.json); 9 carry to the next run along with ~132 other queue rows (Rossmoor homes, 92 photo rows, spring/summer 2027 confirms, social sweep).

**Published (2):** Thanksgiving Buffet at Anaheim Majestic Garden Hotel (grok-thanksgiving-buffet-at-a-5ea65e), Thanksgiving Buffet at CAVA, Renaissance Esmeralda (grok-thanksgiving-buffet-at-c-c90b02).

**Needs Claude:**
1. **Casino/resort NYE filter (Rey's Nov 21 rule).** Dry runs for Morongo Gras NYE (morongocasinoresort.com/morongo-gras: Dec 31, 2026, 8pm-1am, 49500 Seminole Dr, Cabazon 92230) and Pechanga "Countdown to 2027" (pechanga.com/entertain/nye: Round Bar 7:30pm-1:30am, 45000 Pechanga Pkwy, Temecula 92592) were rejected with "does not look like a community event listing", same as Pala and Agua Caliente. Please let seasonal hospitality NYE parties through; I'll resend all four.
2. **Camp Pendleton addresses.** The MCCS calendar (pendleton.usmc-mccs.org/calendar-of-events) lists Semper Fitmas Santa & Elf Run (Sat Dec 12, 2026, 9-11:30am, Wire Mountain / Pacific Views South Housing Area) and Winter Fest Express (Sat Dec 5, 2026, 7-11am, Pacific Views Event Center). Base venues have no street addresses; every variant failed the geocoder. Please allow a manual pin (Pacific Views Event Center, Camp Pendleton South) or a coordinate field. Also, the christmas types don't allow a general festival type; Winter Fest Express needs one (or tell me which to use).
3. **Coachella Enchanted Holiday Parade:** city calendar confirms 12/04/2026 6:00-9:30 PM ("Game on Coachella, Level Up the Holidays!"), but there's no place stated, so it can't be confirmed under the date/time/place rule. The tree lighting is 12/02/2026 5:30-8:30 PM.
4. **Peninsula Holiday Parade of Lights:** the Rolling Hills Estates page says "Saturday, December 12, 2026" (past tense, no time); the map has Dec 5. It's unresolved; please don't change it yet.

**Not usable (official source missing):** Promenade PV Let It Snow (only Palos Verdes Magazine; starts Nov 28, Fri-Sun 6 and 7pm), Los Alamitos Winter Wonderland (only the News Enterprise: Dec 5, 4-7:30pm), Lights on Symphony St (Facebook, no year), Kooiman (2025 show ended), Sylmar tree lighting (2024 page), Chula Vista Christmas Circle (blog says Dec 11), Irwindale (still no 2026 time), MCCS Polar Bear Plunge (not on calendar yet).

**Browser-blocked too:** renaissanceesmeralda.com (connection closed), valleyviewcasino.com/entertainment (aborted). morongocasinoresort.com's Cloudflare check cleared after waiting, so it should not be blocked.
