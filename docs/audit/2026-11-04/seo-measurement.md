# SEO, measurement and growth-readiness audit (2026-11-04)

Read-only audit of https://socallights.app and the repo at latest main. Method: fetched all 320 sitemap URLs once (curl, about 5 requests/second, Chrome UA) and parsed title, meta, canonical, headings, links, JSON-LD and visible text; read `functions/` and `public/` source; used web search for backlinks and competitors. Where a number comes from the public `/api/events` instead of D1, it says so.

## Not verified
- **Cloudflare analytics:** no Cloudflare token exists in this session's environment (checked env vars). So GraphQL `httpRequests1dGroups`, the zone-id lookup and the D1 API were not queried. I compare site_hits with the Cloudflare numbers only as already recorded in `docs/monetization/data-2026-11-04.md`. Item 6 counts use the public `/api/events` (2,013 rows; 1,244 with end date >= today, matching the 1,244 in the docs).
- Google Search Console, index coverage, rich-result test and Core Web Vitals (no access). Schema checks below are my reading of Google's Event guidelines, not Google's validator.
- `/past/<slug>` previews: there are zero published past pages (the `/past` index says 0 results), so none could be fetched.
- Whether Googlebot sets `navigator.webdriver` when rendering: unknown.

## Summary

| Severity | Count |
|---|---|
| High | 4 |
| Medium | 8 |
| Low | 7 |

Headline: the site is technically clean (valid sitemap, absolute self-canonicals, no 404s or redirects inside the sitemap, correct noindex on private pages). The risks are accuracy of structured data, thin and orphaned city pages, an almost empty measurement layer for the funnels that matter, and a counter that cannot yet answer how many real people visit.

## Ranked findings

| ID | Sev | Area | Evidence | Impact | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| F1 | High | Structured data accuracy | `functions/in/[city].js:24-26` hardcodes `eventStatus: EventScheduled` for every event. Live: 1,244 Event blocks across 266 pages, 659 of them show the visible tag "Expected" and text like "Dec 1, 2026 - date estimated, check site" (e.g. /in/colton) while the JSON-LD says a firm `startDate` 2026-12-01 | Markup contradicts visible content for 53% of events; this is the pattern Google's structured-data spam policy flags (manual action removes rich results site-wide) | Emit Event JSON-LD only when `st === "c"`; for expected events omit the block (or the date). Keep visible text as is | S |
| F2 | High | Internal links | All 266 city pages link only to `/`, `/#city-x`, `/#e-id`, `/privacy`, `/terms` (computed over all pages). No link to a sibling city, county, `/pricing`, `/add-event`, `/help`. The homepage HTML has 3 links and none to `/in/*`. The only `/in/` link in app code is JS-rendered (`public/app.js:135`) | City pages are effectively orphans reachable by sitemap only; no link equity flows between them, no path from a city page to any conversion | Add to `page()` in shell.js a footer: county hub links, 5 nearest cities, "Add your event" (/add-event), /pricing. Add a static "Browse by city" list to the homepage HTML (`<nav>` inside `<noscript>` or real markup) | M |
| F3 | High | Thin content | 134 of 266 city pages have fewer than 3 events (84 have exactly 1); 143 are thin by (<150 words or <3 events); median 142 words, minimum 85. 74 pages list zero confirmed events (63 of them have 1-2 expected-only events). Boilerplate (5-gram shingles shared by 50+ pages) is a median 29% and up to 52% of a page | Large share of the 271-320 submitted URLs are likely "Crawled, not indexed" or soft-thin; dilutes crawl budget and sitewide quality signal at tiny traffic | Keep indexable only pages with >= 3 events or >= 1 confirmed; for the rest `noindex,follow` and drop from sitemap; add county hub pages (7 counties) as the strong tier. Add one real sentence per city (counts by type, date span) | M |
| F4 | High | Measurement | See funnel map. Only 8 click keys + page views exist. No counter for event-card open, any "completed" step, sign-in, email subscribe or install | Cannot tell which part of the funnel loses people; with tens of visits/day, even a single counter changes decisions | Add the keys in the funnel table (one allowlist edit in `functions/api/visit.js` plus one `tick()` each) | S |
| F5 | Med | Bot filtering / data trust | `public/hit.js:3`, `public/app.js:49`: only `navigator.webdriver` is checked. `functions/api/visit.js`: `/api/visit` is unauthenticated; page hits have no daily cap (only click keys do, line 17) and the group key is arbitrary text up to 40 chars, so anyone can create unlimited `site_hits` rows and inflate any page. Dedupe is per tab session per path (sessionStorage), so one visitor on 4 pages = 4 counts, and a new tab recounts | site_hits is a page-view-per-session count, not "real humans". Cannot be reconciled with Cloudflare (133-975 "uniques"/day vs 18 and 50 visits on Nov 2-3) | Rename in dashboard to "page views (JS browsers)". Allowlist page groups on the server (reject unknown `p`). Add a per-day cap on page keys. Optionally add one `visit:first` key per tab session to approximate visitors | S |
| F6 | Med | Event rich results completeness | JSON-LD missing on all 1,244: `image` (633 of the 1,244 events have an image in `/api/events`), `offers` (price known for paid events; free ones only get `isAccessibleForFree`), `organizer`, `performer`. `url` is `/#e-<id>` (fragment) on every block, so all 1,244 events share the canonical `https://socallights.app/` | Even after F1, Google may not show event rich results without image; required fields (name, startDate, location with address) are present for all. No endDate-before-start errors found (checked); all dates are date-only `YYYY-MM-DD` (valid) | Add `image` where present; add `offers` {price, priceCurrency, url} for paid events with a parsed price, price 0 for free; give events real URLs (see F8) | M |
| F7 | Med | Crawl rendering | `robots.txt` has `Disallow: /api/` and the homepage map loads data from `/api/events`; the homepage HTML has 41 words (an sr-only H1, search box, season button, skip link), no events, no `/in/` links. A crawler without JS sees an empty shell; Googlebot rendering is blocked from the data | Home page cannot rank for anything beyond brand; Google's rendered snapshot of `/` is probably an empty map | Allow `/api/events` in robots (`Allow: /api/events`), and put a server-rendered list of counties/cities and top events in the homepage | S |
| F8 | Med | Share previews and deep links | Map supports `/#e-<id>` (app.js:1323, selects the event) and city pages link to it, but a fragment never reaches the server: Slack, iMessage, Facebook, WhatsApp all unfurl the generic homepage ("SoCal Lights Finder", share.png). There is no `/event/<id>` page type | Every shared event link looks the same; zero organic acquisition per event; pitches to outlets cannot link to an event preview | Add `functions/e/[id].js`: server-rendered page with title, date, venue, own og tags and JSON-LD, canonical to itself, with "open on map" button to `/#e-id`. Also gives F6 real URLs | M |
| F9 | Med | Open Graph and Twitter | `functions/_lib/shell.js:81` (used by /in, /past, /help, /installer): og:title, og:description, og:image only. No `og:url`, `og:type`, `twitter:card`, `og:image:width/height/alt`. `/pricing`, `/privacy`, `/terms` have no og tags and no canonical; `/tutorials` has no canonical or og:url | Cost: X/Twitter renders no large card (no `twitter:card`), Facebook infers `og:url` from the canonical and `og:type` defaults to website, so impact is mainly X and first-fetch speed on Facebook. All pages share one image (`/img/share.png`, 1200x630, 405 KB, fine) so every city/help share looks identical | Add the four tags to `page()` (one line); per-city og:image not needed yet | S |
| F10 | Med | Titles and descriptions | All 266 city titles exceed 60 chars (56 + city name, max 79), so truncated in results. Descriptions are unique only by counts ("13 upcoming events in Irvine, Orange County: Christmas lights, tree lightings, ..."). 17 of 46 help titles exceed 60 | Weak click-through; Google may rewrite | Put city first: "Irvine holiday lights and events 2026 (13) | SoCal Lights". Put 2-3 real event names or the next date in the description | S |
| F11 | Med | Sitemap quality | `functions/sitemap.xml.js:13` stamps `lastmod` = today on all 320 URLs. No changefreq/priority (harmless). Includes `/past` (0 results, 52 words) | Google learns to ignore lastmod when it is always today; Search Console "271 discovered" predates the 46 help articles now in the sitemap (320 URLs) | Use `MAX(updated_at)` per city / article; drop `/past` until a contest result exists | S |
| F12 | Med | External signals | Web searches for `"socallights.app"` and `site:` return no page from the domain and no page linking to it (search tool limits apply, so this is "none found", not "none exist") | No evidence of backlinks or indexation; all growth is outreach-dependent | See partner counts below; track with Search Console Links report | n/a |
| F13 | Low | Images | 899 `<img>` on city pages, 100% have `alt=""` including event thumbnails | Lost image-search and accessibility value | Set `alt` to event name | S |
| F14 | Low | Past results | `/past`: ItemList with `numberOfItems: 0`; page says "Results of 0 finished ..."; no `/past/<slug>` exist | Empty ItemList is invalid for rich results; thin page in sitemap | Emit ItemList only when n > 0 | S |
| F15 | Low | Help center | 46 articles: unique titles and descriptions, 1 H1 each, 1-2 H2, 169-301 words (short). Article JSON-LD lacks image and publisher; `/help` index has none; no `BreadcrumbList` despite the visible crumb | Fine for support queries; no SERP enhancements | Add BreadcrumbList + FAQPage-style Q&A only where the article is literally a question | S |
| F16 | Low | Breadcrumbs | No BreadcrumbList on /in, /past, /installer; city pages do not show county as a link | Missed SERP breadcrumb and hub structure | Add Home > County > City (ties to F2) | S |
| F17 | Low | /tutorials | 29 words in HTML (content built by JS from `tutorials.json`), no canonical | Videos invisible to crawlers | Server-render titles and descriptions; add VideoObject for the shorts | M |
| F18 | Low | robots vs noindex | `/c/*` is both `Disallow` in robots.txt and `X-Robots-Tag: noindex`. Google cannot read the noindex on a blocked URL | Harmless while nothing links to /c/ publicly; a linked URL could appear URL-only | Remove `Disallow: /c/` and rely on noindex (previews still work either way) | S |
| F19 | Low | Platform | Cloudflare injects `speculation-rules: /cdn-cgi/speculation` on the sitemap response | Prefetch of non-human pages can add phantom views if hits count on load | Note only | n/a |

## Funnel instrumentation map

Existing design: `site_hits(day, page, n)` via `POST /api/visit`; page group counted by `hit.js` on 19 pages (map, city, help, contest, installer, tutorials, add, add-event, add-house, add-contest, contest-enter, feature, profile, pricing, ...); click keys in `CLICK_KEYS` (visit.js:15) are `click:ticket`, `click:event-link`, `click:feature-checkout-start`, `click:installer`, `click:shop`, `click:promote`, `click:route`, plus `ref:inst|cont|pub|soc` for `?ref=` landings. Admin dashboard (`functions/api/admin/dashboard.js`) shows 14-day page views, top 6 pages, and clicks for the last 7 days. "DB row" means the completion is countable from a table by `created_at` but is not on the dashboard as a funnel step.

| Funnel | Step | Counter today | Cheapest new key |
|---|---|---|---|
| Map -> event | Map visit | Yes, `map` (per tab session) | none |
| | Event card opened | **No** | `click:card-open` (on `selectKey` for `e:`, once per selection) |
| | Outbound click | Yes, `click:ticket` (Eventbrite/Ticketmaster/Fever) and `click:event-link` (other) via Event info button only | add `click:directions` (Apple/Google Maps links not covered; `click:route` covers only the route button) |
| Add event | Started | Page view `add-event` (not distinct from curiosity) | `add:event-start` on first field input |
| | Completed | DB row (`event_submissions`, 0 rows today); no counter | `add:event-done` on success response |
| Add house | Started / completed | `add-house` view; DB rows in `posts` | `add:house-start`, `add:house-done` |
| Add contest | Started / completed | `add-contest` view; DB `contests` | `add:contest-start`, `add:contest-done` |
| Sign-in | Started | **No** (only `profile` page views) | `auth:start` when the sign-in dialog opens |
| | Completed | DB rows in `users` (5) | `auth:done` after `/api/auth/me` first returns a user (once per tab) |
| Featured | Page view | Yes, `feature` | none |
| | Checkout start | Yes, `click:feature-checkout-start` | none |
| | Paid | DB `feature_orders` (0) and Stripe (0 charges); no counter | none needed; add `feature_orders` paid count to dashboard |
| Contest | Contest page | Yes, `contest` | none |
| | Entry | `contest-enter` view; DB `posts` | `contest:entry-done` |
| | Vote | DB `votes` (0); no counter | `contest:vote` (server-side in the vote endpoint, increments same table) |
| Email | Open dialog | **No** | `click:alerts-open` |
| | Subscribe | DB `alert_subs` (migration 0134); no counter | `alerts:subscribed` |
| Install | Install help/prompt | Page `help` views only | `click:install` (button), `install:done` on `appinstalled` event |
| Campaigns | Landing by ref | Yes, `ref:*` (4 groups) | add `ref:` for each outlet in the 12 pitched (e.g. `ref:momsla`), since all link to `/in/<city>` pages |

## Counter reliability and the Cloudflare comparison

- Humans estimate: unreliable. `navigator.webdriver` flags only automation frameworks (Selenium, Puppeteer defaults). It does not remove Googlebot's renderer, uptime checkers that execute JS, or cloud previewers that run headless Chrome without the flag. It also misses real humans with ad blockers or no sendBeacon. Pages dedupe per tab per path, so site_hits = page views per session, not visitors.
- Cloudflare vs site_hits (numbers from `data-2026-11-04.md`, not re-queried): 450-650 "uniques"/day and 14,546 page views over 10 days vs 18 and 50 counted visits on Nov 2-3. Gap of roughly 10-30x. Plausible causes (unverified): crawlers and no-JS bots (CF counts all), beacon blocking, and the sessionStorage dedupe. The counter began Nov 2, so only two days overlap; treat 18-50 as a floor.
- Fix path: add the `visit:first` key (one per tab session) and compare to site_hits for a week; pull CF `httpRequests1dGroups` with the read-only token in the next session (query `zones?name=socallights.app`, then `httpRequests1dGroups` sum `uniques`, `pageViews`, filtered to `clientRequestHTTPHost`).

## Link equity and partners

- **External links found:** none. Searches for `"socallights.app"` and `site:socallights.app` returned no page on or linking to the domain (results were unrelated businesses such as San Diego SociaLights). Cannot prove none exist; the Search Console Links report is the check.
- **Our listings that link to pitch targets** (from `/api/events`, 1,244 upcoming, matched on the source URL domain): Enjoy Orange County 38, Mom's LA 13, Patch 8, Secret LA 4, Atlas Heart 4, Pasadena Now 2, San Diego Family 1, LAist 1, Time Out 1. Zero for ABC7, OC Register, Press-Enterprise, Only In Your State. Related non-pitched sources: Eventbrite 70, Visit Pasadena 7, sandiego.org 22, KPBS 30. The Enjoy OC and Mom's LA numbers match `outreach-targets.md`. Every upcoming event has a source URL (0 missing), so the "we already credit you" line is true for 6 of the 12 targets; for the other 6 it is not.
- Because those outlets are linked from our pages, a reciprocal-link ask is credible; but F2 means our own link graph gives them nothing to point to except `/in/` pages that are thin (F3). Pitch only the strong city pages (Mission Viejo 54, San Diego 48, Riverside 34, Los Angeles 30, Temecula 25).

## Competitive snapshot (search snippets only; no traffic numbers)

Competitors named in `product-marketing.md` and found in search: Mom's LA, San Diego Family Magazine, The Atlas Heart, Christmas Lights Map (Product Hunt), local TV/newspaper maps (KSL, ABC15), LAist and ABC7 guides.

| Competitor | Has that we lack (page types/features, from snippets) | We have that they lack |
|---|---|---|
| Mom's LA | Single long "where to see lights in Los Angeles" page updated yearly, a separate tree-lighting-ceremony page, reader submission form onto the map | Per-city pages (266), dated and sourced rows, contests |
| San Diego Family | Interactive map that lights up nearby displays by ZIP code; print magazine and issuu syndication | Regional scope beyond San Diego |
| The Atlas Heart | Long-form county guides with maps ("15 best ... Orange County [2026 guide]"), refreshed yearly with the year in the title | Live, filterable data |
| Christmas Lights Map | Route planning and iOS app (the page says; Vancouver origin), no-sign-up submit | Southern California depth |
| KSL / ABC15 style maps | Annual "submit your display" campaign with the outlet's audience | Independence from one outlet |

Gaps in our page set versus these: per-event pages, county hubs, "best of" editorial lists with the year in the title, ZIP or "near me" landing pages. This list is from search snippets and may miss features.

## Verified OK

- robots.txt valid, points to the sitemap; blocks `/admin/`, `/api/`, `/add*`, `/profile`, `/c/`.
- sitemap.xml: valid XML, 320 `<loc>` unique, 0 duplicates (266 city, 47 help including the index, 1 installer, 6 core: `/`, `/pricing`, `/privacy`, `/terms`, `/tutorials`, `/past`), all 320 return HTTP 200 and none carries `X-Robots-Tag` or a robots meta noindex. No sitemap URL redirects.
- Redirects: http -> https 301, www -> apex 301, `/pricing.html` -> `/pricing` 308, `/index.html` -> `/` 308. `/in/<city>/` trailing slash returns 200 and its canonical is the no-slash URL (no duplicate indexing). Unknown city returns 404.
- Canonicals on /in (266), /help (46), /past, /installer, `/`: all absolute, https, self-referencing, no trailing slash.
- City pages: unique title (266/266) and description (266/266), exactly one H1, one JSON-LD block, events have name, startDate, endDate (never before start), location with PostalAddress and geo, `eventAttendanceMode`.
- Private pages: `/admin/*`, `/c/*`, `/contest*`, `/organizer*`, `/add-contest` send `X-Robots-Tag: noindex`.
- `/c/<slug>` shares correctly (checked with a Facebook UA on `/c/irvine-holiday-lights-contest`): own og:title, description, image, og:url, og:type, `twitter:card=summary_large_image`.
- Homepage has og:url, og:type, og:image with 1200x630 dimensions, twitter:card, WebSite + SearchAction JSON-LD.
- `share.png` returns 200, image/png, 1200x630.
- Privacy: counters store no IP, cookie or account; click keys are allowlisted and capped at 20,000/day.
