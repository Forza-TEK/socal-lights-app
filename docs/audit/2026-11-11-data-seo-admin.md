# Audit: data quality, SEO/visibility, Admin usability (2026-11-11)

Scope: (A) public data as the API serves it, (B) visibility/SEO/sharing/speed, (C) Admin UI. Read-only; nothing in product code or data changed.
Method: anonymous GETs to https://socallights.app (<= 1 request/second, no sign-in, no POST), Playwright/Chromium for timing and screenshots, 60 polite HEAD requests to source sites, and Admin tested on a LOCAL `wrangler pages dev` copy (`ADMIN_DEV_BYPASS=1` in an untracked `.dev.vars`, all 219 migrations applied to a scratch local D1 outside the repo; the local database is a snapshot from the migrations, so it has no users, orders or posts).
Snapshot: live API read 2026-11-11 07:43 UTC (= Nov 10, 23:43 Pacific). "Upcoming" below means end date on or after 2026-11-10 (Pacific today).
Labels: **[T]** = confirmed by testing; **[C]** = from reading code only.
Per the owner's guidance, the Ask SoCal Lights button position, Route sheet keyboard focus and the zoomed-out first visit are not reported.

## Summary: top 10

1. **Wrong or non-event photos (DAT-01, P1).** In a random sample of 40 events with a photo, 6 show a logo, an award badge, a newsletter cover or an unrelated photo (a Waymo car for "Skid Row Community Thanksgiving", a "Kristina Duggan, Long Beach City Council" logo for the Long Beach Turkey Trot) and 5 more are doubtful. 498 of 1130 events (44%) have no photo at all.
2. **The product is "lights", but only 8 of 153 drive-by/neighborhood lights listings are confirmed (DAT-03, P1)**; 575 of 1095 upcoming events (52.5%) are still "expected", and 520 of those have no indexable page.
3. **City pages split one city into many (DAT-02, P1).** The "Los Angeles" page lists 31 events while 58 upcoming events have a Los Angeles address; "Downtown L.A." (16), Hollywood, Westwood, Griffith Park etc. are separate cities. "Downtown" and "Downtown L.A." are two pages. San Diego neighborhoods are separate "cities" the same way. 264 "cities" are listed against about 210 real ones.
4. **Home page is heavy on slow phones (SEO-01, P1).** Throttled mobile (4x CPU, 1.6 Mbps): LCP 7.3 s, TBT about 2.8 s, 1.9 MB transferred, map blank at 5 s. Desktop /in has CLS 0.329.
5. **21 real cities have zero upcoming listings and 60 more have one (DAT-04, P1)**, and the "priority cities" list in docs/coverage-cities.md is stale (dated Oct 27).
6. **Last year's contest winners are listed as 2026 events (DAT-05, P2):** 39 rows named "... 2025 ... winner" with start 2026-12-01, all "expected", with a stale year in the title.
7. **Event pages lack rich share/SEO signals (SEO-02..04):** og:image is a hot-linked third-party URL (failures seen), pricing/contests/tutorials have no canonical, pricing has no OG tags, no Organization schema, no HSTS/CSP.
8. **Admin has no data-health or revenue view (ADM-01, ADM-02, P2):** no counts of expected vs confirmed, missing photos, stale dates, no orders/revenue totals; Events tab can only filter by season and text.
9. **Admin dashboard "map events" is wrong (ADM-03, P1):** it counts every row ever stored (1,904 locally, against 957 for the season and about 950 on the public map).
10. **Destructive-action pattern is inconsistent in Admin (ADM-04, P2):** most use the good "tap again" pattern, but five places use browser `confirm()` / `prompt()`.

## What works well

- Every public URL tested returns correct status: unknown city and event return a real 404 with `noindex`; ended events stay reachable (200, noindex, "Ended" tag); /index.html 308s to /; http and www 301 to the canonical host. [T]
- Sitemap is exact: 196 city pages (all with 3+ events or 1 confirmed) plus /in, 575 confirmed upcoming event pages (0 missing, 0 extra), help articles, installer. Thin pages (68 cities) are noindex and kept out. [T]
- Event JSON-LD (Event with Offer, Place, PostalAddress, GeoCoordinates) is present for confirmed upcoming events only; BreadcrumbList on city/event pages. [T]
- Source links are healthy: 60 sampled, 50 returned 200 directly, 0 were truly dead (see table B4). [T]
- No console errors on any of the 21 Admin tabs, no horizontal scroll at 390 px, good empty-state wording, undo toasts on decline/unpublish, bulk approve for houses, global search that works, honest read-only banners on Ads and Outreach. [T]
- Coordinates are sound: 0 missing, 0 outside the right county, 7 more than 12 miles from their city's median (all explainable); only 96 have 3 or fewer decimals. [T]
- Cache headers: static JS/CSS `max-age=14400` with `?v=` busting, HTML 10 min, Brotli on assets. Fonts are one Google Fonts file (27 KB). [T]

## Part A: measured data (live API)

### A1. Totals and status

| Measure | Value |
|---|---|
| Events returned by `/api/events` | 1,130 (with `?full=1`: 778 KB; list: 560 KB) |
| Upcoming (end >= Nov 10 Pacific) | 1,095 |
| Ended but still returned (3-day grace by design) | 35 |
| Confirmed / expected | 606 (53.6%) / 524 (46.4%); upcoming 575 / 520 |
| Seasons | christmas 959, newyear 58, summer 47, spring 37, halloween 29 |
| Types (top) | tree 443, drive 153, show 92, parade 90, trot 78, walk 51, tour 35 |
| Distinct "city" values / upcoming | 269 / 264 (indexable city pages 196, noindex 68) |
| Contest-home rows (`ct`) | 60 |
| Last-checked (`lc`) dates | 2026-10-30: 562, 10-25: 205, 10-26: 141, 10-28: 86; 11-02: 40; 11-07..11: 54 |

### A2. By county

| County | Events | Confirmed | Expected | Cities | No photo | Upcoming cities with a page (indexable) |
|---|---|---|---|---|---|---|
| Los Angeles | 358 | 180 | 178 | 109 | 138 (39%) | 75 of 105 |
| Orange | 207 | 87 | 120 | 37 | 100 (48%) | 31 of 37 |
| San Diego | 164 | 100 | 64 | 39 | 74 (45%) | 30 of 39 |
| Riverside | 147 | 94 | 53 | 29 | 66 (45%) | 19 of 29 |
| San Bernardino | 118 | 76 | 42 | 33 | 54 (46%) | 24 of 32 |
| Ventura | 74 | 36 | 38 | 11 | 32 (43%) | 10 of 11 |
| Santa Barbara | 62 | 33 | 29 | 11 | 34 (55%) | 7 of 11 |

Ratios: Orange is 58% expected, the weakest county. Santa Barbara has the most missing photos.

### A3. Completeness and consistency

| Check | Result |
|---|---|
| Missing source URL / address / blurb / hours | 0 / 0 / 0 / 0 (all fields filled) |
| Missing photo | 498 (44%); 16 are local `/api/photo/...`, 32 non-https or local |
| Price unknown ("Price not listed" 146, "Check listing" 33, "See site" 3, "Ticketed" etc.) | 182 (16%) are non-informative; 205 by looser pattern |
| Hours that only say "check site" / "see site" | 589 (52%), in 40+ different wordings ("Evenings, check site", "Evenings; check site", "Evening — check site"...) |
| Price formats | "Free" 569, "Free admission" 6, "Free entry" 3, "Free (RSVP)" 5, "Free (check site)" 2, "From $52.33", "From $23.18" (cents on some, not others), "$N" 4, prose 339 |
| Hours dash styles | en dash 435, em dash 196, hyphen 116; "5pm–9pm", "5–9pm", "5-9 PM", "5:00 PM - 9:00 PM" all present |
| `free` flag vs text | 6 rows `free: true` while price text starts with something else ("Check listing" x2, "Mostly free", "Market free; home tour $50", ...); 4 rows `free: false` with "Free ..." text |
| Expected rows whose start date has already passed | 6 (e.g. `123farm` start Nov 5, `citadel` Nov 7, `hw-noche-de-altares-santa-ana` Nov 7); 4 expected rows already ended |
| Expected rows whose hours do not say "check" | 13 (docs/confirmation-plan.md asked for 0) |
| Season mismatch | 1 Christmas row starts 2026-10-02 (`g9-rogers-gardens-christmas-boutique`); 6 events in `halloween` end in early Nov (normal) |
| Events starting after the season | none after Aug 2027; 27 summer events start July 2027 (fine, but they appear on city pages and in "Listings run to Aug 31, 2027") |
| Name quirks | 41 names with a trailing year; 1 all caps ("SPARKLE DTLA"); 39 names contain "2025" |
| Duplicates | exact same id in lower case: 0. Same normalized name + city: 4 groups, all house-contest rows (different house numbers, legitimate). Same source URL + same start: 31 groups covering 135 rows (mostly one roundup page for several events: acceptable but means the "official" link is a list page). Same address + same start: 8 pairs, all different events at one venue (Harbor, library, Disney-style hubs) |
| 8 events share one coordinate | 111 S Grand Ave (Music Center), fine |
| Coordinate outliers (> 12 mi from the city's median) | 7: e.g. `tg-north-county-turkey-trot` (San Diego, 4S Ranch, 19 mi), `av-poppy-reserve`; all real addresses inside the city (San Diego is large) |
| Address city differs from the `city` field | 63 rows / 30 distinct pairs (neighborhood vs city; "Newport Beach" vs "Corona del Mar"; "La Cañada Flintridge" vs "La Canada Flintridge" spelling) |

### A4. Coverage against docs/coverage-cities.md

Counted like the doc ("city or address names the city", upcoming events only), for the 272 names in groups 1-20 of the doc (about 210 are incorporated cities, the rest are neighborhoods/communities):

| Upcoming events | Names |
|---|---|
| 0 (real cities) | **21**: Artesia, Bell Gardens, Bradbury, Cudahy, Hawaiian Gardens, Hidden Hills, Huntington Park, La Habra Heights, Lynwood, Maywood, Vernon, Westlake Village (LA); Calabasas, Azusa (LA; had 1 on Oct 27); Canyon Lake (Riverside); Highland, Loma Linda, Needles (San Bernardino); Laguna Woods (Orange); Port Hueneme (Ventura); Guadalupe (Santa Barbara) |
| 1 | 60 names (e.g. Hawthorne, Norwalk, Pico Rivera, Irwindale, Eastvale, Grand Terrace, Compton, Signal Hill, Banning, Fillmore) |
| 2 / 3 / 4 / 5+ | 52 / 28 / 21 / 77 |

Of the 25 "0 event" cities listed on Oct 27, 15 are still at 0 and 10 have 1-2 now. The "Priority cities" list was not refreshed since (doc asks for a re-count after each sweep).
Time horizon: events running or starting within 7 days: 64 (51 confirmed); 14 days: 157 (120 confirmed); 30 days: 751 (404 confirmed).
Drive-by / neighborhood lights (`t=drive`): 153, **8 confirmed**; Orange 50, Los Angeles 47, San Diego 17, Ventura 15, Santa Barbara 10, Riverside 8, San Bernardino 6.

### A5. Source link check (60 random upcoming URLs, HEAD, 1/s, falling back to GET on 4xx)

| Result | Count | Notes |
|---|---|---|
| 200 (direct or after 1 redirect) | 51 | includes 1 that answered 403 to HEAD and 200 to GET |
| 403 to HEAD and GET (bot wall) | 7 | cityofbell.gov, cityofperris.org, yelp.com, santabarbaraca.com, sesameplace.com, cityofventura.ca.gov, musiccenter.org (cannot tell from here) |
| Network failure / 502 on first try | 2 | yucaipa.gov/turkeytrot and tournamentofroses.com; both answered 301/200 on a retry, so transient |
| Truly dead (404/410) | 0 | |

### A6. Photo accuracy (40 random events with a photo, contact sheet in `screens/data/photo-accuracy-sheet.jpg`)

Clearly not an event photo: #1 Harvest Fest at Alondra Park (an "SEG3 sports entertainment gaming" logo), #9 Skid Row Community Thanksgiving (a Waymo car), #19 Holiday Ice Rink Pershing Square ("USA Today 10Best Readers' Choice 2023" badge), #33 Long Beach Turkey Trot (a city council member's campaign logo), #8 Flurry Fridays (an "Elsinore Edition December 2025" newsletter cover), #21 Coast Village Road tree lighting (a "Coast Village Week" web banner). Doubtful: #12 Santa Strolling Lido Marina (a beach festival poster), #24 Pendry tree lighting (fire dancer), #29 Nixon Library tree showcase (black-and-white archive photo), #36 Lake Elsinore tree lighting (veterans/flag), #23 Phelan tree lighting ("Holiday happenings" banner). 0 of 40 failed to load. Also seen: `venice-cinco-parade` uses a "stock-tequila-cheers-party.png" that the source site blocks (`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`) and `nisei-week` photo returned 502 through the image resizer on the Los Angeles city page. Six events share one county-site `holidays.jpg`.

## Part B: measured visibility, SEO, speed

### B1. Metadata by page type [T]

| Page | Title | Description | Canonical | Robots | OG/Twitter | Structured data |
|---|---|---|---|---|---|---|
| `/` | "Christmas Lights & Holiday Events Near You | SoCal Lights" | yes | none | full, 1200x630 share.png | WebSite only (no Organization, no SearchAction) |
| `/in` | ok | "1095 upcoming ... in 264 Southern California cities" | yes | index | full | BreadcrumbList |
| `/in/los-angeles` (indexable) | "Holiday lights and events in Los Angeles, CA" | count + confirmed/expected + date span | yes | index | full (generic share.png) | BreadcrumbList only (no ItemList of events) |
| `/in/palmdale` (thin) | same pattern | "2 upcoming events" | yes | `noindex,follow` | full | BreadcrumbList |
| `/e/<confirmed upcoming>` | "<name> in <city>, CA" | date, hours, address, blurb | yes | index | og:image = the event's own hot-linked photo, else share.png | BreadcrumbList + **Event** (Offer, Place, geo) |
| `/e/<expected or ended>` | same | same | yes | `noindex,follow` | same | BreadcrumbList |
| `/pricing` | ok | ok | **none** | none | **none (no og: or twitter:)** | none |
| `/contests`, `/tutorials` | ok | ok | **none** | none | og:title/description/image, no og:url/type | none |
| `/help` | ok | ok | yes | none | full | none (help articles have no FAQ/Article schema) |
| `/past` | "Past home decorating contest results" | **"Results of 0 finished home decorating contests"** | yes | index | full | ItemList (empty) |
| `/c/<slug>` | contest name | organizer + city | yes | noindex header | share.png (not contest-specific) | none |
| 404 pages (`/in/x`, `/e/x`) | "No events found ..." / "Event not found" | none | none | noindex | share.png | none |

hreflang: none anywhere (single language, so acceptable).
Headings: city page has one h1, h2 "What's coming up", "Near <city>", "More places in <county>", one h3 per event (31 on LA). Home has one h1, 2 h2, 7 h3. `/past` has 1 h1 and no h2.
Redirects: `/index.html` 308 to `/`; http and www 301 to https apex (one hop each). `/in/los-angeles/` (trailing slash) and `/e/<id>/` return 200 duplicates of the canonical page (canonical tag points to the clean URL). `/in/Los-Angeles` (capital) returns 404.
Absent: `/llms.txt`, `/.well-known/security.txt`, `ads.txt`, `humans.txt` (404, harmless); no HSTS and no Content-Security-Policy header on any page.
robots.txt: allows everything except /admin/, /api/ (except photo and `/api/events$`), /add, /profile, /c/, /ad-assets/; lists the sitemap. Note `/c/` is both Disallowed in robots.txt and `noindex` via header, which a crawler can never see (see SEO-08).

### B2. Sitemap

843 URLs: 575 `/e/`, 197 `/in` (196 cities + hub), 65 `/help`, home, pricing, privacy, terms, tutorials, help hub, 1 installer. No `<lastmod>` (deliberate). Not in sitemap: `/past` (0 contests announced, deliberate), `/contests`, expected events (520), 68 thin cities. Past results and contest pages are therefore not listed (contest pages are noindex by design).

### B3. Page speed (Chromium, live site; "mobile" = Pixel 5, 4x CPU slowdown, 150 ms latency, 1.6 Mbps)

| Page | Device | TTFB | FCP | LCP | CLS | TBT (approx.) | Requests / KB |
|---|---|---|---|---|---|---|---|
| `/` | mobile | 199 ms | 0.9 s | **7.3 s** | 0.063 | **2.75 s** | 61 / 1,910 KB (events JSON about 1.3 MB of "fetch" incl. tiles, 362 KB JS) |
| `/` | desktop | 156 ms | 0.7 s | 2.0 s | **0.105** | 4.6 s (23 long tasks, unthrottled count) | 98 / 2,859 KB |
| `/in/los-angeles` | mobile | 148 ms | 0.8 s | 0.8 s | 0 | 0.36 s | 25 / 85 KB (lazy images) |
| `/in/los-angeles` | desktop | 144 ms | 0.5 s | 0.5 s | 0 | 0.06 s | 51 / 608 KB |
| `/e/g5-torrance-snow-day-wilson-park` | mobile | 138 ms | 0.6 s | 1.9 s | 0 | 0.36 s | 23 / 387 KB |
| `/in` | desktop | 136 ms | 0.4 s | 0.4 s | **0.329** (one shift of the footer block and links at 0.8 s) | 0.19 s | 19 / 38 KB |
| `/in` | mobile | 386 ms | 1.0 s | 1.0 s | 0 | 0.3 s | 19 / 33 KB |

Other measurements: no horizontal scroll on any page at 393 px; home page has 61 images of which 58 are lazy and 1,740 DOM nodes; `/` loads 20 scripts (362 KB) and 6 stylesheets; OpenFreeMap raster tiles at zoomed-out view are 150-280 KB each; share.png is 404 KB (WhatsApp and some messengers skip og:images above about 300 KB); icon-512.png is 324 KB. City page requests failing in Chromium: 1 x 403, 1 x 502, 1 x blocked cross-origin (all hot-linked event images via `/cdn-cgi/image/`).

### B4. Share cards

`/e/<id>` with a photo uses the source site's image directly as og:image (e.g. `thegrovela.com/wp-content/uploads/2019/07/...` for a 2026 event, `attractionsmagazine.com` roundup banner for Vampirates); no og:image width/height on event pages. Events without a photo (498) fall back to the generic share.png. `/c/<slug>` previews also use the generic share.png with only "City of Covina · Covina. Show us your best lights!" as text.

## Part C: Admin usability (local copy, plus code reading)

### C1. Structure [T]

21 tabs in 5 groups: Dashboard; Review (Houses waiting, Submitted events, Event claims, Orders, Event Partners, Reports); Manage (Published houses, Events, Contests, Installers, Users, Replaced records, Data check, Activity log); and Cloudflare usage, Outreach, Ads, Email templates, Help Center, AI assistant. Mobile has a bottom bar with quick sections plus a slide-in menu. Ads has 6 sub-tabs, Contests has a Contest passes view. No console errors, no 4xx on any tab, no horizontal overflow at 390 px.

| Tab | Search | Filters/views | Count shown | Empty state | Notes |
|---|---|---|---|---|---|
| Houses waiting / Published houses / Users / Submitted events / Claims / Contests / Orders | yes (except Claims, Reports, Installers) | segmented views with counts | yes | specific wording | CSV download on houses/users/contests |
| Events | text | **season only** | "957 events", "Show 60 more" | n/a | cards, not a table; sorted by start date; no sort control |
| Installers, Reports, Activity log | none (log has an area select) | none | partly | yes | |
| Usage, Outreach | none | none | tables | n/a | read-only |

### C2. Safety and feedback [T for UI, C for code]

- Destructive buttons use "Tap again to <verb>" within 5 s (kit.js `tap`); 28 `toast()` calls; Undo toast for decline/unpublish on houses and submitted events. [C]
- Native `confirm()` or `prompt()` used for: "Mark this order refunded?", "End this comp now?", "Revoke this pass?", merge organization key (prompt), decline reason (prompt), paid-placement override. [C]
- Bulk actions: only "Select all / Approve N" on Houses waiting. No bulk on events, submissions, contests, users.
- Audit trail: Activity log tab with area filter; dashboard shows "Your recent activity". Undo exists only for the toast cases above; event edits/deletes have no undo or version history seen in UI. [C]

## Findings

Severity: P0 wrong/broken, P1 serious, P2 polish/inconsistency, P3 nice to have. Effort S/M/L. "Evidence" tag: T or C.

### Data (DAT)

| ID | Sev | Where | What I saw | Why it matters | Suggested fix | Effort |
|---|---|---|---|---|---|---|
| DAT-01 | P1 | `events.img` (498 empty, rest hot-linked) | [T] Sample of 40: 6 clearly wrong (logos, badge, newsletter cover, Waymo car) and 5 doubtful. 44% of events have no photo. Examples: `tg-harvest-fest-alondra`, `tg-skid-row-community-tday`, `g21-pershing-square-ice-rink`, `longbeach-turkey-trot-granada`. `venice-cinco-parade` image is blocked cross-origin. | Wrong picture on a card and in the share preview looks careless; hot-linked images can vanish. | Add a photo check to upkeep: reject images that are mostly text/logos or whose alt/filename contains "logo", "badge", "banner"; prefer venue photos; copy to R2; show the stock category image instead of a wrong one. Sample 40 per month and log the miss rate. | M |
| DAT-02 | P1 | `events.city` and `/in/<slug>` | [T] `/in/los-angeles` says 31 events; 58 upcoming events have an LA address. 16 are "Downtown L.A.", others Hollywood 4, Westwood 2, Griffith Park 2, Highland Park 2, Fairfax, Westchester, Venice. Separate pages exist for "Downtown" (3, all San Diego) and "Downtown L.A." (16). 63 rows have an address city different from `city`; "La Cañada Flintridge" vs "La Canada Flintridge". | Searchers look for "Los Angeles" and see half the listings; thin neighborhood pages dilute SEO; "Downtown" is ambiguous. | Keep `city` = the postal/incorporated city and add a `neighborhood`/area field; render neighborhoods as filters inside the city page. Slug-merge existing neighborhood values with a migration. | M |
| DAT-03 | P1 | status | [T] 520 of 1,095 upcoming events are `expected` (47.5%); only 8 of 153 `drive` listings are confirmed; Orange is 58% expected. Within 14 days: 157 listings, 120 confirmed. | Families planning this week see estimates; the core "lights" use case is the least verified. | Prioritize `drive` and next-14-day expected rows in the confirmation waves; show "last checked" on cards (data has `lc`). | M |
| DAT-04 | P1 | coverage | [T] 21 real cities have 0 upcoming events (list in A4), 60 have 1. docs/coverage-cities.md priority list is the Oct 27 snapshot; 15 of its 25 zero-event cities are still zero. | Whole cities (e.g. Azusa, Calabasas, Highland) look empty; city pages 404 or are noindex. | Re-run the count each sweep and rewrite the list (a script can do this from `/api/events`); for cities with no event, make the 404/thin page show nearby cities and a "Add an event here" call to action. | S |
| DAT-05 | P2 | 39 rows `cg3-*`, `cg10-*`, `cg2-*`, `cg20-*` | [T] Names like "1111 San Carlos Road (Arcadia 2025 holiday decoration award winner)", start 2026-12-01, `expected`; 98 rows mention 2025 in name/blurb/hours/price. "From $24 (2024-25)" in a price. | A stale year in a 2026 listing reads as an error and the home is named by its house number. | Retitle as "Arcadia winning home: 25 W Naomi Ave" with a blurb "won in 2025"; keep the year out of the name. | S |
| DAT-06 | P2 | `h` and `p` fields | [T] 589 hours say only "check site" in 40+ phrasings; mixed dash styles (435 en, 196 em, 116 hyphen) and AM/PM styles; price shows "From $52.33" and "From $39"; 182 prices non-informative. | Inconsistent text looks unpolished and cannot be filtered. | Normalize in the validator: one dash, "5-9 PM" style, one phrase "Hours: check site"; add structured `price_min` for sorting. | M |
| DAT-07 | P2 | `free` vs `p` | [T] 6 rows `free:true` with non-free text (`g9-pendry-tree-lighting` "Check listing", `old-spanish-days` "Mostly free", `g19-ojai-holiday-home-tour-market` "Market free; home tour $50") and 4 rows `free:false` with "Free ..." text. | The Free filter and the tag may contradict the price text. | Validator rule: `free` must agree with text; mixed prices get a "Free + paid options" state. | S |
| DAT-08 | P2 | expected rows in the past | [T] 6 expected rows already started (`123farm` Nov 5, `citadel`, 4 "noche/viva la vida" Nov 7), 4 expected rows already ended. | An expected event with a past date should be confirmed, corrected or removed. | Weekly query for `status='expected' AND start_date < today`; resolve or end them. | S |
| DAT-09 | P3 | duplicates | [T] 31 groups (135 rows) share one source URL and start date (roundup pages as "official" link); 4 same-name groups are house-contest rows. No true duplicates found. | Users clicking "official site" land on a list. | Prefer an event-specific page; flag roundup URLs in validation. | M |
| DAT-10 | P3 | `ct` homes | [T] 60 contest-home rows exist while `/api/contests` lists one running contest and `/past` shows 0 results. | Fine today; worth keeping the rows' "contest closed" wording consistent after the contest. | none now | S |
| DAT-11 | P3 | `docs/confirmation-plan.md` | [T] Says "26 expected rows have hours that do not say check site"; now 13. Numbers are from Oct 26. | Stale doc numbers mislead the routines. | Generate the counts, or date them. | S |

### Visibility, SEO and speed (SEO)

| ID | Sev | Where | What I saw | Why it matters | Suggested fix | Effort |
|---|---|---|---|---|---|---|
| SEO-01 | P1 | `/` on phones | [T] Throttled mobile LCP 7.3 s, TBT 2.75 s, 1.9 MB; map blank at 5 s (`home-mobile-slow4g-5s.jpg`); desktop CLS 0.105 (shifts at 1.1 s and 2.4 s from the bottom sheet and map controls). 20 scripts, 362 KB JS, 560 KB events JSON, 150-280 KB raster tiles. | Most visitors are on phones in the evening on cellular. | Render the first screen list from server HTML; defer MapLibre and the chat widget until interaction; split the events JSON (nearest first / by season); reserve space for the sheet and map controls. | L |
| SEO-02 | P1 | `/in` desktop | [T] CLS 0.329 (single shift of the `.foot` block, h2 and links at 0.8 s). Mobile 0. | Fails the "good" CLS threshold on the city hub, an SEO landing page. | Give the late-inserted block a fixed height or server-render it. | S |
| SEO-03 | P2 | `/pricing`, `/contests`, `/tutorials` | [T] No `<link rel="canonical">`; `/pricing` has no og: or twitter: tags at all; `/contests` and `/tutorials` have no og:url or og:type. | Pricing is the page people share with prospective sponsors; links preview with a bare title. | Use the same `page()` head helper as the other pages. | S |
| SEO-04 | P2 | event pages og:image | [T] Hot-linked third-party image, often a roundup banner or a 2019 upload; no `og:image:width/height`; the site's `/cdn-cgi/image/` resizer returned 403/502 for some. 498 events use the generic card. share.png is 404 KB. | Share previews can break when the source removes the file; some apps skip images over 300 KB. | Serve og:image through the resizer (`width=1200,quality=70`) or from R2, set width/height; generate a text card (name, date, city) as the fallback; compress share.png under 300 KB. | M |
| SEO-05 | P2 | home JSON-LD | [T] Only `WebSite`; no `Organization` (name, logo, sameAs), no `SearchAction`, no `LocalBusiness`/profile data. City pages have no `ItemList` of their events. | Knowledge-panel and sitelinks signals, and "Google Business-style" info are missing. | Add Organization (Forza-TEK/SoCal Lights with logo, contact, social profiles) on the home page, ItemList on city pages. | S |
| SEO-06 | P2 | 520 expected events | [T] Expected events are `noindex` and not in the sitemap (by design), but they are 47.5% of the catalog; the pages are the long-tail "tree lighting in X" queries. | Many people search before dates are confirmed. | Allow indexing of expected events whose page already says "dates estimated" (and omit Event schema as now), or at least list them from city pages (which are indexable). | S |
| SEO-07 | P2 | `/past` | [T] Description says "Results of 0 finished home decorating contests", `ItemList` is empty, page is indexable. | A thin page promising results shows "0". | `noindex` until at least one result exists. | S |
| SEO-08 | P2 | `/c/*` | [T] robots.txt Disallows `/c/` while the pages also send `X-Robots-Tag: noindex`. A disallowed URL is never fetched, so the noindex is never read; the URL can still show in results with no description. The `/c/<slug>` preview card is the generic share.png. | Contest links shared on social get a generic card. | Remove the Disallow (keep noindex) so crawlers see it; for sharing, give each contest its own og:image and title. | S |
| SEO-09 | P3 | headers | [T] No `Strict-Transport-Security`, no `Content-Security-Policy` on any page. | Hardening and trust signals. | Add HSTS in `_headers` (and a report-only CSP). | S |
| SEO-10 | P3 | trailing slash and case | [T] `/in/los-angeles/` and `/e/<id>/` serve 200 (canonical set); `/in/Los-Angeles` is a 404. | Minor duplicate URLs; a mistyped capital is lost. | 301 to the lowercase, slash-less URL. | S |
| SEO-11 | P3 | city page copy | [T] LA page description says "Christmas lights, tree lightings, parades, Halloween" but lists events to Aug 31, 2027 (Nisei Week); city meta description is the same sentence as the visible subtitle on every city. | Slightly off-season text, duplicated copy. | Vary by season/type; include a city-specific sentence (top 3 events by name). | S |
| SEO-12 | P3 | help articles | [T] 61 articles in the sitemap with no FAQ/Article schema; no `security.txt`, `llms.txt`. | Small. | Add Article/FAQPage schema. | S |

### Admin (ADM)

| ID | Sev | Where | What I saw | Why it matters | Suggested fix | Effort |
|---|---|---|---|---|---|---|
| ADM-01 | P2 | Dashboard / missing data view | [T] Dashboard shows people, houses, funnel, top pages, usage banners but nothing about the data: expected vs confirmed, events with no photo/URL/hours check, expected-and-past rows, last-checked age, cities with zero events. The Events tab can filter only by season and text. | The owner finds problems by reading, not by a number. This audit computed all of them from the public API. | Add a "Data health" card (the A1-A4 counts) and Events filters: status, county, "no photo", "date passed", "last checked > 14 days". | M |
| ADM-02 | P2 | Orders / revenue | [T] Orders tab has views (Needs attention, Paid, Refunded, All) and counts, but no totals: no revenue this month, by plan, by product, no chart. Dashboard code has no revenue or order query. [C] | The owner cannot see income without Stripe. | Add a revenue strip to Dashboard and Orders (30 days, by product: featured, partner, contest pass, installer) from the `orders` table. | M |
| ADM-03 | P1 | Dashboard tile "map events" | [T] Locally shows 1,904 and the Events nav badge 1904, while the Events tab shows 957 for the current season and the public map says 950. [C] `dashboard.js` uses `SELECT COUNT(*) FROM events` (all seasons, ended included). | The headline number is not what is on the map; on production it will exceed the 1,130 the API serves. | Count only events the API would return (end date >= today - 3), and show confirmed/expected next to it. | S |
| ADM-04 | P2 | Destructive actions | [C] Five places use `confirm()`/`prompt()` (mark refunded, end comp, revoke pass, merge key, decline reason), unlike the "tap again" pattern elsewhere; native dialogs are also awkward on phones. | Inconsistent safety and wording. | Move to the existing `tap()` and `modalFrame` pattern. | S |
| ADM-05 | P2 | Bulk actions | [T] Only Houses waiting has select-all/approve. Events (957-1904 rows), Submitted events, Contests, Users have none; Events shows 60 at a time ("Show 60 more"). | Season roll-over and clean-up are one-at-a-time. | Bulk select on Events (set status, season, delete, set image) and submissions. | M |
| ADM-06 | P2 | Sorting | [T] No column sorting or sort control on any list (cards sorted by date or created time); Usage and Outreach tables are fixed. | Cannot sort by last checked, price or county. | Add a sort select in the toolbar. | S |
| ADM-07 | P2 | Navigation size | [T] 21 tabs, 5 groups; related items spread: Orders, Event Partners and Contest passes (inside Contests) are all money; Replaced records, Data check, Activity log are hygiene; Outreach, Ads, Email templates, AI assistant are marketing. | A new helper would not know where to look. | Group as Review, Content, Money, Marketing, System; put Orders, Partners, Passes together. | M |
| ADM-08 | P2 | Mobile | [T] No overflow and the bottom bar works, but the Events card list is 12,787 px tall at 390 px and the Help Center 7,197 px; the Edit event modal is long. | A lot of scrolling on a phone. | Collapse cards to one line with the actions behind a tap; paginate at 20 on phones. | M |
| ADM-09 | P3 | Things done by hand | [C] Per docs, the owner checks GitHub Actions runs, sweep routines ("no heartbeat"), Grok ad status, and uses Stripe for refunds ("Mark refunded" only records it). | Several steps could be buttons. | Show the last run of each routine and workflow on the dashboard (the heartbeat already exists for workflows); add "Refund in Stripe" link per order (partly present: link to payment). | M |
| ADM-10 | P3 | Empty states and errors | [T] Empty states are good and specific on all lists; there is no errors/health tile on the dashboard other than the limit banner; no failed-email or failed-webhook list. [C] | Silent failures. | Add "Errors, last 7 days" (mail failures, webhook failures, 5xx). | M |
| ADM-11 | P3 | Events search "no match" | [T] Search is server-driven ("160 events" for "santa"); a no-result query did not show the "Nothing matches that." message in my test (the element did not appear). | The user may think the page is stuck. | Show the empty message for server search too. | S |

## Counts

Total 34 findings: P0 0, P1 7, P2 17, P3 10.
By prefix: DAT 11 (P1 4, P2 4, P3 3), SEO 12 (P1 2, P2 6, P3 4), ADM 11 (P1 1, P2 7, P3 3).
P1: DAT-01, DAT-02, DAT-03, DAT-04, SEO-01, SEO-02, ADM-03.

Limits of this audit: Admin was exercised on a local database without users, orders or posts, so populated views (order cards, pending houses, user lists) and the real counts were read from code only; the live Admin was never opened. Page speed used simulated throttling, not Lighthouse (not installed). Source links that returned 403 could not be verified.
