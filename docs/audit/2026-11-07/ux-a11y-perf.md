# UX, accessibility and front-end performance audit, 2026-11-07

Scope: live https://socallights.app (GET and navigation only, nothing submitted) and a local `wrangler pages dev` built from `origin/main` at 668b381 (PR 379) with `DEV_AUTH`, a local D1 with all migrations and the tutorial demo seed (`scripts/tutorials/seed-demo.mjs`). Read-only for application code. Tools: Playwright 1.63 with the pre-installed Chromium, axe-core (WCAG 2.0/2.1/2.2 A and AA plus best practice), Lighthouse 12 (mobile, simulated Slow 4G), curl. Raw outputs were kept outside the repo; a few small screenshots are in `docs/audit/2026-11-07/ux-shots/` (about 0.5 MB).

## Top 5

1. **Map, mobile performance (High).** Lighthouse mobile on `/`: performance **38**, simulated LCP 20.4 s, TBT 2,640 ms, 4.3 MB transferred, 20 long tasks, best-practices 58. Observed LCP breakdown is much better (about 2.9 s: 348 ms first byte plus 2.6 s render delay), so most of the 20 s is Lighthouse extrapolating a heavy page. The weight is mostly card thumbnails that are not resized (a 306 KB `/api/photo/...` image for a thumbnail, external photos of 150 to 350 KB each: Lighthouse estimates 576 KB savings), plus MapLibre (207 KB br from unpkg, 128 KB unused JS in total, render-blocking about 930 ms). Every other page scores 98 or 99.
2. **Search box has no visible keyboard focus (Medium, WCAG 2.4.7).** `#q` sets `outline:none` (styles.css line 61) and nothing on `.search` replaces it. Tabbing to Search shows no ring (screenshot `ux-shots/local-search-focus.jpg`). Every other tab stop on 13 pages checked had a ring.
3. **The "Use my location" card covers the event detail's Back button (Medium).** Open any event by deep link (`/#e-<id>`, shared links) on a phone: the location prompt sits on top of the detail hero and hides the Back control (`ux-shots/live-map-detail-phone.jpg`). The sponsor strip also overlaps the Back button in the detail view (`local-detail2.jpg`).
4. **Mixed content and wasted preloads on the map (Medium).** Event photos stored as `http://` URLs (static1.squarespace.com, villagebible.com) are requested over http on an https page (Chrome auto-upgrades some, hence Lighthouse "is-on-https" and best-practices 58). Separately, the `<link rel=preload>` for `/api/events` and `/api/posts` (PR 347) is not used when the service worker controls the page ("cross-world service worker resource mismatch"), so those fetches are duplicated.
5. **Tutorials are out of date in three groups (Medium).** The `feature` video predates the rebuilt funnel (PR 374) and the redesigned Pricing page (PR 370/371/373); `map` and `night` predate the installer banner strip (PRs 363 to 366) and the on-demand description (PR 369); the 25 original videos predate the cream restyle (PR 353/356). See "Tutorials versus UI".

Good news worth stating: axe found **no serious or critical violations on 24 live pages and 34 local pages across 4 viewports and both themes**, other than the three items listed under "axe results"; no horizontal overflow at 390, 768, 1280 or 844x390 on any page; reflow holds at 320 CSS px and at 200% zoom (640 px) on 10 pages; keyboard order matches visual order on all 13 pages tried.

**Status 2026-11-06:** fixed in the phone-performance PR: P1 (thumbnails, lazy cards, self-hosted MapLibre loaded after the list), P2, A1, A2, A3 (detail/event-page links), A4 (device dark setting), A5 (reduced motion), U1, U2, M1, M2 (Filters). Not touched: T1, C1, V1, O1, A6-A8.

## Counts by severity

| Severity | Count |
|---|---|
| High | 1 |
| Medium | 7 |
| Low | 15 |
| Info (already known or by design) | 6 |

Nothing is urgent (no data loss, no broken purchase or sign-in path found).

## Findings

IDs are stable for follow-up. "Fix" is a concrete change; no application code was changed.

### High

**P1. Map page performance on a phone.** Evidence: Lighthouse mobile run on live `/` (single run, simulated throttling, software WebGL): FCP 1.9 s, LCP 20.4 s, TBT 2,640 ms, SI 7.0 s, bytes 4,296 KiB, bootup 2.1 s, main-thread 7.4 s, 1 layout shift (`aside#panel > div#phead`, CLS 0.006). Largest transfers: `kpbs.org` photo 347 KB, two OpenFreeMap `natural_earth/ne2sr` PNG tiles of about 300 KB each (four such tiles load), `/api/photo/p/377c55677a574f02/1.jpg` 306 KB (Lighthouse: 296 KB wasted), squarespace 303 KB, downtownsm.com 219 KB, `maplibre-gl.js` 207 KB, `/api/events` 130 KB. Unused JS 128 KB (maplibre and `app.js`), unused CSS 13 KB, 27 KiB legacy JS, 10 KiB unminified JS. Fix: (a) route every card thumbnail through the existing `/cdn-cgi/image/width=240` transform, including `/api/photo/...` and external URLs (city pages already do this and weigh 12 to 16 KB); (b) lazy-load the second to sixth card images rather than `loading="eager"` for the first six; (c) self-host MapLibre with a preload so it is not render-blocking and can be precached; (d) split rarely used code (filters panel, alerts, routes, lightbox) from `app.js`; (e) use `maxzoom`/lower raster `natural_earth` tile use at zoom 6 or switch that layer to vector. Expected: perf score above 70 on the same run. Caveat: one run per page; Lighthouse's simulated LCP is far above the observed 2.9 s.

### Medium

**A1. No visible focus on the search input.** Steps: live `/`, press Tab three times (skip link, brand, search). Computed outline `none`, box-shadow `none`, parent border unchanged. Fix: `.search:focus-within{outline:2.5px solid var(--focus);outline-offset:2px}` (keeps the existing `input{outline:none}`).

**U1. Location prompt covers the event detail's Back button.** Steps: phone width, open `https://socallights.app/#e-soc-la-pumpkin-patch-gone-wrong` (fresh profile). `#welcome` stays on screen above the detail hero. Fix: do not show `#welcome` while the detail view or a hash route is open; hide it when `openEvent` runs; it should also not be a first-visit cover for people who arrived on a shared event link.

**U2. Sponsor strip overlaps the detail Back button.** Local build, tap any card on a phone: the strip's "SPONSOR" pill is drawn under the round Back button (`ux-shots/local-detail2.jpg`). Fix: add `top` offset equal to the strip height to `.hero .back` and `.hero .credit`, or hide the strip while a detail is open.

**M1. Mixed content.** Console on live `/`: "Mixed Content ... requested an insecure element 'http://static1.squarespace.com/...' and 'http://www.villagebible.com/...'". Fix: at render time rewrite `http://` image URLs to `https://` (and fall back to the stock tile on error, which already exists), and in the import scripts reject non-https images; or add `Content-Security-Policy: upgrade-insecure-requests` (can ride with the report-only CSP the earlier audit recommended).

**M2. Filters dialog focus management.** `#fpanel` has `role=dialog aria-modal=true aria-label="Filters"`, but on open the focus stays on `<body>` (not inside the dialog) and after Escape it lands on `<body>`, not the Filters button. The alerts dialog does it right (focus goes to the email field). Fix: focus the dialog heading or first control on open and restore focus to the opener on close; same check for the report-a-problem dialog and the lightbox.

**P2. Preloads wasted when the service worker is active.** Console: "A preload for 'https://socallights.app/api/events' is found, but is not used because it is a cross-world service worker resource mismatch" (same for `/api/posts`) on warm visits. The SW then fetches the lists again. Fix: remove the preloads for returning visitors (they help only the first visit) or have the SW answer them; or add `as="fetch" crossorigin` exactly matching the page's `fetch` options.

**T1. Tutorial drift.** See the table below (feature video, map and night videos, original 25 videos).

### Low

**A2. Description fill-in is not announced.** The event detail shows `<p id="dblurb" aria-busy="true" class="skel">` and later swaps it for a new `<p>`; nothing is in a live region, so a screen-reader user is not told the description arrived (only the failure case uses `role=status`). Fix: put an empty `role="status"` wrapper around the slot and write the text into it, or announce "Details loaded" through the existing `#live` polite region (app.js line 744 already uses it).

**A3. Small targets in the event detail.** Measured on a phone: "More in Pasadena" 112x17, "Something wrong? Tell us" 160x17, photo credit 180x23, Apple Maps / Google Maps buttons 106x36 and 115x36. axe (WCAG 2.5.8 AA) flags the 19 px outbound link on `/e/<id>` (live, both themes) and the sponsor pause button (`.sp-pause`, partly obscured, 13 px of free space). `/pricing`, `/feature`, `/sponsor` FAQ `<summary>` rows are 25 px tall. Installer, `/past` and city pages have 32 px list links and 19 px text links. Fix: `min-height:44px` plus vertical padding on those link classes and on `summary`.

**A4. Theme ignores the OS setting.** `index.html` line 27 chooses dark automatically between 6 pm and 6 am local time and ignores `prefers-color-scheme`; emulating `prefers-color-scheme: dark` does nothing on any page. Users who set dark at the OS level see a light site by day. Fix: default to `matchMedia("(prefers-color-scheme: dark)")` when no manual choice is stored; keep the clock rule as the fallback if you want it.

**A5. Sponsor banner scrolls under reduced motion.** PR 364 deliberately keeps the marquee moving when the device asks for reduced motion (banner.js line 9 computes `reduced`). It has a pause button, which satisfies WCAG 2.2.2, but the pause button is the 13 px target in A3 and the strip's links are keyboard tab stops that move away while focused. Fix: honour reduced motion by starting paused (the pause button stays), keep strip links out of the tab order while the track moves.

**A6. Validation moves no focus.** On the add flows, pressing Next with an empty required field sets `aria-invalid` and `aria-describedby` on the field and shows a `role=alert` message (verified: "Enter the event's name.", "Tell us who is running it."), but focus stays on the Next button. Screen-reader users hear the alert; sighted keyboard users have to tab back. Fix: `field.focus()` on the first invalid field.

**A7. `image-redundant-alt` (minor) on installer pages.** `<a href="/#h-...">` with an `<img alt="Garcia Family Lights · Irvine">` next to the same text. Fix: `alt=""`.

**A8. Alerts form honeypot and widget.** `#alWeb` and the Turnstile response input have no label (checked in the DOM; axe did not flag them, presumably hidden). Info only if the honeypot is `aria-hidden` and `tabindex=-1`; confirm.

**C1. Wording: "house" and "display" remain** (the owner chose "home"). Rendered text on live pages and source strings:
- Add hub (`add.html`): "A lighting display". Add home flow (`add-house.html`): "Sign in to add your lights display", "Your display is saved to your account", "Tell us about the display", "Display name", "Give the display a name.", "Which season is this display for?", "About this house" (installer flow: "About this installation"), "Photos help families find the right house", "Your display is live now", claim line "Add your display at this address".
- Pricing: "Entering a display and entering a contest are free", button "Add your display". 404 page: "Add a display or event".
- Profile: tab "Displays", "Lighting displays you posted", "+ Add a display", "Edit display", draft label "Lighting display".
- Contest enter: "One line about your display". Contest page: "About your display".
- Help Center (live): "Add an event, or show off your own house" (group blurb in `functions/_lib/help.js`), "Find professionally installed displays", `show-off-your-house` ("Tap Add, then A lighting display"), `is-my-address-public` ("show a display", "show off a house"), `enter-your-home-in-a-contest` ("A line about your display").
- Tutorials page: "Find professionally installed displays" (video title), "Show off your house", "Install the app and use it offline" is fine.
- Privacy: "Showcase a house", "Home displays:", "event or house to be edited"; Terms: "Visit displays from the street", "visiting a display". Map filter and type labels: "Home displays" (app.js lines 189, 407, 650, 936, 1017, 1041, 1109), "{season} display · Free to view". Seasons: every season's `title: "Showcase a House"` and pitches "Put your house on the map" (`seasons.js`). Emails (`mailtpl.js`): "Houses and events", "About your display", "Display approved". Funnel label "House or installer display submitted" (admin only).
- Fine as is: "haunted house" (an event type), "installed display" on installer copy where a professional job is meant.
Fix: global replace to "home" in user-facing strings only (keep slugs and the `house` kind key); one sweep in `add-house.html`, `profile.html`, `seasons.js`, `app.js`, `pricing.html`, `404.html`, `help.js`, `mailtpl.js`, `privacy.html`, `terms.html` plus a Help Center migration (only rows with `updated_by='seed'`).

**V1. Old pages vs the cream restyle.** Mostly consistent: Pricing, Feature, Sponsor, Add flows, Privacy, Terms, Profile, Tutorials, Contests share the cream background, red accent and heavy headings in light and dark. Remaining differences: (a) the public contest page and the organizer dashboard use light-weight headings ("Maple Street Holiday Lights 2026", "Visit the homes", "Controls") while Pricing and Profile use bold; (b) `404.html` and `offline.html` use Inter, not Plus Jakarta Sans, and have no site header (`ux-shots/live-404-phone-light.jpg`); (c) the organizer and judge pages use the short "Contest" or title header with an avatar button, other pages the logo plus "SoCal Lights" wordmark (profile shows "Your profile" instead). Fix: apply the heading weight token in `contest.css`, load the same font in 404/offline, standardise the header.

**O1. Offline map.** After a warm visit the map and 60 cards open offline from the cache and visited pages open (pricing, privacy, terms, contests, tutorials); unvisited pages get the new offline page (verified: help, add and /in/los-angeles show "You're offline" with a list of pages that still work). Gaps: no "You're offline, showing saved places" notice on the map itself, the header logo shows a broken-image icon offline (`ux-shots/local-offline-map.jpg`), and the offline page is the only one without Plus Jakarta Sans. Fix: add an inline status when `/api/events` came from the cache, precache `/img/badge-160.webp`.

**P3. Static pages' first paint.** Lighthouse mobile on `/pricing`, `/feature`, `/add`, `/contests`, `/help`, `/in/los-angeles`: perf 98 to 99, LCP 1.6 to 2.0 s, TBT 30 to 60 ms, CLS 0, about 130 to 390 KiB. Render-blocking: the Google Fonts stylesheet (740 to 930 ms estimated), 20 KiB legacy JS and 8 KiB cache insight (Cloudflare beacon). Fix: self-host the one font file in `woff2` with `font-display:swap` and a `preload`.

**P4. City pages ship large photos.** `/in/los-angeles`: 385 KiB, image-delivery insight 187 KiB. Fix: confirm width=240 transform applies to every card.

**P5. Heavy media.** `/tutorials/find-map.mp4` is 13.2 MB with `max-age=14400`; `public/tutorials` is 442 MB in the repo. Help articles still log aborted video/poster requests (`find-map.jpg`, `find-map-mobile.mp4` `ERR_ABORTED`) although the videos are `preload="none"`. `img/share.png` is 405 KB. Fix: move video to R2/Stream with long cache, compress `share.png` to a JPEG under 100 KB.

**H1. `/past` returns 500 locally with a contest whose `results` JSON has no expected field** (`functions/past/index.js` line 15: "Cannot read properties of undefined (reading 'length')"). It happened on my hand-made seed row, live `/past` is 200, so this is hardening only. Fix: default missing arrays to `[]`.

**D1. Tutorials page.** Thumbnails now show real titles; play buttons sit over the thumbnail art (cosmetic); 13 targets under 44 px on a phone (`button.ver` 36 px, brand 36 px).

### Info

- No Content-Security-Policy (decision pending, `docs/audit-2026-11-06.md`).
- `/sw.js` is served with `max-age=14400` (the `_headers` `no-cache` is overridden by Pages, known).
- JS/CSS/images have `max-age=14400, must-revalidate`; `/api/photo/*` has one year `immutable`; HTML `max-age=0, must-revalidate`. Good.
- `/add`, `/add-contest`, `/contests` score SEO 66 only because they are intentionally `noindex`.
- Lighthouse "deprecations" entry is Cloudflare's `challenge-platform/scripts/jsd/main.js` (StorageType.persistent), third party.
- "Expected value to be of type number, but found null instead" warning from MapLibre on every live map load (a style expression receiving a null property); harmless but noisy.

## axe results

Sweep: 24 live pages and 34 local pages (incl. signed-in Profile, Organizer, Judge, Contest enter, Add home, Feature, Sponsor, Installer manage, voter view) x phone 390x844, tablet 768x1024, desktop 1280x800, sideways phone 844x390 x light (and dark, redone with the site's own theme switch because `prefers-color-scheme` emulation does nothing, see A4). Results: **0 critical, 0 serious** except (1) `target-size` serious on `/e/<id>` (19 px link, live and local, both themes) and on the sponsor pause button (map), (2) minor `image-redundant-alt` on installer pages (live and local). The `/past` local page produced serious findings only on the Wrangler error overlay (my seed row, see H1). Lighthouse accessibility score is 100 on all seven pages tested. `landmark-one-main` and `region` are clean on the Add flows now (fixed since the 2026-11-04 audit); the map has `header`, `aside#panel`, two `nav`s and labelled regions but no `<main>` (landmark is the `aside` plus map `region`; Lighthouse does not flag it). Headings on the map: one hidden h1, hidden h2 "Places in view", cards h3 (order fixed).

Verified fixed since 2026-11-04: search is a real combobox (`role=combobox`, `aria-controls=sugg`, `role=listbox/option`), F9 empty-search copy ("No places match “zzzzqq”." with Clear search), skip links, `<header>` before the canvas (Tab reaches Search first, then season, theme, account, menu, then the map controls), 404 for unknown paths and `/c/<unknown>`, contrast fixes, `aria-invalid` on step errors.

## Flow walk-through summary

| Flow | Where | Result |
|---|---|---|
| Map: search, suggestions, empty state, filters, favorites (heart is `aria-pressed`, 44 px, badge on My night), My night plan, event detail, share and calendar buttons | live and local | Works. Issues A1, M2, U1, U2, A2, A3. Calendar and share menus were opened but I did not finish an .ics download or a share, so those paths are not verified. |
| Alerts (weekly email) dialog | local, validation only; live opened, not submitted | Focus moves in and Escape closes it; empty submit shows "Enter a valid email address." in a message element (not tied to the field). |
| Installer banner strip | live and local | Renders at the top of the list sheet on phone and sideways; sponsor pause works as a button. Overlap U2, tiny pause target A3, scrolls under reduced motion A5. I did not see top-of-the-list sponsor cards (no installer with the $75 plan exists locally or was visible live). |
| Add event, add home, add contest wizards | local, signed in | One question per screen, large buttons (44 to 51 px), required-field errors announced. A6. "No... Next" on the first add-event step reads oddly; consider "No web page, skip". |
| Contest pages: public page, vote (voter), judge ballot, entry, organizer dashboard incl. Add homes yourself, unpublish | local | All render, zero axe violations in light and dark. Add homes yourself is collapsed when entries exist and closes after voting starts with a clear message (and the server counts existing votes too). The address lookup returns "Not found" locally because the lookup services are unreachable; not a product fault. Unpublish asks for a second tap. |
| Profile, installer dashboard, Feature and Sponsor funnels (signed in) | local | Render clean at all sizes; no overflow; funnel step chips ("1. Plan, 2. Event, 3. Pay") read well in dark and light. Checkout was not run. |
| Pricing, Help center, Tutorials, installer page, privacy, terms, 404, offline | live | Clean, consistent; see V1, C1, P5, D1. |

## Responsive, zoom, motion, targets

- No horizontal overflow at 390, 768, 1280 and 844x390 on any page, light or dark. At 200% zoom (640 CSS px) and 320 CSS px nothing overflows on `/`, Pricing, Add, Feature, Help, Privacy, Tutorials, a city page, Contests, Sponsor. At 195 px (an extreme 400% phone case, beyond WCAG reflow) Pricing, Add, Help, Privacy, Tutorials and city pages overflow by 10 to 106 px; ignore unless you want it.
- Sideways phone: the sheet moves to the right half, the location card and attribution overlap the zoom controls a little (`ux-shots/live-map-land-light.jpg`); no clipped buttons.
- Reduced motion: transitions are disabled in CSS on the map and flows; the sponsor marquee is the exception (A5).
- Touch targets: footer links are 44 px now; remaining under 44 px: map cards' small links, detail links (A3), tutorials toggles, FAQ summaries, installer and past list links.

## Console, network, security headers

Live map: WebGL "GPU stall" warnings (headless software GL only), mixed content (M1), preload mismatch (P2), MapLibre null-number warning, `cdn-cgi/image/width=16` thumbnail probes aborted on every load (`ERR_ABORTED`, harmless). No uncaught JS errors on any page. No failed first-party requests on live other than the deliberate 404 pages. Local-only noise: `/api/photo/...` 404 (seed photos not uploaded), `cdn-cgi/image` 404 (Cloudflare feature absent in wrangler).

## Tutorials versus UI

Baseline from `docs/tutorial-updates.md`: 25 videos recorded 2026-11-05 (merged 15:26 to 17:14 PT), seven re-recorded or added 2026-11-06 (`approve`, `profile`, `voting`, `add-homes`, `unpublish`, `claim`, `feature`; PR 361 at 00:36 and PR 368 at 01:05 on 11-06). Everything below changed after those recordings. The video files are not in git history, so recording times are taken from the documented merge times; verify in the recorder logs.

| Video | Verdict | Why |
|---|---|---|
| `feature` (Feature your event or home) | **Re-record** | Recorded before PR 370/371/373 (Pricing redesign: simpler cards, event organizer options, installer tiers, white cards) and PR 374 (the feature funnel rebuilt: Which event? step, Confirm and pay with exact dates and total, success view, "1. Plan, 2. Event, 3. Pay" chips). The tutorials doc itself says to re-record if prices or plans change; Full run replaced Whole season. |
| `map`, `night`, `pro-filter`, `app` | **Re-record or at least re-check** | The installer banner strip with "Installers: advertise here" pills sits at the top of the list sheet on every map screen since PRs 363 to 366 (not in any of these videos); event detail now loads the description on demand (PR 369, a grey placeholder then text); Share on an event now sends `/e/<id>` (PR 342, already listed). |
| `enter`, `edit-entry`, `vote`, `judge`, `quick`, `custom`, `share`, `edit`, `team`, `announce`, `activity`, `sponsors`, `installer`, `installer-profile`, `add-event`, `showcase`, `contests`, `email` | **Optional, but visibly old** | Recorded before the cream restyle (PR 353/356, 11-06 00:16 and 00:24): the add flows, contest pages and dashboards, Contests and Tutorials pages in those videos are on the older white, light-weight style; the newer videos show the cream style. Narration still true. |
| `claim` | Check | Recorded 11-06; the claim path is unchanged, but "A lighting display" wording and any "display" narration should become "home" with the C1 sweep. |
| `approve`, `profile`, `voting`, `add-homes`, `unpublish` | OK | Re-recorded after the restyle and still match; profile unchanged since. |
| New videos worth adding | Optional | "Sponsor placement for installers" (`/pricing#banner` to `/sponsor`, PR 375), "Event Featured funnel" is covered by re-recording `feature`; help articles for the sponsor flow exist (migrations 0174/0175). |

Pages that mirror the videos (`public/tutorials.json`) are fine; the help article text should follow C1 wording.

## Not covered (needs a person or device)

Real iPhone Safari and Android Chrome, VoiceOver and TalkBack, real GPU frame rates, Lighthouse repeats (one run per page, simulated throttling), tablet (768x1024) was swept by axe and overflow checks but I only looked at screenshots of phone and sideways phone, calendar `.ics` and share completion, alerts submission, any paid or sign-in flow on live, top-of-the-list sponsor cards (none exist in the data), emails, the admin.

## Method notes

My first dark-mode pass used `prefers-color-scheme` emulation and produced light pages; it was discarded and redone by setting `localStorage socal-theme=dark` (`socal-theme-until` in the future), which is the only way the site switches. The local Wrangler server died twice during sweeps (unrelated to the app); affected runs were repeated.
