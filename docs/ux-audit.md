# App and UI audit, 2026-11-01

Method: loaded the live site and the current code in a test browser at phone (390 px) and desktop (1280 px) widths; opened the list, filters, ⋯ menu, season menu, search, details, Add hub and profile; measured tap targets, headings, labels and payload sizes; read the code behind each. Not tested: real devices, screen readers, slow networks.

## Gaps (things people expect that are missing)
1. **No "Add to calendar".** Events have dates, times and places but no .ics / Google Calendar button, and there is no reminder. For one-night events (tree lightings, parades) this is the strongest retention feature.
2. **No Share on the details page.** Share exists on list cards and the popup but the details action bar has only Save (heart), website (globe) and Directions.
3. **No "Report a problem / suggest an edit"** on events or homes. Dates change and pins are sometimes wrong; a one-tap report (prefilled with the event id) would feed the confirmation work instead of relying on sweeps.
4. **My night route breaks past about 10 stops.** Google Maps links take at most 9 waypoints (Apple similar); My night has no cap or warning, so a long list opens a broken route. "Route these" already caps at 9.
5. **No way to share a plan.** My night is local to one phone; a "share my night" link (a list of event ids in the URL) would let families and groups use it.
6. **Search does not suggest or fly to a place.** Typing "whittier" filters the pins but the map stays zoomed out and no suggestions appear. Cities and venues should offer suggestions and move the map.
7. **No alerts.** No "tell me when new lights appear near me" (email or push). Mid-November is when most 2026 dates are announced, so this is the moment people would use it.
8. **Weak offline behaviour for a drive-by product.** The service worker caches the shell only. Lights are often viewed in spotty coverage; caching the last event list would let the list open offline.
9. **No first-visit orientation.** A new visitor sees a zoomed-out map of clusters. One "Near me" prompt (using the locate button) or a short tip would speed the first useful result.
10. **No Spanish.** A large share of Southern California and most Día de los Muertos audiences read Spanish first.

## Overlaps (the same thing in two places)
1. **Two kinds of home display.** Contest and sweep homes are events of type "Drive-by"; owner-submitted homes are "Home displays" with a different card, a different filter chip and different behaviour. A visitor looking for houses must use two filters. Show them as one group, one card style, one chip.
2. **Two season pickers.** The top season button and the Shop tab's own "Shop for…" picker both change a season; they can disagree.
3. **Shop in two places.** The Shop tab and the ⋯ menu's "Keep SoCal Lights Free: tip us or shop the season".
4. **Two routing entry points.** My night (saved stops) and "Route these" (what is in view). Fine in itself, but their names and results look unrelated; explain "Route these" as "route what you see" and offer "Save these to My night".
5. **Quick pills vs Filters.** Tonight and Free repeat controls inside Filters (When, Cost). They are shortcuts, but there is no cue that they set the same state; show the active filter count on the Filters button when a pill is on.
6. **Sort in two places** (count row on phones, filter row on desktop). Consistent now, keep it that way.
7. **Add in three places** (⋯ menu, hub, profile). Fine; just make sure all land on the hub.
8. **Duplicate "Back to the map"** on the thank-you page (fixed 2026-10-31).

## Improvements by area
**Discovery and list**
- Add a "This weekend" pill (Tonight / This weekend / Free), the question people ask most.
- Show a "Happening now" tag and sort option, not only the date tile.
- Make the Near filter obvious: the radius buttons (5/10/25 mi) do nothing until a city is typed.
- Photos are hotlinked originals up to 1.5 MB, and a list page can show 60 cards. Serve resized thumbnails (Cloudflare image resizing or pre-made 600 px copies) to cut mobile data a lot.

**Details page**
- Put labels under the icon-only Save and website buttons, or at least tooltips; the globe is not self-explanatory.
- Add Share and Add to calendar to the action bar; show "mi away" next to Directions.
- Show "last confirmed on <date>" for each event, plus the expected/confirmed badge, to build trust.

**Trust and data quality**
- Surface source and last-checked date. Add the Report link above.
- Mark "price not listed" clearly (now "Not listed") and keep it consistent across cards.

**Performance**
- `/api/events` is 282 KB compressed (1.2 MB raw, about 2,000 events) and took 1.2 s from the edge on a test fetch, and the page refetches it every 15 minutes. Cache it at the edge for 5 minutes with stale-while-revalidate, support ETag / 304, and send only the season being viewed plus a count for others.
- `app.js` (33 KB compressed) and `styles.css` (14 KB) are fine. The 4-hour browser cache on CSS/JS means version bumps are required (already in CLAUDE.md).

**Accessibility**
- Card Share and Save icons are 32 px; raise the hit area to 44 px (padding, not visual size). The sheet handle is 19 px tall.
- The main page has no h1 or h2 (cards are h3). Add a visually hidden h1 and mark the list and filters as regions.
- Add a skip link and an aria-live announcement of "N places in view".
- Verify muted text contrast (about #6b7280 on white) and the white-on-accent chips in each season, including Christmas red.
- The bottom bar floats over the last card; check there is bottom padding on the last item at every height.

**Growth and SEO**
- Add `schema.org/Event` JSON-LD for each event and crawlable pages for each city and season ("Christmas lights in Whittier"), plus `robots.txt`, `sitemap.xml` and a canonical link. Deep links (`#e-id`) exist but search engines cannot index a hash.
- Add the Apple and Google store badges to the ⋯ menu once the apps are approved.
- Privacy policy and terms are reachable only from the Add pages; link them from the ⋯ menu.

**Menu**
- ⋯ is a mix of actions and settings: Add, tip/shop, Night mode, Contest archives, Contact. Add About / How it works, Privacy and Terms, and group Night mode as a setting.

## Suggested order
1. Add to calendar + Share on details + Report a problem (small, high value).
2. Cap or split My night routes at 9 stops with a clear message.
3. Edge caching for `/api/events` and thumbnails for photos.
4. Search suggestions that move the map.
5. Merge the two home-display types into one filter and card.
6. Event JSON-LD, sitemap and city pages.
7. Alerts (email first), then offline list cache.
