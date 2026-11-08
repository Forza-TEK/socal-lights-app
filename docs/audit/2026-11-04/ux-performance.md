# UX, accessibility and performance audit, 2026-11-04

Scope: live https://socallights.app (code on main at adb35b3). Read-only: no records created, no forms submitted, no sign-in. Tools: Playwright/Chromium (1280x900 and iPhone 13, 390 wide), axe-core 4.9.1, CDP throttling (CPU 4x, Slow 4G), curl. Screenshots and raw output: `/tmp/claude-0/audit-ux/`. Earlier audits (`docs/ux-audit.md`, `docs/audit-2026-11-01-personas.md`) are not repeated; items I re-checked are listed under Verified OK or Still open.

## Summary

| Severity | Count |
|---|---|
| High | 3 |
| Medium | 8 |
| Low | 9 |

Overall the site is in good shape: no JavaScript errors, no horizontal scroll and no clipped buttons on 17 pages at two sizes, and only one serious axe finding outside the map. The biggest issues are structural: unknown URLs return a 200 map page instead of a 404, the map's first card render is slow on a phone because the whole 2,013-event feed (1.36 MB raw, 300 KB compressed) must arrive first, and offline support only covers the map page.

## Ranked findings

| ID | Severity | Area | Evidence | Impact | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| F1 | High | Routing / SEO | `/nope-404`, `/add/zzz` return **HTTP 200** with the full map app (title "SoCal Lights Finder"); `/in/atlantis`, `/help/nonexistent`, `/installer/x` correctly 404. Screenshot `d_desk_nope_404.png`. My link checker reported 120 of 120 URLs as 200, so broken links are invisible to any crawler. | Mistyped links land on a map with no explanation; search engines can index junk URLs as duplicates of the home page; broken-link monitoring cannot work. | Add a catch-all that returns 404 with a friendly page (search box, link to map, Add, Help) for paths that are not known routes. Also make `/c/<unknown>` (returns 200 "Home decorating contest") say "contest not found". | S |
| F2 | High | Performance (map) | Phone, Slow 4G + 4x CPU, `/`: LCP/FCP 1.8 s (header text), but `/api/events` takes **7.3 s** (300 KB br), TBT about **2.35 s**, 27 long tasks. Unthrottled phone: canvas at 1.35 s, first card at **3.8 s**. Zoom/pan and season switch cause 100-290 ms long tasks (season switch 3.7 s, 14 tasks; software WebGL in headless inflates this, see limits). | On a mid-range phone in spotty coverage the list is empty for several seconds, which is the exact use case (driving between houses). | Send only the current season plus a count for others (earlier audit), render the first 20 cards from a small inline or cached payload, strip unused fields from the feed, add an ETag (none today; `cache-control: public, max-age=60, s-maxage=120` is already good). Chunk the list render with `requestIdleCallback`. | M |
| F3 | High | Offline | After a warm visit the map page and list do open offline (60 cards from the cached `/api/events`). But the service worker is registered only from `/` (index.html line 83); `/pricing`, `/privacy`, `/in/*` etc. never get one-visit coverage, and an offline navigation to `/privacy` from a controlled page ended in `ERR_FAILED` (a blank chrome error, `m_offline_pricing.png`), not `offline.html`. The first-ever offline visit shows an empty map and header with no message (`m_offline_home.png`). Map tiles and MapLibre itself (unpkg) are not cached, so the map canvas is blank offline. | Users driving in dead zones get a blank screen with no explanation. | Verify on a real phone whether `offline.html` is served (could be a Playwright offline-mode artifact, see limits). Show an inline "You are offline, showing the list from <time>" banner on the map when `/api/events` fails; precache MapLibre JS/CSS (self-host) and the 5-10 most recent city pages. | M |
| F4 | Medium | Accessibility | axe `aria-allowed-attr` (critical, 1 node) on `#q` after the search is used: JS sets `aria-expanded` on `<input type="search">` (app.js 1187, 1196) which has no combobox role. Appears on every map screen (filters, detail, menu) in both themes. | Screen readers get an invalid attribute on the main search control and no announcement of suggestions. | Give `#q` `role="combobox"`, `aria-controls="sugg"`, `aria-autocomplete="list"`, and `role="listbox"`/`option` on suggestions. | S |
| F5 | Medium | Accessibility | Contrast: `/contests` tab "Live" (`button[data-tab="live"]`) white on #ff6b6b = **2.77:1** (axe serious, both themes, `s_phone_contests.png`). Map detail "Confirmed" tag (`.conf`) fails in light theme (serious). | The brand coral with white text is below 4.5:1 wherever it is used for small text. | Darken the button/tag background to about #d93f3f or use dark text on coral (the map's "Use my location" already does). | S |
| F6 | Medium | Accessibility | Heading order: the map has an h1 (visually hidden, clipped by design) but cards are h3 with no h2 (axe heading-order, every map load); filter sheet h4 follows h3. 4 `region` findings on the map (h1 and `.brand` outside landmarks). | Heading navigation skips a level. | Add a hidden h2 ("Places in view") above the list; wrap the header in `<header>`. | S |
| F7 | Medium | Accessibility | `/add`, `/add-house`, `/add-event`, `/add-contest`: axe `landmark-one-main` (no `<main>`) and 4-13 `region` findings; no skip link on any non-map page. Keyboard walk of `/add` and `/feature` works and has visible focus, but footer links repeat after the last control. | Screen-reader users cannot jump to content on the Add hub (the main contribution path). | Wrap `.main` in `<main>` in addflow.js and the hub; add a shared skip link in chrome.js/footer.js. | S |
| F8 | Medium | Accessibility | Map Tab order: the first stops are the map canvas, zoom, geolocate and four attribution links, and only then search, season, theme, sign-in and menu (visual order is the reverse). Keyboard users cross ~9 stops before the header. | Reading order differs from visual order. | Move header before `#map` in DOM or set `tabindex=-1` on the canvas and attribution controls. | S |
| F9 | Medium | Copy / empty state | Searching "zzzzqq" gives "No places in this part of the map. / Show all of Southern California" (`m_empty.png`). The message blames the map position, not the search term, and "Show all" does not clear the text. | Dead end that suggests the wrong remedy. | When search text is set: "No places match "zzzzqq"" with a Clear search button. | S |
| F10 | Medium | UX (mobile) | "Route these" is disabled (aria-disabled) above 45 places in view; the explanation is only a `title` tooltip ("Zoom in to 45 or fewer places"), which phones never show. Tapping it gave no visible toast (`m_route_disabled.png`). | The control looks broken at the default zoom. | Show a toast or inline hint on tap; label the button "Route these (zoom in)". | S |
| F11 | Medium | Performance (assets) | `/tutorials/find-map.mp4` is 13.5 MB; `public/tutorials` is **429 MB** in the repo. `/img/share.png` (OG image) is 405 KB. The help page requests videos at load (aborted, 2-3 `ERR_ABORTED` per page: `find-map.mp4`, `find-map-mobile.mp4`). | Wasted data on help pages, slow deploys and clone. | `preload="none"` and poster images; move video to R2/Stream; compress share.png to a JPEG under 100 KB. | M |
| F12 | Low | Caching | Static JS/CSS/images/videos: `public, max-age=14400, must-revalidate` (matches the CLAUDE.md note). `/sw.js` is also `max-age=14400` although `_headers` asks for `no-cache` (can't be overridden), so a new service worker can lag up to 4 h. HTML is `max-age=0, must-revalidate` (good). MapLibre from unpkg is `max-age=31536000` (good) but 803 KB over a third-party CDN. | Slow rollout of SW fixes; third-party dependency for the core map. | Self-host MapLibre (precachable, no unpkg outage risk); version-bump SW via a renamed file if urgent. | S |
| F13 | Low | Tap targets | Phones, after the earlier fixes: map controls 44 px (share, heart, pills, Route, Filters all 44). Remaining under 44: zoom/locate buttons 40x40 (MapLibre), sheet handle 390x28, and footer/text links on every static page: Pricing/Privacy/Terms/Contact are 24 px tall (e.g. `a` 43x24 on `/add`, 37x24 on `/terms`), tutorials page has 18 small targets (`button.ver` 36 px tall, `.sh-tbrand` 36x36), `/pricing` and `/feature` summary rows 25 px. | Fat-finger misses in the footer and FAQ. | `padding: 10px 6px` on footer links and `summary`; 44 px for tutorials toggles. | S |
| F14 | Low | UX | Map default season on 4 Nov is "Thanksgiving"; the teaser for Christmas exists. Geolocation: after choosing "Use my location" and denying, the locate button turns to a crossed icon but no message explains it; the list still sorts by "Nearest" with no location (`m_geodenied.png`). | Sort label promises something not delivered. | Switch sort to "Soonest" when location is denied; one-line "Location is off" toast. | S |
| F15 | Low | Content | A Laguna Beach card ("Hospitality Night & Santa's Tree Lighting") uses a map/venue-plan image as its photo (`m_route_disabled.png`, first card). | Looks broken and adds no value. | Filter out maps and floor plans in the image picker, use the stock tile instead. | S |
| F16 | Low | Console / network | Desktop `/` logs 4 WebGL "GPU stall due to ReadPixels" warnings (headless-only, likely harmless). The `cdn-cgi/image/width=16` thumbnail probe is aborted on every page load (`ERR_ABORTED`; the same URL returns 200 by curl) so it shows as a failed request in DevTools. | Noise that hides real failures. | Await the probe or use `cache: force-cache`, keep result in localStorage (already attempted). | S |
| F17 | Low | Terminology | The same thing is called a house, home, home display, lighting display, display, "lights", "installs" and "listing": Add hub "A lighting display"; add-house title "Show your lights"; pricing "Add your display"; CLAUDE.md/privacy "Showcase a house"; contests "Enter your home". Map count says "1,065 places" for events and homes together; elsewhere "events". | Users cannot tell whether "home" and "display" are different forms. | Pick one: "light display" for homes and "event" for organized events; "places" only for the combined count. | S |
| F18 | Low | A11y | Tutorials thumbnails put the red play button over the thumbnail's own title text and logo (`s_phone_tutorials.png`); the installer page has redundant alt text (`image-redundant-alt`, minor). Form errors use `role="alert"` (good) but are not tied to fields (no `aria-invalid`/`aria-describedby`) and focus is not moved to the error. | Cosmetic overlap; error not tied to the field. | Move the play button; link errors to inputs. | S |
| F19 | Low | Contest page | `/c/<anything>` returns 200 for unknown slugs (see F1). Not audited further (noindex). | | | S |
| F20 | Low | Not-yet-open earlier items | Still open from 2026-11-01: Near radius buttons (5/10/25 mi) are greyed until a city is typed (`m_filters.png`); there is no "Skip to" on static pages. | | | S |

## Per-page metrics (single run, unthrottled, fresh context, 2.5 s settle)

Request counts are for 1280 and 390 wide combined except where noted. "DCL"/"load" in ms: desktop / phone. Transfer sizes were reliably captured only in the throttled runs (below); for the other pages the CDP counter under-reported so sizes are omitted. Console errors were 0 on every page; warnings only the WebGL note on desktop `/`. No horizontal scroll or clipped buttons anywhere. "Small taps" counts visible links/buttons under 44 px on phone.

| Page | DCL / load desktop | DCL / load phone | Requests (desk/phone) | Small taps (phone) | axe (both sizes) |
|---|---|---|---|---|---|
| / (map) | 5226 / 5228* | 1752 / 1752 | 72 / 60 | 5 | heading-order, region |
| /add | 1191 / 1439 | 823 / 1005 | 22 | 6 | no main, region |
| /add-house | 523 / 526 | 407 / 414 | 22 | 5 | no main, region |
| /add-event | 1578 / 1581 | 374 / 380 | 22 | 5 | no main, region |
| /add-contest (no sign-in) | 4195 / 4198* | 976 / 978 | 26 | 5 | no main, region |
| /contests | 941 / 945 | 552 / 560 | 22 | 4 | contrast (serious), region |
| /feature | 604 / 607 | 542 / 543 | 24 / 25 | 11 | region |
| /pricing | 451 / 455 | 389 / 395 | 23 | 11 | region |
| /tutorials | 2206 / 2409 | 497 / 642 | 25 / 26 | 18 | none |
| /help | 746 / 752 | 577 / 580 | 15 | 6 | region |
| /help/find-lights-near-me | 488 / 1342 | 642 / 2423 | 18 / 21 | 10 | region |
| /in/los-angeles | 951 / 954 | 413 / 517 | 34 / 31 | 8 | region |
| /past | 391 / 398 | 365 / 370 | 14 | 9 | region |
| /privacy, /terms | about 450-550 | about 440-550 | 22 | 9 / 6 | region |
| 404 URL (/nope-404) | 615 / 630 (200 status) | 456 / 484 | 72 / 57 | 5 | same as map |
| /installer/lights-up-today | 976 / 987 | 544 / 549 | 18 | 11 | image-redundant-alt |

\* Desktop `/` and `/add-contest` first loads were slow outliers (cold CDN or script); the phone run of the same page was 1.8 s and 1.0 s. Treat as single samples.

Throttled mobile (iPhone 13, 4x CPU, Slow 4G, one run each):

| Page | LCP | FCP | CLS | TBT (approx) | Long tasks | Transfer |
|---|---|---|---|---|---|---|
| / | 1792 ms | 1792 ms | 0.014 | about 2,350 ms | 27 | 412 KB (same-origin only) |
| /in/los-angeles | 1468 ms | 1468 ms | 0.000 | about 290 ms | 2 | 189 KB |

Largest payloads on `/`: `/api/events` 300 KB (br; 1.36 MB raw, 2,013 events, no ETag), `app.js` 43 KB, `styles.css` 17 KB, `site-config.js` 13 KB, badge image 12 KB. MapLibre GL JS is 803 KB br from unpkg and map tiles come from OpenFreeMap; neither reports sizes to the Performance API (no Timing-Allow-Origin), so tile bytes were not measured. City page photos go through `/cdn-cgi/image` at width=240 and weigh 12-16 KB each (WebP/auto format): good. Unused JS was not measured (no coverage run).

## Map experience

- Time to interactive map canvas 1.35 s (unthrottled phone); cards 3.8 s; the 60-card first page then lazily loads more.
- Geolocation: prompt is a compact card below the controls (no longer covering the search). Denied: no crash, no error; locate button shows a crossed icon only (F14).
- Search: suggestions appear (cities and events, "Show this city on the map"), search flies to cities. Empty search copy: F9.
- Season menu: 6 seasons, clear "On now" badge. Filters sheet opens, "Show 1,067 places" CTA updates, Near radius disabled until a city (F20).
- "Route these": works at 2 places in a city (Google/Apple switch, "Tick a place when you have been there"); disabled above 45 with no tap feedback (F10). "Plan a night" (My night): fav stores to localStorage `socal-favs`, badge shows 1, 3-step help, "Open route", start-point selector. Share builds `https://socallights.app/#e-<id>` using `navigator.share` with correct title. Deep link opened the event.
- Pin clustering with the real 2,013 events (no synthetic load needed): idle 58 fps, max frame gap 167 ms; during 18 zoom/pan steps max gap 317 ms and about 250 long tasks of 50-290 ms (software-rendered WebGL, so on real GPUs expect much better; on the 4x CPU throttle TBT was 2.35 s).
- Offline: see F3.

## Flows and links

Crawled 59 internal URLs from `/`, `/add`, `/pricing`, `/feature`, `/contests`, `/help`, a city page, `/past`, `/tutorials` and the footer, plus the 60-URL sitemap sample (every 5th of 320: 47 help articles, 266 `/in/` cities, installer, past, pricing, privacy, terms). All 119 returned HTTP 200 with zero redirects and zero redirect chains; titles matched the page (no soft-404 among crawled URLs). Dynamic links in templates (e.g. `/c/${slug}`) were not crawlable without data. The soft-404 on unknown paths is F1.

## Copy and trust

- Pricing consistency: "Finding lights ... saving favorites ... voting are free", Featured "is the only thing that costs money today", contests "free to enter and free to vote" all match the product. Add flows say "on the map now" (stale review wording is gone). "Free for now" on installers, events and contests is honest but vague; "Homeowners: Free" without "for now" is a small inconsistency.
- Free-heart promise: the heart on cards is Save; the "Keep SoCal Lights Free ♥" tip link is separate. No contradiction found, but the same heart icon means both "favorite" and "donate", which could confuse.
- In-app wrapper (UA contains `SoCalLightsApp`): app.js hides the tip button and "Promote your event" (lines 718, 1029, 1030); add-event hides paid placement; pricing.html and feature.html hide Featured plans and show an in-app notice; auth.js disables Google sign-in in the app (emailed code only). Gaps: the contest link "Enter your home or vote" and Cash App references elsewhere are not IN_APP-gated (not verified end to end); the IN_APP check lives in at least 5 duplicated regexes, so a UA change must be edited in each. The Android Google-sign-in concern from the earlier audit is handled (Google hidden in the app), but real-device testing is still needed.
- Error messages: generic "Something went wrong. Please try again." and "That did not work. Please try again." (addflow.js 128, app.js 1062) give no cause or contact; "No connection. Please try again." is fine.

## Verified OK

- No JS errors, no failed same-origin requests, no horizontal scroll, no clipped buttons on 17 pages x 2 sizes x 2 themes.
- Dark theme: only the shared contrast defect (F5); no dark-only failures.
- Tap targets on the map (pills, Route, Filters, share, heart, search, season, sort) are 44 px; the earlier 33-36 px finding is fixed.
- Photos are resized via Cloudflare Image Resizing (12-16 KB per card image); event feed edge-cached; HTML revalidated.
- Stale review wording fixed; Tutorials page shows real videos (earlier empty-tile finding fixed).
- Search suggestions with map fly-to, Add to calendar/share/report exist (earlier gaps built); My night with 9-stop route splitting.
- Keyboard: Add hub and Featured page are fully tabbable with visible focus; skip link exists on the map; reduced-motion CSS is present and no animations run under `prefers-reduced-motion`.
- 200% zoom (640 CSS px) on `/add`, `/feature` and `/`: no horizontal scroll; viewport meta allows zoom.
- `role="alert"` on form errors; all inputs on add-house labelled.

## Could not test

Real devices and screen readers; sign-in dependent screens (Add flows past the hub, profile, Featured page signed in, contest entry); whether `offline.html` is actually served (Playwright offline mode returned a chrome error); the exact WebGL frame rates on real GPUs (headless uses software rendering); map-tile and MapLibre transfer size; unused-JS coverage; geolocation granted path; Slow-4G repeat runs (one run per page); the `/c/` contest pages with real slugs; true 200% browser zoom (I resized the viewport to 640 px instead).
