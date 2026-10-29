# Status

_Last updated: 2026-10-28_

## Where we are
Site is live at https://socallights.app. Event data is being maintained through weekly sweeps (see the latest `migrations/00NN_sweep_*` files and `docs/confirmation-plan.md`). The repository moved from the personal GitHub account to the `Forza-TEK` org on 2026-10-27.

## Next steps
1. Continue confirming `expected` holiday events per `docs/confirmation-plan.md`.

## Open questions / blockers
- **The cloud sandbox cannot reach many event sources.** Riverside County Library, San Bernardino County Library, Pasadena library, San Diego Public, Chula Vista, Carlsbad, Oceanside, Thousand Oaks, Inglewood, Hawthorne and Gardena city sites fail DNS or return 403. Fix: widen Network access in the cloud environment settings (cloud environment menu, Edit, Network access) for the session environment AND the scheduled routines' environment, adding `*.libcal.com`, `rivcolibrary.org`, `sblibrary.org` and the city sites, then re-run the library searches (see `docs/city-sweep.md`).
- **Leads not yet published (need a manual check or a reachable source):** Cudahy, Paramount and South Gate Halloween events (2026 dates only estimated from 2025); Leimert Park Kwanzaa parade (Dec 26, no loaded 2025 page); LA County Parks Trick or Treat Village and Harvest Festival (flyer images only); LA City Rec & Parks Halloween Activities List PDF (403); Riverside Bryant Park Halloween carnival (Oct 31, snippet only); Covina Woman's Club trunk-or-treat; Cerritos Artesia Park Spooktacular; Whittier Christmas parade; Bellflower tree lighting; Long Beach Aquarium NYE; HB Central Library Nutcracker shows (no fitting christmas type).

## Scheduled tasks (Claude Routines, unattended, publish directly to `main` after validation; see `docs/updating-events.md`)
| Routine | Schedule (America/Los_Angeles) | Job |
|---|---|---|
| SoCal Lights city sweep (Forza-TEK) (`trig_01NssBaBjV2agGcKqfFtMsdp`) | 4:13, 12:13 and 20:13 daily | Sweep one city group from `docs/coverage-cities.md` for new events; validates and publishes |
| SoCal Lights weekly upkeep (Forza-TEK) (`trig_01ALNHRk62UWcy9KRCZmHagW`) | Mondays 6:47 | Confirm dates, fix details, remove dead or duplicate events, season roll-overs; validates and publishes |
| SoCal Lights midweek upkeep, Nov-Dec (Forza-TEK) (`trig_016jHPtnoVU8ZMroW1hNSRFa`) | Wed and Sat 6:52, November and December only | Date confirmation for events starting in the next 6 weeks; validates and publishes |

No human review step: Rey authorized direct publishing on 2026-10-28. Check the Actions tab ("Apply database migrations") if something looks off.

The original three routines (`trig_01H9a1iYVJNgtgzyAi8kNpn5`, `trig_01VBEfN43zRQJwuHf4uqaHD7`, `trig_01Gm1USYSZ7oHRHQTTqkQoo5`) are **disabled**. They had `github.com/forza-tek/socal-lights` as their source, which stopped authenticating after the repo move (the 2026-10-27 12:14 sweep failed at startup). The replacements use the new repo name and clone it themselves. The old ones can be deleted from the Routines page once the new ones have each run once.

## Recently done
- Amazon Associates tracking ID `socallightsap-20` is set in `public/site-config.js`; the "Shop for the season" links in the mug box are live. Amazon reviews the account after 3 qualifying sales within 180 days. Ticket-affiliate programs (Impact etc.) still to be applied for.
- Added a "Shows & concerts" type (`show`) to the Thanksgiving & Holiday Lights season and published 44 held-back holiday shows, ballets, concerts and the Turkey Night Grand Prix (Thanksgiving-themed car race). Shows that start after Dec 26 sit in the New Year's season (`show`, "Shows & festivals").
- Desktop event/house list now uses the same photo-on-top card layout as the phone (card rules moved out of the phone-only media query in `public/styles.css`, with a hover outline).
- UI: Events/Houses headers now always limit to the map and carry "+ Add event" / "+ Add house" buttons (the "Limit to map" checkbox is gone); the coffee-mug box only has the tip link and shop links; `/add-event` can take a Featured payment (held until approval if the event needs review).
- Added a public "Add your event" form (`/add-event`, auto-publishes when the event page confirms the name and year, otherwise admin review) and automatic Featured payments via Stripe Checkout + webhook (migration 0065, `docs/stripe-setup.md`). **Featured stays on the Cash App/email fallback until `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set as Cloudflare Pages secrets.**
- Posted 7 expected (unconfirmed) events held back earlier: Cudahy, Paramount, South Gate, Leimert Park Kwanzaa, Whittier parade, Bellflower tree lighting, Aquarium NYE.
- Monetization added (see `docs/monetization.md`): support button with Cash App tip link, affiliate-link plumbing (off until Amazon tag / ticket affiliate ids are set in `public/site-config.js`), `/feature.html` plus `featured` flag on events (migration 0062).
- House cards with a photo now drop the badge icon outright (`.thumb.has-photo::before{display:none}`) instead of relying on the photo painting over it; the earlier stacking fix still showed the badge on an iPhone.
- Fixed: the badge icon showed on top of a showcased house's photo on its card; it now only appears for houses without a photo.
- Showcased houses can be starred (heart on the card and in the detail) and are included in the route plan next to events (stored in the same `socal-favs` list as `h:<id>`; the route uses the house's street address). Houses with an address are no longer nudged away from it (the city-level spreading now applies only to older posts without one). Single-stop routes with "Start from: First stop" now have a destination.
- Map: the locate-me button now flies in to street level (zoom 15) on the user's position; taps on empty map deselect reliably (`clickTolerance` raised from 3 to 10 px so a tap with finger wobble still counts as a click, and deselecting also closes an open card detail).
- Admin: every house card (pending and published) has an Edit button. Saving with a street address geocodes it and moves the pin (county recomputed); season, city and the other fields are editable too. Fixes houses submitted before the address field (pin at the city center, no address). The old `edit` API action also used to reset the pin to the city center; it no longer does.
- Showcase a House form collects a required street address (migration 0060 adds `posts.address` and `posts.show_address`; `show_address` is now always set to 1). The server always geocodes it (US Census, then OpenStreetMap; rejects matches over 30 km from the chosen city) and puts the pin there; visitors see the address with a Directions link. If no match is found the pin falls back to the city center and the admin can move it. Not yet tried against the live geocoders (the sandbox can't reach them): submit a real address once and check the pin.
- Night mode is automatic: dark from 6 pm to 6 am (device time), light otherwise. The sun/moon button overrides it until the next 6 am / 6 pm switch, then auto resumes; a page left open flips on its own.
- Cache: Cloudflare gives CSS/JS a 4-hour browser cache that `_headers` can't override (the zone's Browser Cache TTL), so phones kept the old UI after deploys. `public/index.html` now loads `styles.css` and `app.js` with a `?v=` version; bump it whenever either file changes (rule added to `CLAUDE.md`). A zone-level fix would be to set Browser Cache TTL to "Respect Existing Headers" in the Cloudflare dashboard.
- Phone UI, all live on `main` (PRs #19-#21): the list uses one card format and is always vertical (sideways card row and the "cards" sheet stop removed); season tabs have no underline, and a dot in the season's color marks the selected tab; Holidays has a caret drop-down listing its event types plus "All Holidays"; the selected card stays visible when the sheet moves or after "Back to results".
- Phone list: the half and full-height list now uses the same cards as the collapsed sheet (84px image, dates and tags shown in both).
- 2026-10-28 library/park research push, all merged to `main` and applied: Huntington Beach Central Library (2), South Bay (8), Gateway Cities (5), Orange County libraries (11), San Diego/Ventura/Santa Barbara libraries (24), Long Beach and Southeast LA (15, plus a Santa Fe Springs tree lighting date fix to Nov 21), LA County/Glendale/Burbank/LAPL libraries (20), Inglewood/Gardena/Lawndale (3). Live feed went from 1,019 to roughly 1,100 events. `docs/city-sweep.md` now requires searching library and park calendars.
- Scheduled routines publish directly to `main` after validation; weekly upkeep and city sweep test runs both landed migrations successfully.
- City sweep group 21 (region-wide sources), 2026-10-27 evening: regional guides (enjoyorangecounty, lajollamom, sandiego.org, Visit Newport Beach, Secret LA, mommypoppins) are almost fully covered on the map already; added 1 event (Fairmont Grand Del Mar tree lighting, migration 0049). Left out for unverified 2026 dates: Park Hyatt Aviara Stocking Full of Christmas, Night of Lights OC, San Diego Harvest Festival at Dolores Magdaleno Rec Center (Nov 21, cost not listed).
- Coverage audit: all 210 incorporated cities checked against `docs/coverage-cities.md`; 13 missing cities added to groups and a priority list of 0–1-event cities added (see that file).
- Recreated the three scheduled routines against `Forza-TEK/socal-lights-app` and disabled the old ones (2026-10-28). Test-fired the city sweep; it cloned the repo and started searching.
- Verified `CLOUDFLARE_API_TOKEN` survived the transfer: a manual run of the migrations workflow on 2026-10-27 authenticated and applied cleanly to the live D1 database (no-op, everything already applied). Note the workflow skips itself and still shows green if the secret is missing, so check that the "Apply migrations" step actually ran.
- Cloudflare Pages Git connection re-pointed at `Forza-TEK/socal-lights-app` (the dashboard showed a stale-link warning after the rename). The Cloudflare Workers and Pages GitHub app now has access to the repo, the warning is gone, and auto-deploys from `main` work again.
- Header logo and browser-tab icon switched to the SoCal Lights badge.
- Repository moved to `Forza-TEK/socal-lights-app`; project context added (`CLAUDE.md`).

## 2026-10-28 city sweep, group 20 (Santa Barbara County)
Santa Barbara County was already well covered. Added Gobble for Good 5K (Santa Maria, Nov 14). Not confirmed for 2026 and left out: Santa Maria Turkey Trot, Guadalupe Christmas parade, Lompoc parade date, Buellton Winter Fest. Gobble pin is the 101 frontage near the Elks center, so check it. Buellton Holiday Bazaar (Nov 7, River View Park) skipped as no fitting type.

## Shop tab (2026-10-28)
- New **Shop** tab (last, after My night) on the list: three category buttons styled like the Today/Saturday/Free chips; each shows tappable cards that open an Amazon search with the `socallightsap-20` tag. Content is `SITE.shop` in `public/site-config.js` (3 categories x 6 items per season). The tab hides itself if `amazonTag` is empty.
- The coffee-mug box now holds the tip link, a "Browse the shop" button that opens the tab, and the affiliate disclosure.
- Cards link to Amazon search results; real product photos and prices need Amazon's Product Advertising API (available after qualifying sales).

## 2026-10-28 city sweep, group 18 (High Desert & Mountains)
Already well covered (about 45 events). Added Après in the Pines holiday market and Sunnybrook Harvest Festival (both Big Bear Lake, migration 0075). Left out as unconfirmed or conflicting: Big Bear Santa Paws at the Zoo (page lists Dec 13/20 and Dec 19), Big Bear tree lighting (Nov 27 vs 28 on two Visit Big Bear pages; map keeps Nov 27), Hesperia monthly Intergenerational Dinner (not Thanksgiving-specific), Adelanto, Needles, Barstow parade and Oak Glen 2026 dates not posted yet.

## UI tidy and Shop sorting (2026-10-29)
- All popup dialogs (Showcase a House, the support box, the admin edit dialogs) now close with a round x in the top right instead of a large Close button.
- Shop links open Amazon with `s=price-desc-rank` (price, high to low) and the search words get "premium" added, so the highest-priced, high-end products show first. Both are set in `public/site-config.js` (`shopSort`, `shopHighEnd`); blank them to turn off.

## Showcase a House form redesign (2026-10-29)
- The form has a switch at the top: **A homeowner** or **A professional installer**. Website, phone, service area and the "permission to show this address" checkbox appear only for installers (they need a website or phone). Homeowners enter just their name, email and the display.
- The address is now separate Street, City, State (CA) and ZIP fields. `posts.address` still holds the full one-line address (pin, directions and routes use it), built as "street, city, CA zip".
- Migration `0076_showcase_address_fields.sql` adds `poster_type`, `street`, `state`, `zip`, `service_area` and carries the 4 existing houses over, using the city typed in the address (Mission Viejo became Ladera Ranch, Los Angeles became El Segundo). "Holiday Christmas Lighting" (Lights Up Today) is marked as an installer. Ladera Ranch and El Segundo were added to `public/cities.js`.
- House pages show a "Professional installer" tag and service area for installers, and "Posted by" for homeowners. The admin edit dialog has the same fields.

## UI redesign (2026-10-29)
- **Top bar:** search, one **Season** drop-down (Halloween ▾; under the search on phones) and a **⋯ menu** (Support SoCal Lights, Night mode switch, Add an event, Showcase a house, Contact). The donate and night-mode icons, the season bar and the row of filter chips are gone from the map.
- **Filters:** one **Filters** button in the list header opens a panel (When, Near, County, Cost, Type, Confirmed dates only, Show on map) with a live "Show N events" button; active filters show as removable chips. Tonight / Saturday / Free stay as shortcuts. New **Sort** menu (Soonest, Free first, Nearest).
- **List:** Redfin-style cards (photo, price line, dates and hours, name, place, one-line description, heart and share). The right-hand panel is wider on large screens (540 px at 1100 px+, 700 px at 1360 px+) and shows two columns. A "Keep it free" line ends the events list.
- **Tap a dot:** a card opens next to the dot on desktop (list stays on the right) and docks at the bottom on phones, with heart, share and ×. Esc or an empty-map tap closes it.
- **Phone list:** two positions only, Peek (handle and the Filters / Tonight / Saturday / Free buttons) and Full; the handle toggles them.
- **Share links:** `#e-<event id>` and `#h-<house id>` open an event or house directly.
- List cards now use the same layout as the pin card: photo with date badge, then name with share and heart beside it, place, dates and hours, and the price and Confirmed tags (houses too).
- The ⋯ menu now holds only Support SoCal Lights, Night mode and Contact; Add event and Add house stay in the list header.
- The "Coming up" banner now sits at the end of the events list, above "Enjoying SoCal Lights? Keep it free".
- The ⋯ menu's support item is now "Keep SoCal Lights Free" with the hand-and-heart icon.
- Removed the colored dot from the Season button.
- Phone list sheet: one full-height panel that only slides (a GPU transform), so the buttons, the count / sort / + Add line and the cards never move relative to the sheet and nothing is rebuilt while it moves. Peek shows the handle and the Filters / Tonight / Saturday / Free row; a soft fade behind the tab bar hides the rest of the sheet at Peek and fades out as the sheet rises, so the list shows behind the tab bar at Full. The first 8 event photos load eagerly.

## One list: Places (2026-10-29)
- The Events and Houses tabs are now one **Places** tab (map-pin icon): events and home displays share one list and one map. Tabs are Places, My night, Shop.
- Home displays show a blue **Home display** badge where events show a date, "Posted by …", "<Season> display · Free to view", and tags. Same card layout, heart and share.
- Filters: dates, Confirmed and Ticketed only narrow events (home displays have no dates or prices; they count as Free). Type has a new **Home displays** chip. The "Show on map" switches are gone.
- Sort: **Nearest** is the default (distance from the map center), then Soonest and Free first. Paid "top of the list" placements stay first in every order.
- "+ Add event" and "+ Add house" became one **+ Add ▾** button with Add an event and Showcase your house. `#houses` links no longer need a tab; `#h-<id>` and `#showcase` still work.
- **My night** now uses the same layout as Places: the Open route / Start / Maps controls sit in the buttons row, the count line shows stops, miles and drive time, and the cards (with a stop number and "↓ N mi · ~N min from stop N") fill the same list. The old Open route button block, "Open in" picker and notes were tidied into the controls row and a short notes list under the cards.
- Motion: the active tab grows its label while the old one folds away, tab content slides in, and menus, the season list and the Filters panel spring open with their rows sliding in one by one (all off for reduced-motion).
- Phone, night mode only: the list sheet is slightly transparent with a soft blur. Count badges on the tabs have more space from their labels.
- Pin card: a home display with more than one photo can be swiped through (arrows on desktop hover, a 1 / N counter); swiping does not open the details.
- Close buttons use a drawn X so it sits dead center in its circle. The pin card's photo arrows are always visible on desktop, with dots, a counter and the left/right arrow keys.
- Pin card with several photos: the photo area only browses (arrows, clickable dots, swipe, arrow keys); tapping the text below opens the details.
- My night help: three simple steps (tap the heart, check your stops, tap Open route) that fold into a ? button beside the stop count; the choice is remembered on the device.
- Fixed: the soft fade behind the phone tab bar was covering the lower half of the pin card (a merged CSS rule had lost its hide-when-card-open selector).
- Phone details page: the back arrow stays fixed at the top of the sheet while the details scroll.
- Season button: a larger chevron that flips when the list is open; lighter type on the season button, menus and buttons.
- Home display details use the same round back arrow as events (over the photo). Menu, button and filter type is one step lighter.
- Home display details have the same orange Directions button as events (to the street address).
