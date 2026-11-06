# SEO, measurement and growth audit (2026-11-07)

Read-only audit of https://socallights.app and `origin/main` at `1a86c27` (PR 380). Follows `docs/audit/2026-11-04/seo-measurement.md`. No application code was changed.

**Method.** Read `functions/`, `public/`, the Nov 4 audit and the monetization and outreach docs. Ran `npm test` (177 pass, 0 fail). Ran the app locally (`wrangler pages dev` with all 199 migrations applied to a scratch D1). Ran Lighthouse 12 (mobile emulation, default simulated slow 4G and 4x CPU) with the pre-installed Chrome on the live site and once on the local build, plus a Playwright Pixel 7 run for LCP, CLS, long tasks and an INP proxy. GET-only live requests: robots, sitemap, 48 sitemap URLs (30 `/e`, 12 `/in`, 6 `/help`), 14 core pages, `/api/events` once, and 60 outbound event links (random sample of confirmed upcoming events, 0.3 s apart). No writes, no crawling at scale.

## Top 5 (read this first)

1. **Event pages are islands, and the city pages still point at the map, not at them (H1).** 586 `/e/<id>` pages are in the sitemap, but `/in/mission-viejo` has 54 event links, all `/#e-<id>` (a fragment that never reaches the server) and zero `/e/` links. The Event JSON-LD on city pages also uses the `/#e-` URL. Median event page is about 100 words. Google can find them only through the sitemap and 20 hidden home links, with no internal link signal. Fix: link each card to `/e/<id>` (S).
2. **The homepage says nothing about what people search for (H2).** Title is `SoCal Lights Finder` (19 characters, brand only); meta description is year-round generic; og:title is the same. It is the page every ad, press link and share lands on. Fix: "Christmas lights near me" style title, one line (S).
3. **The first visit to the map is heavy and slow, and it is the page ads and shares land on (H5).** Lighthouse mobile performance 36, simulated LCP 20.9 s, TBT 4.4 s, 4.3 MB transferred of which 2.0 MB is images. Cause: remote event photos load full size on a first visit because the thumbnail probe result is only remembered after the first page load; city pages already use `/cdn-cgi/image` unconditionally and score 99 (418 KB). Fix: default remote thumbnails on (S).
4. **The counter will start losing data as soon as SEO works (H4).** `functions/api/visit.js` `group()` turns `/e/<id>` into its own key (`e/<id>`), and the 80-keys-per-day cap counts the `fn:*`, `click:*` and `ref:*` rows too. About 45 different event pages viewed in one day fills it, and from then on new page names are silently dropped. Fix: group `/e/*` as `event` and `/past/*` as `past` (S).
5. **91% of upcoming events end by Jan 6, and a city with no upcoming events returns 404 (H3).** 1,127 of 1,244 upcoming events end by 2027-01-06. `/in/<city>` and `/e/<id>` then drop out of the sitemap or 404, so every link and ranking earned this month evaporates. Needs a year-round design (county pages, "past and next year" sections) before outlets start linking (M).

**Counts:** High 6, Medium 8, Low 7. Nothing is a security problem or an outage. The urgent items are the timing ones: Christmas search intent ramps from mid-November and Google needs weeks, so H1, H2, H4 and H5 (all effort S) are worth shipping this week.

## Fixed since Nov 4 (verified live)

| Nov 4 item | Now |
|---|---|
| F1 Event JSON-LD on expected events | City pages emit Event only for confirmed events; `/e/<id>` emits Event only for confirmed, not-ended events. Expected and ended event pages are `noindex,follow`. Matches visible text. |
| F2, F3 orphan and thin city pages | `/in` hub, "near", county and "more places" links; 63 thin city pages are `noindex,follow` and out of the sitemap; 203 city pages in the sitemap. |
| F5/F7 hidden crawl path | Homepage now carries a server-rendered "Browse by city" list and 20 event links (words 41 -> 718). |
| F8 per-event pages | `/e/<id>` exists with own title, canonical, og and Twitter tags; the map's Share button shares it. |
| F9 og/twitter | Present on every server-rendered page (city, hub, event, help, past, installer). |
| F10 titles | City titles all at most 60 characters (12 of 12 sampled). |
| F11 sitemap | No `lastmod` (honest), `/past` omitted while empty, 848 URLs, all sampled return 200 with a self canonical. |
| F14, F16 | Empty ItemList gone from sitemap use; BreadcrumbList on `/in`, city and event pages (valid: 4 levels, last item without `item`, which Google allows). |
| Soft 404s | Unknown `/in/x`, `/e/x`, `/help/x`, `/installer/x`, `/c/x`, `/nope` all return a real 404. `/in/<city>/` and `/index.html` canonicalise or redirect. |
| Link rot | Sample of 60 confirmed events: 54 OK (90%), 3 bot-blocked 403 (sandiego.org), 3 errors (1 DNS, 1 reset, 1 TLS in this sandbox). Roughly 2 to 5% dead, down from 10.8% on Nov 4. |

## Ranked findings

### High

| ID | Area | Evidence | Impact | Recommendation | Effort |
|---|---|---|---|---|---|
| H1 | Internal links and event URLs | `functions/in/[city].js` builds cards as `<a class="ev" href="/#e-<id>">` (54 on Mission Viejo, 0 to `/e/`); its Event JSON-LD uses `url: <origin>/#e-<id>`. Sitemap lists 586 `/e/` URLs; the only crawlable links to them are 20 on the hidden home list. Sampled `/e/` pages: median 102 words, 30 of 30 have `BreadcrumbList` + `Event`. | The new per-event pages cannot collect internal link equity, and Google gets two different URLs (fragment URL = the home page) for one event. Pages that exist only in a sitemap are usually "Discovered, not indexed". | Card title links to `/e/<id>` (keep a small "map" button for `/#e-`); set city-page Event `url` to `/e/<id>`, or better, replace the per-event Event blocks on city pages with one `ItemList` of `/e/` URLs (Google prefers the Event markup on the event's own page). Add a few sentences per event page from existing fields (type, price, next date) so it is not 100 words of copied blurb. | S (links) + S (copy) |
| H2 | Homepage title and intent | `<title>SoCal Lights Finder</title>` (19 chars), `og:title` the same; description starts "Year-round Southern California events on one map: New Year's and Lunar New Year, Valentine's..." (187 chars, truncated, no "Christmas lights"). Visible H1 is screen-reader only. WebSite JSON-LD name is "SoCal Lights". | The homepage can only rank for the brand. In November to December it should answer "Christmas lights near me" and "holiday lights Southern California". | Seasonal title of 60 characters or fewer, for example "Christmas Lights Near Me: Southern California Map | SoCal Lights" (62; trim to "Christmas Lights Near Me, Southern California | SoCal Lights"). Description 150 to 155 chars with counts ("1,244 events in 266 cities"). Switch with the season through the same `seasons.js` data. | S |
| H3 | Season cliff | Computed from `/api/events` (1,244 upcoming): end dates Nov 233, Dec 815, Jan 99, Feb 14 ... Aug 17; 1,127 end by 2027-01-06. `functions/in/[city].js` returns 404 when a city has no upcoming events; sitemap and `/e` follow the same rule. | After Jan 6 about 90% of city pages and event pages vanish (404 or noindex) while their ranking, backlinks from Mom's LA, Patch and city sites, and Search Console history are exactly what we are building now. 404s are treated as gone. | Keep each city page alive all year: show "Past events here" (ended in the last 12 months) and "Next season expected" with the year in the copy; return 200 and keep it in the sitemap if the city had events in the last 12 months. Add 7 county pages (below). Do it before Dec 15. | M |
| H4 | Counter integrity | Reproduced `group()` from `functions/api/visit.js`: `/e/alhambra-lny` gives key `e/alhambra-lny`, `/past/foo` gives `past/foo`; only `/in`, `/c`, `/installer`, `/help` are grouped. `MAX_PAGES_PER_DAY = 80` counts all rows of the day in `site_hits`, including up to about 35 `fn:*`/`click:*`/`ref:*` keys. `hit.js` runs on `/e` pages. Admin "top pages" lists keys as stored. | Once Google sends traffic to event pages, each event becomes its own row; at about 45 distinct pages a day, any page name not yet seen that day (for example `sponsor`, `feature`) is dropped without error, and "top pages" fills with event ids. | In `group()`: `/e/` -> `event`, `/past/` -> `past` (and `in` -> `city` hub). Count the cap on page keys only (`NOT LIKE 'fn:%'` etc.). Add a test beside `tests/` for `group()`. | S |
| H5 | First-visit map weight | Lighthouse mobile (live): perf 36, FCP 2.0 s, LCP 20.9 s (simulated), TBT 4,380 ms, CLS 0.006, 77 requests, 4,298 KB (images 2,087 KB, JS 326 KB, fonts 27 KB). Local build gives the same (36, LCP 18.9 s). Largest items: kpbs.org photo 346 KB, squarespace 303 KB, `/api/photo` 305 KB, MapLibre natural_earth tiles about 300 KB each. Playwright Pixel 7 without throttling: LCP 2.9 s; with 4G + 4x CPU: LCP 6.5 to 7.3 s. Cause in `public/app.js` lines 568 to 573: `THUMBS_REMOTE` stays false until `probeRemoteThumbs()` returns and is only stored for the next visit, so first visitors get originals. `/in/mission-viejo` uses `/cdn-cgi/image/width=240` directly: perf 99, LCP 1.6 s, 418 KB. | This is the landing page for ads, shares, "Open on the map" buttons and direct visits. LCP over 4 s on a first visit loses people and costs ad quality. | Default `THUMBS_REMOTE = true` (city pages prove it works; `data-orig` already falls back on error). Request width 240 to 320 for list cards. Defer MapLibre tiles below the fold of the list on small screens. Re-run Lighthouse; target LCP under 4 s simulated. | S |
| H6 | Landing pages capture nothing | `functions/in/[city].js`, `functions/e/[id].js`, `functions/in/index.js`: no email form, no share button (the `data-share` handler in `shell.js` GALLERY is never used by any page), only "Open on the map", "Add an event", "Feature your event". The weekly-email sign-up (`openAlerts()`, `/api/alerts`, counters `fn:subscribe`, `fn:subscribe-confirm`) is only reachable from the map's More menu. | The organic and press visitors who arrive on a city or event page (the whole point of the SEO work) cannot subscribe or share without first opening the map. The weekly email is the only owned channel we can build. | On city pages: one inline field "Weekly list for <city>" posting to `/api/alerts` (the city and radius are known). On event pages: Share (Web Share API with copy-link fallback), "Add to calendar" (.ics link), and the same subscribe line. Count with `fn:subscribe` plus a `fn:subscribe-landing` key. | M |

### Medium

| ID | Area | Evidence | Impact | Recommendation | Effort |
|---|---|---|---|---|---|
| M1 | Event page title, description, image | 30 sampled `/e/` pages: 17 titles over 60 characters (max 66, e.g. "Alhambra Lunar New Year Festival in Alhambra, CA | SoCal Lights" 63), all 30 descriptions 190 to 200 characters (Google shows about 155). `/e/alhambra-lny` description reads "Feb 13, 2027, Feb 13, daytime; check site. Main Street, Downtown Alhambra, W Main St & S Garfield Ave, Alhambra, CA 91801, Alhambra." because the hours field starts with the date and the address already contains the city. 3 of 30 have an `http://` `og:image`; 12 of 30 fall back to `share.png`; images are hotlinked from third-party hosts (about 16 upcoming events use `http:`; 54 Eventbrite, 25 Squarespace, 23 KPBS). | Truncated titles; messy snippets; mixed-content image URLs fail on some social crawlers and in Google's Event image check; hotlinking depends on other sites staying up and on their permission. | Title: clip name to 40 and drop ", CA" when long. Description: clip at 155; skip `h` when it repeats the date; do not append the city if the address has it. Upgrade `http:` to `https:` (or route through `/cdn-cgi/image` as city pages do, which also fixes size). | S |
| M2 | Structured data quality | Live `/in/mission-viejo`: `streetAddress` = "555 The Shops at Mission Viejo, Mission Viejo, CA 92691" (full string, no `postalCode`); no `image`, `offers`, `organizer`; many events run 6 to 10 weeks (for example 2026-11-06 to 2026-12-24); the same event is marked up on `/in/<city>` and on `/e/<id>` with different `url`. Homepage SearchAction target `https://socallights.app/?q={search_term_string}` is not implemented (no code reads `q`; grep of `public/app.js` finds no `location.search` use), and Google retired the sitelinks search box in 2024. No Organization/logo block. `/e/` Event validity: required fields (`name`, `startDate`, `location` with `address`) present; `eventStatus`, `eventAttendanceMode`, `endDate`, `image`, `offers`, `description` present when data exists; date-only values are valid. | Markup is valid for the required fields, but street/postal parsing and image/offers gaps limit rich results; a dead SearchAction is noise. Google's Event policy is now satisfied for "expected" events (no markup) which was the Nov 4 risk. | Split `a` into street + `postalCode` (parse the trailing ZIP). Keep Event only on `/e/`; use `ItemList` on cities. For runs over 31 days use `eventSchedule` or leave as is and watch the Event enhancement report. Remove SearchAction or implement `?q=`. Add Organization (name, url, logo `/img/badge-512.webp`). | S |
| M3 | Missing canonical and share tags on money pages | Live: `/pricing`, `/privacy`, `/terms`, `/add-event`: no canonical, no og, no twitter. `/tutorials` and `/contests` have og:title but no canonical or og:url. `/add-event` has 3 H1 and 6 visible words (JS built). `/pricing` is the link in outreach (`outreach.md`, Draft C), so it is the page that gets pasted into chats. | Shared pricing links unfurl as bare URLs; duplicate-URL risk (`/pricing.html` redirects, but `?ref=`, `?paid=` variants have no canonical). | Add canonical, og:title/description/image/url and `twitter:card` to the static pages (one block, same as `index.html`). | S |
| M4 | robots.txt | `Disallow: /api/` blocks `/api/photo/...` (home and contest photos, used as og:image on `/c/` and the map) and `/api/events` (the data the homepage renders from); `Disallow: /c/` is also `X-Robots-Tag: noindex` (Google cannot read a noindex on a blocked URL; carried over from Nov 4 F18). Live file is 151 bytes. | Googlebot-Image and some social fetchers cannot load photo URLs; Google's render of `/` has no list. Low risk today, grows with photos. | Add `Allow: /api/photo/` and `Allow: /api/events` (longest match wins); drop `Disallow: /c/` and keep the noindex header. | S |
| M5 | Measurement gaps and ads | Measured: page views per tab session (`hit.js`), 18 `fn:*` funnel steps, 11 click keys, `ref:inst|cont|pub|soc` (a landing counter only). Not answerable: unique visitors, new vs returning, traffic source (no referrer bucket), conversion by source (funnel keys carry no source), landing page type, ad results. `docs/installer-banner.md` line 9 says "the owner drives visitors with Facebook and Instagram ads", but no doc records budget, landing URL or UTM, and no `ref` value distinguishes them. Cloudflare's Web Analytics beacon (`static.cloudflareinsights.com/beacon.min.js`) is already injected on every page, but its dashboard is not used in any doc. | Cannot tell whether paid social, press, Grok email or Google drives the 20 to 50 daily humans; cannot compute cost per signup or per paid order. | See "Privacy-light additions" below. Start with `src:` bucket counters and per-channel `ref` codes; read Cloudflare Web Analytics for uniques, referrers and Core Web Vitals field data. | S to M |
| M6 | Main-thread work (CWV) | Playwright Pixel 7: 15 long tasks totalling 2.2 s unthrottled (max 437 ms); 19 to 20 totalling 3.4 to 3.8 s with 4G + 4x CPU. Lighthouse: DOM 1,662 elements, main-thread 11.4 s simulated, `app.js` 4.8 s attributed (147 KB raw, 47 KB gzip), MapLibre 220 KB gzip from unpkg, Cloudflare bot JS 16 KB. CLS is fine (0.006 to 0.014). INP proxy fine: the only events over 16 ms were `pointerenter` at 24 ms; a tap on a list card produced no event over 16 ms. | TBT is the weak Core Web Vital on slow phones; field INP is probably fine. | Render the first 30 list rows, the rest on scroll or idle (`requestIdleCallback`); defer building markers and clusters until the map's `load`. Check CrUX once Search Console has enough data. | M |
| M7 | Hidden crawl list | `functions/index.js` appends `<nav class="sr" ...>` with `tabindex="-1"` links after the map: city and event links that sighted users never see. There is no visible link to `/in` from the map UI (`/in/<city>` is reachable only through "More in <city>" in a detail card). | Visually hidden links are tolerated when they mirror real content, but Google's guidance calls out hidden text meant for crawlers; a visible path to the same pages removes the question and helps people. | Add a visible "Browse by city" item to the More menu and the map footer linking to `/in`. Keep the list. | S |
| M8 | City page set shape | 266 cities, 135 with fewer than 3 events (83 with exactly 1); 63 are noindex, 203 are in the sitemap. `/in/downtown` and `/in/downtown-l-a` are both live (two spellings of one area), and `/in/los-angeles` coexists with neighbourhood pages (Hollywood, Westwood, Westchester, Wilmington). Sampled city pages: 247 words median, 316 for a 5-event city. | Cannibalisation between spellings; thin pages dilute. | Merge `Downtown` into `Downtown L.A.` at data level (canonical redirect); keep the 3-event or 1-confirmed rule; add county pages as the strong tier. | S to M |

### Low

| ID | Area | Evidence | Recommendation | Effort |
|---|---|---|---|---|
| L1 | Third-party assets | MapLibre JS and CSS from `unpkg.com` (blocking script at end of body), Google Fonts CSS (cross-origin, `display=swap` is set). | Self-host MapLibre 4.7.1 and the one font file; removes two origins and an outage dependency. | S |
| L2 | `/api/events` payload | 135,495 bytes gzip, 619,450 raw (down from 300 KB and 1.36 MB on Nov 4), `Cache-Control: public, max-age=60, s-maxage=120`, ETag present, preloaded in `index.html`. Brotli would save about 15%. | Fine now; ask Cloudflare for brotli (it does for browsers that send it, as it did for HTML). Revisit at 2,000 upcoming events. | S |
| L3 | Link rot | 60 sampled confirmed events: 54 OK, 3 blocked 403 (sandiego.org), 1 DNS failure (`lamesavillageassociation.org`), 1 connection reset (`danapointharbor.com`), 1 TLS error in this sandbox (`psfilmfest.org`). 4 of 60 point to a site home page rather than an event page (`knotts.com`, `pacificsymphony.org`, `lemongrove.ca.gov`, `psfilmfest.org` news page). | Re-check the 3 real failures; add "More info" fallback to the city or venue page when the source URL is a bare domain. | S |
| L4 | Help titles | 3 of 6 sampled help titles exceed 60 (max 87: "Add a presenting installer and quote requests \| Help Center \| SoCal Lights"). Descriptions are fine (86 to 180). | Drop "Help Center" from the suffix on long titles. | S |
| L5 | Sitemap `lastmod` | None (honest). Event pages have a real `updated_at` (`lc` in the API). | Optional: emit `lastmod` for `/e/` only from `updated_at`. Do not stamp today's date. | S |
| L6 | Share cards | One 1200x630 `share.png` (405 KB) for every city, help and county share; 40% of event pages also fall back to it. | A generated per-city card (name, count, season) later; low priority until shares exist. | M |
| L7 | Installer and past pages | `/installer/lights-up-today` has `LocalBusiness` with no address/telephone; title 71 characters; `/past` still empty (not in sitemap, correct); `/past/<x>` unknown slug returns a bare 42-byte 404. | Use the shell 404 page; add phone and areaServed to LocalBusiness when present. | S |

## Crawlability and indexability, end to end

| Check | Result |
|---|---|
| robots.txt | 200, allows `/`, blocks `/admin/`, `/api/`, `/add*`, `/profile`, `/c/`; points to the sitemap. See M4. |
| sitemap.xml | 61 KB, 848 `<loc>` (1 home, 5 core pages, 52 `/help`, 1 `/installer`, 204 `/in` incl. hub, 586 `/e`), no `lastmod`, no duplicates; matches the 586 confirmed upcoming events exactly. Well under the 50,000 URL / 50 MB limit. Served `public, max-age=3600`, built from D1 on each uncached request (5 small queries). |
| Canonicals | Self-referencing, absolute, https, no trailing slash on all 48 sampled sitemap URLs. Missing on `/pricing`, `/privacy`, `/terms`, `/add-event`, `/tutorials`, `/contests` (M3). |
| noindex logic | City: `noindex,follow` when under 3 events and none confirmed (code in `cityindex.js`; sample of 12 sitemap cities had none). Event: `noindex,follow` when expected or ended. Admin, `/c/*`, `/contest*`, `/organizer*`, `/add-contest` return `X-Robots-Tag: noindex` (verified live). |
| Redirects | `http` -> `https` 301; `www` -> apex 301 (https); `/index.html` 308 -> `/`. `http://www` did not resolve from this sandbox (proxy limitation, unverified). |
| 404 / 410 / soft 404 | Real 404 for unknown pages, cities, events, help, installers, contests. Ended events answer 200 with `noindex` (acceptable, they stay useful to users). No 410 used; fine. |
| JS vs server rendered | City, hub, event, help, installer, past pages are server rendered. Map content (list, details) is client rendered from `/api/events`; homepage now has 718 server words. `/tutorials` (37 words), `/contests` (33), `/add-event` (6) are client rendered. |
| Link graph and depth | `/` -> `/in` (hidden link) -> `/in/<city>` -> map. `/in/<city>` also links to 6 nearest cities and the county. Event pages are depth 3 by sitemap only (H1). No orphan city pages; `/e` pages are the orphans. |
| hreflang | Not needed (English only). |

## Titles, descriptions, OG and Twitter (sample)

| Page type | Sample | Title length | Description length | og / twitter | Notes |
|---|---|---|---|---|---|
| Home `/` | 1 | 19 | 187 | yes, 1200x630 | H2 |
| City `/in/<city>` | 12 | max 60, 0 over | 149 to 150 | yes | unique titles, no duplicates |
| Hub `/in` | 1 | 48 | 119 | yes | |
| Event `/e/<id>` | 30 | 17 over 60 (max 66) | all 190 to 200 | yes, 12 use `share.png`, 3 use `http:` | M1 |
| Help | 6 (+2 viewed) | 3 over 60 (max 87) | 86 to 180 | yes | L4 |
| Installer | 1 | 71 | 223 | yes | L7 |
| Pricing, Privacy, Terms, Add event | 4 | 22 to 29 | 42 to 142 | none | M3 |
| Tutorials, Contests | 2 | 23 to 24 | 97 to 103 | partial | no canonical |
| Past | 1 | 51 | 135 | yes | says "Results of 0 finished ..." (not indexed via sitemap) |

No duplicate titles in the 48 sampled sitemap URLs. `share.png` is 1200x630 PNG, 405 KB, returns 200.

## Page speed and Core Web Vitals

Lab numbers, Lighthouse mobile with default throttling (4x CPU, 1.6 Mbps), Chrome 153:

| Page | Perf | FCP | LCP | TBT | CLS | Transfer | JS | Notes |
|---|---|---|---|---|---|---|---|---|
| `/` live | 36 | 2.0 s | 20.9 s | 4,380 ms | 0.006 | 4,298 KB | 326 KB | images 2,087 KB; accessibility 100, SEO 100, best practices 61 (an `http:` image) |
| `/` local build | 36 | 1.8 s | 18.9 s | high | 0.008 | 3,880 KB | | same cause, confirms it is the code, not the network |
| `/in/mission-viejo` live | 99 | 1.6 s | 1.6 s | 50 ms | 0 | 418 KB | 35 KB | 14 thumbnails through `/cdn-cgi/image` (about 17 KB each) |
| `/e/alhambra-lny` live | 81 | 1.6 s | 5.0 s | 60 ms | 0 | 544 KB | 34 KB | LCP is the hotlinked 392 KB original photo; fix with the same resizer |

Playwright Pixel 7 on `/`: LCP 2.9 s unthrottled, 6.5 to 7.3 s with 4G and 4x CPU; CLS 0.006 to 0.014; INP proxy good (no interaction above 24 ms). Server response 30 to 140 ms. No render-blocking resources reported; fonts use `display=swap`; HTML is Brotli, `/app.js` is Brotli with a 4-hour cache (version-bumped by `?v=`). The Cloudflare Web Analytics beacon is present, so real-user vitals are available in the Cloudflare dashboard without any code change; the owner should look there and in Search Console's Core Web Vitals report.

## Keyword and landing-page opportunities (from the data)

Upcoming events by county: Los Angeles 376, Orange 296, San Diego 167, Riverside 152, San Bernardino 121, Ventura 68, Santa Barbara 64. Biggest cities: Mission Viejo 54, San Diego 47, Riverside 34, Los Angeles 30, Newport Beach 25, Temecula 25, Dana Point 24, Santa Barbara 23, Pasadena 22, Ladera Ranch 22. Season: 1,068 Christmas, 58 New Year, 47 summer, 37 spring, 34 Halloween. Confirmed by type: tree lightings 261, shows 81, turkey trots 74, parades 40, walks 26. Orange County's 138 "drive" listings (street displays) are almost all "expected", so they carry no Event markup and are noindex as `/e/` pages; they live only on city pages.

Name matches in upcoming events (total / confirmed): tree lighting 159 / 66; Santa and breakfast with Santa 113 / 67; parades 104 / 43; holiday markets 66 / 52; turkey trots 51 / 49; ice and snow 43 / 24; boat parades 24 / 11; Nutcracker 20 / 19; zoo and garden lights 20 / 11; Menorah 13 / 9; Day of the Dead 19 / 15.

Recommended pages, in order (each server-rendered from existing data, indexable only above a threshold, in the sitemap):

1. **County hubs** (7): `/in/county/orange` and so on, title "Christmas lights in Orange County 2026: <n> events and displays". Strongest tier, also the year-round fix for H3. Highest value because "christmas lights orange county" style queries are the head terms.
2. **Time-critical type pages, ship first**: `/turkey-trots` (49 confirmed, most dates Nov 26, three weeks away), `/tree-lightings` (66 confirmed, Nov 20 to Dec 5), `/christmas-parades`, `/boat-parades` ("Newport Beach Christmas boat parade" and "Dana Point" are local head terms; 11 confirmed), `/santa-breakfasts-and-photos`.
3. **"Christmas lights near me"**: cannot be a static page; use the homepage (H2) plus a `/near-me` landing that asks for location once and opens the map list sorted by distance (the map already has "Use my location").
4. **"This weekend"**: `/this-weekend` rebuilt daily from confirmed events (title "Holiday events this weekend in Southern California"); strong repeat-visit and email hook.
5. **Free drive-through and walk-through light shows** (`/light-shows`): 162 matches, but only 30 confirmed; list confirmed first.
6. **Year-round after Jan 6**: Lunar New Year, Valentine's, spring blooms, July 4 (data exists: 10, 37, 47 events); keep the same page templates.

## Search Console readiness (what the owner should check)

`docs/monetization/project.md` records a property exists and the sitemap was read ("271 pages discovered"). The site serves no `google-site-verification` meta tag, so ownership is by DNS or an HTML file; confirm it is a Domain property. Then, this week:

- **Sitemaps:** resubmit `https://socallights.app/sitemap.xml`; the count should read 848 and "Success".
- **Pages (indexing):** look at "Crawled, not indexed" and "Discovered, not indexed" for `/e/` and `/in/` separately. If most `/e/` are "Discovered", that confirms H1.
- **URL inspection:** inspect `/`, `/in`, `/in/mission-viejo`, one `/e/` page; check "Google-selected canonical" equals ours and view the rendered screenshot of `/`; request indexing for `/in` and the 10 largest cities.
- **Enhancements:** Events (valid items, warnings for missing image and postal code), Breadcrumbs, Sitelinks searchbox (should show none or deprecated).
- **Core Web Vitals** (mobile): expect "not enough data" for now; check again in a month.
- **Performance:** queries containing "christmas lights" and the city names, filter by page `/in/`, `/e/`; note average position and impressions, not just clicks (traffic is tiny).
- **Links:** who links to the site (press, Covina, city sites).
- **Settings > Crawl stats:** confirm `/e/` crawl rate and that `/api/` blocks do not appear as errors.
- Add the site to **Bing Webmaster Tools** (import from Search Console, free); Cloudflare Crawler Hints and IndexNow are one toggle each.

## Analytics: what we can and cannot answer

| Question | Today | Source |
|---|---|---|
| Page views per page group (per tab session) | Yes | `site_hits`, `hit.js` |
| Funnel steps (visit, event open, sign-in, add event/house/entry, subscribe, event feature, sponsor) | Yes, 18 keys, server-counted where possible | `functions/_lib/funnel.js`, admin "How people use the site" |
| Clicks out (ticket, event link, installer, route, shop, promote) | Yes | `click:*` |
| Landings from a tagged link (installer, contest, press, social) | Yes, 4 groups | `ref:*` |
| Unique visitors | No (a tab-session count only; Cloudflare "uniques" is the nearest, includes bots) | Cloudflare dashboard |
| Where traffic comes from (Google, Facebook, Instagram, direct) | No in our data | Cloudflare Web Analytics has referrers |
| Conversion by source | No | |
| New vs returning | No | |
| Which landing page type (city, event, home) a visit started on | Partly (page counts, not first page) | |
| Ad spend vs result | No | |

**Privacy-light additions** (no cookies, no IPs, no per-person ids; each is one more integer per day in `site_hits`, so the existing privacy text still holds, with one added sentence):

1. `src:` bucket on the first page of a tab session, from `document.referrer` host only: `search`, `facebook`, `instagram`, `nextdoor`, `email`, `other`, `direct`. One new key per bucket.
2. Extend the `ref` allowlist from 4 to about 10 codes (`fb`, `ig`, `press`, `city`, `nextdoor`, `email`) and keep it in `sessionStorage` (already done). Print it on every ad and outreach link.
3. `land:` first-page type counter (`home`, `city`, `event`, `help`) once per tab session.
4. Conversion by source without identifying anyone: when a conversion fires (`fn:subscribe`, `fn:add-event-done`, `fn:event-feature-checkout`), the browser sends the stored `ref` bucket and the server bumps `fn:<step>:<bucket>`. Keep the allowlist closed so it cannot grow rows.
5. New vs returning: one `localStorage` flag only when the owner decides it is worth a sentence in the privacy page; otherwise skip.
6. Exclude crawlers from counts by also checking `navigator.userAgent` for `bot|crawl|spider|headless` in `hit.js` (the current `navigator.webdriver` check misses Googlebot's renderer).

## Growth levers already built and unused

| Lever | State | Gap and next step |
|---|---|---|
| Weekly email alerts | Built (`/api/alerts`, confirm, unsubscribe, send); counters exist | Only in the More menu. No capture on city or event pages (H6). No evidence of any subscribers in the docs. |
| Share | Event Share button on the map shares `/e/<id>` with a preview card; route share exists | No share on `/e` or `/in` pages; no "Share this list" for `/in/<city>`. |
| Routes | Built, `click:route` counted; Covina staff named it their favourite | Not a landing page: no "best 5 in <city>" route page or content; not in any outreach template except the Grok playbook. A "Drive these 9 stops" link on city pages would use it. |
| Contests | Free contest tool; `/past` empty; Covina agreed to a demo (Nov 5) | No public contest is listed (`/api/contests` returns `[]`), so contests drive no traffic yet. Covina has no 2026 contest created (per `docs/monetization/outreach.md` log: "open"). |
| Installer banner and top-of-list sales | Live: Banner $50, Banner and top $75, at `/sponsor` | 1 installer page in the sitemap, 3 homes returned by `/api/posts`; strategy's own gate (3+ installers, 25+ homes) is not met; sellable only on an honest audience statement. |
| Affiliate links | `amazonTag` set (Associates approved about Oct 21; first 3 qualifying sales due by about 2027-04-19); Shop tab live; `ticketAffiliates` is `{}` (empty) | Apply to Fever (Impact) as planned; 70 Eventbrite listings are unmonetised. Expect small revenue; keep disclosure. |
| Tip jar | Cash App link set in `site-config.js` | Unmeasured; no counter for the tip button. |
| Featured events and homes | Funnel built, counters `fn:event-feature-*` | $0 revenue so far per docs; no outreach has offered Featured placements since Draft C. |

## Outreach and marketing sanity check

What the docs say: strategy v2 says this season is about proof; outreach drafts A to D (nothing sent unless logged); the Covina Zoom demo was held Nov 5 with strong interest and no 2026 contest created; the Grok email playbook sends installer and organizer emails from the owner's mailbox with `?ref=inst` and `?ref=cont`; `installer-banner.md` says the owner drives visitors with Facebook and Instagram ads.

Findings:

- **Paid social has no paper trail.** One sentence in `installer-banner.md`; no budget, landing URL, creative, audience or tracking in any doc. With 20 to 50 human visits a day, even small spend dominates traffic, and nothing can separate it from organic (M5). The landing page matters: the map home scores 36 on mobile, and city pages score 99.
- **Contradictions between docs.** Draft D (installer) says "I'm not selling anything" while `/pricing` and `/sponsor` now sell installer placements; `strategy.md` says no installer payments until 3+ installers, and the owner overrode it on Nov 6. Grok playbook says "never ask an organization to confirm, check or fix individual events" while `outreach.md` Draft B asks exactly that. `outreach.md` numbers say 579 confirmed and "266 city pages"; live is 586 confirmed upcoming and 203 indexable city pages.
- **No outreach log.** The status table in `outreach.md` has one row (Covina). The 12 send-ready emails and the Nov 5 sends are not logged, so replies and sends cannot be audited.
- **The honest claims are correct.** `/pricing` makes no traffic claims; the playbook bans them; keep that.
- **Facebook and Instagram DM automation is rightly marked high risk** in `grok-outreach-guide.md`; ads are a different, safer channel.

### Five recommendations, ranked by expected impact

1. **Fix the landing experience and tag every outside link, before spending more on ads (H5, H2, M5).** Send ads and DMs to a city page (`/in/<city>`, 99 Lighthouse) or a lightweight landing with a clear "open the map" button, not the heavy map home. Add `?ref=fb`, `?ref=ig`, `?ref=press` and per-outlet codes. Without this, every dollar and every email is unreadable. Effort S to M. Impact: high.
2. **Ship event-page links and the time-critical type pages this week (H1, county and type pages).** Turkey trots (Nov 26), tree lightings (Nov 20 to Dec 5), boat parades and Christmas parades are searched in the next four weeks and are already in the data as confirmed. This is the one thing that can still catch the 2026 season. Effort S to M. Impact: high.
3. **Capture email on the pages search sends people to (H6).** City and event pages get a one-field "weekly list for <city>" and Share. The email list is the only owned channel and the basis for a sponsor newsletter later (strategy Stage 3). Effort M. Impact: high over the season, compounding.
4. **Make Covina the proof and the first link.** Ask Covina to link `/in/covina` (it is indexable and in the sitemap) and the contest page from the city's own events page, and for permission to say "Covina runs its contest on SoCal Lights" (goal 4 in `covina-meeting.md`). A `.gov` link and a named city are worth more than a dozen cold emails. Do not wait for resident entry: the city said staff will enter addresses, so have the owner create the contest for them and use `ref=city`. Effort S. Impact: medium to high.
5. **Pitch the five strong city pages to the six outlets that already link to us, one code per outlet (Mom's LA, Enjoy Orange County, Patch, Secret LA, Pasadena Now, Atlas Heart),** using the live counts (Mission Viejo 54, San Diego 47, Riverside 34, Los Angeles 30, Temecula and Newport Beach 25). Fix the doc contradictions first (Draft D, Draft B vs playbook), log every send, and add the outlet code to each link so results can be attributed. Effort S. Impact: medium.

## Not verified

- Search Console data (index coverage, rich result reports, CrUX): no access. Schema checks are against schema.org and Google's Event documentation as I know them, not Google's Rich Results Test.
- Lighthouse numbers are lab, simulated throttling from one sandbox IP; the local build ran on a laptop-class container. Field data is in Cloudflare Web Analytics and Search Console, which I could not read.
- `http://www.socallights.app` redirect (DNS did not resolve through the sandbox proxy); `/c/<slug>` share card (no public contest exists, so no live card to fetch).
- Link-rot sample is 60 events from one IP; the 403 results are bot blocks, not proof of dead links. One TLS failure may be this sandbox's certificate store.
- Whether Googlebot's renderer sets `navigator.webdriver` (affects whether crawlers are counted).
