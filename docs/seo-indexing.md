# What search engines may index, and how pages are addressed

Written 2026-11-11 (audit batch D1, items SEO-02 to SEO-12 and MAP-12, MAP-13, MAP-15). The code is the source of truth; the tests in `tests/seo-admin.test.mjs` fail if it drifts from this page.

## Event pages (`/e/<id>`): the exact indexing rule (SEO-06)
One function decides, `eventIndexable(e, today)` in `functions/_lib/eventld.js`. The event page, the sitemap and the tests all use it.

A page is indexable (no `noindex`, listed in `sitemap.xml`) when ALL of these hold:
1. The event has not ended (`end_date >= today`, Pacific date).
2. It has no notice (not cancelled, not postponed).
3. Either its dates are **confirmed**, or they are **expected** and BOTH:
   - the event has a public source link (`url`, http or https) that a visitor can check the dates on, and
   - it starts within **180 days** (`EXPECTED_DAYS`). A guessed date a year away is not offered.

Everything else keeps `<meta name="robots" content="noindex,follow">` and stays out of the sitemap (ended, cancelled or postponed, expected with no source link, expected and further than 180 days away).

What an indexable *expected* page says, so nothing claims more than we know:
- the page already shows "(date estimated, check the event's site)" and the plain-words summary says the dates are estimated from past years;
- the search-result description says "(dates estimated)" (`eventDesc`);
- it gets **no schema.org `Event` data**. That markup states a firm date and a "scheduled" status, so it is written only for confirmed events that have not ended (`eventLd`, unchanged). City pages follow the same rule for their `Event` markup.

Trade-off (owner decision, 2026-11-11): about half of the catalog is "expected", so this opens many long-tail pages ("tree lighting in X") but some listed dates will be wrong. The source-link and 180-day conditions limit that. To tighten it, lower `EXPECTED_DAYS`; to turn it off, make `eventIndexable` return `false` for `st !== "c"`.

## Share pictures (SEO-04, MAP-12)
- An event page's `og:image` is its own photo served from our domain through the Cloudflare resizer: `/cdn-cgi/image/width=1200,height=630,fit=cover,quality=70,format=jpeg/<https photo>`, with `og:image:width`/`height` and `twitter:image`. A photo stored as `http://` is asked for over https. No photo: the site card `/img/share.png` (1200 x 630, also with size tags and `twitter:image`).
- Every page that uses `page()` in `functions/_lib/shell.js` now writes the size tags and `twitter:image`.
- Contest pages (`/c/<slug>`) use the contest's first approved photo the same way, else the site card.
- Risk to watch: if the resizer cannot fetch a source photo (the audit saw some 403/502 answers for sites that block it) the preview falls back to nothing for that event. A real text card (name, date, city) would remove that; it needs an image generator and was not built.
- Not done: `share.png` is still 404 KB (some apps skip images over 300 KB); it needs re-exporting by hand.

## Titles
`eventTitle` (60 characters at most): the whole name with the city when it fits, then without the city, then the name alone with no "| SoCal Lights" suffix. A name too long even then is cut at a word boundary, little words ("at", "the", "of"...) are dropped from the end, and an ellipsis is added only when something was cut.

## One address per page (SEO-10)
301 redirects (the query string is kept):
- `/in/Los-Angeles`, `/in/los angeles`, `/in/los-angeles/` go to `/in/los-angeles`; `/in/` goes to `/in`.
- `/e/<id>/` goes to `/e/<id>`; an id typed in another letter case goes to the real id when only that id exists (unknown ids stay 404).
- `/help/`, `/help/<Slug>`, `/help/<slug>/`, `/past/`, `/past/<Slug>` likewise.
Helper: `functions/_lib/redirect.js`.

## Sitemap (MAP-15)
`<lastmod>` is the event's (or Help article's) own `updated_at` date. Pages without a real date have none: stamping every URL with today's date teaches search engines to ignore it. City pages have no lastmod yet (their events' dates are not read for the sitemap).

## Other
- `/past` is `noindex` until at least one contest result exists (SEO-07). `robots.txt` no longer disallows `/c/`, so crawlers can read the `X-Robots-Tag: noindex` that contest pages send (SEO-08).
- Pricing, Contests and Tutorials have a canonical link and the full share tags (SEO-03). Note `/contest*` (which includes `/contests`) is `noindex` by header (unchanged).
- Home page JSON-LD is a `@graph` of `WebSite` and `Organization` (name, legal name Forza-TEK, logo, support email). No `sameAs`: no social profiles are recorded in the repo; add them when they exist. City pages add an `ItemList` of their events (SEO-05).
- City page meta descriptions name the three best events and the season most of the next events belong to; the visible line under the title is a different sentence (SEO-11).
- Help articles already had `Article` data. `FAQPage` was not added (the articles are not question lists).
- `/in` layout shift (SEO-02): measured locally at 1440 px, CLS 0.327 from one shift at about 0.8 s: the first county's list of city links wrapped into fewer lines when the web font replaced the fallback font. The lists are now a grid with fixed column widths (`.cgrid`), so the row count no longer depends on text width: CLS 0.000 at 1440 px and at 440 px. The page is longer at desktop width as a result. Other pages with long link lists (`.foot`) can still reflow the same way; they are short.

## Security headers (SEO-09)
`functions/_lib/secheaders.js` is the one list; `public/_headers` (static files) and `functions/_middleware.js` (Function responses) carry the same values, and a test compares them.
- `Strict-Transport-Security: max-age=31536000` (one year). No `includeSubDomains`, no `preload`: both are hard to undo.
- `Content-Security-Policy-Report-Only`: **nothing is blocked.** A browser only writes "[Report Only] Refused to ..." in its console. There is no report collector. To enforce later: open the map, a contest page, the add forms, sign-in, a payment return and Admin with the console open, fix every line, then rename the header to `Content-Security-Policy`. The policy allows inline scripts and styles (`'unsafe-inline'`) because the pages use them.

## Event page buttons (MAP-13)
Favorite (same `socal-favs` list in this browser as the map, so a heart here shows on the map), Add to calendar (`/e/<id>.ics`, a calendar file built on the server from the event's hours, all-day when none), Directions (Google Maps; the map app's own chooser is not on this page). The Favorite is per browser: it is not synced to an account.
