# App Store policy decisions and the image resizer (audit 2026-11-16)

Written for the owner. Each item says what the code does today, the options, and a recommendation. Nothing here was decided for you except what is marked "done".

## 1. User-generated content (Apple guideline 1.2): done in code, rest is yours

Apple asks for: a way to filter objectionable content, a way to report it with a timely response, a way to block abusive users, and published contact details.

**Done (PR 3)**
- **Report:** the existing "Something wrong?" link on every event and home card is now "Report or hide this listing". The dialog asks what is wrong (Offensive, unsafe or inappropriate / Not a real event or home / Wrong information / Something else), details and an optional email are optional, and it posts to the existing `POST /api/report` (table `reports`, shown in Admin > Reports and counted in the digest). Same abuse controls as before: 5 reports an hour per connection, and the same words about the same item are stored once a day. An "Objectionable content" report is stored with that label first. No new table, no migration.
- **Hide for me:** a button in the same dialog hides that event or home on this device (kept in the browser, `socal-hidden`); the ⋯ menu shows "Show hidden items" while any are hidden. This is the closest match to "block" because posters are not public people: listings carry no profile to block.
- **Filtering:** events and homes are reviewed by a person before they appear (existing flow), so there is a pre-publication filter.
- **Contact:** info@socallights.app is in the listing, the Terms and the menu.

**Still yours**
1. **Respond within 24 hours.** The dialog promises "within 24 hours". Admin > Reports is where they land; the three-a-day digest email already counts them. Check it daily during the season, or change the sentence in `public/app.js` (search for "within 24 hours") to a promise you can keep.
2. **Terms acceptance.** Apple likes users agreeing to terms that forbid objectionable content when they sign in or post. I did not edit the legal text. Suggested sentence for `public/terms.html` and under the sign-in sheet: "You may not post content that is unlawful, hateful, sexually explicit, or that shows other people without their permission. We remove it and may close the account." Say yes and I will add it with the sign-in line.
3. **Not covered:** contest entry photos and installer pages have no Report button yet (the map's events and homes do). Recommended next step if the reviewer asks.
4. **App Store Connect:** answer "Does your app have user-generated content?" yes, and say in the review notes: "Listings are reviewed by a person before they appear. Every listing has Report and Hide. Reports go to info@socallights.app within 24 hours."

## 2. Age rating (Apple questionnaire) vs the content

`docs/app-store.md` says 4+. The app has photos from the public, links to arbitrary websites, and sign-in already requires 13+ (privacy policy).

| Option | What it means | Risk |
|---|---|---|
| **A. Answer honestly (recommended)** | Tick user-generated content and unrestricted web access. Expect the new rating tiers to land at **13+** (check the number the form computes; do not pick it by hand). | None. Matches the privacy policy and Report/Hide. |
| B. Keep 4+ | Only possible if both answers are "no". | Apple can reject (2.3.6 inaccurate metadata) or change it later; reviewers see user photos and links. |
| C. 16+ or 18+ | Safer than needed. | Smaller audience for a family lights app. |

Recommendation: A. Also change the line in `docs/app-store.md` ("Age rating: 4+") after you see the computed rating.

## 3. Prize contests (Apple 5.3)

Today any signed-in person can create a contest with a prize (`/add-contest`). Guideline 5.3.1 says sweepstakes and contests must be sponsored by the developer of the app, 5.3.2 wants official rules in the app that say Apple is not a sponsor, and contest passes are bought on the website (the app shows "Continue on socallights.app", which is also the kind of steering 3.1.1 dislikes). The server already refuses checkout from the app.

| Option | What changes in the app | Risk |
|---|---|---|
| **A. Hide creating a contest in the app (recommended)** | "Create a contest" and the pass step disappear in the app. Browsing, voting and entering stay. Organizers use the website. | Low. Voting on someone else's contest is still a contest in the app, so add the official-rules link and "Apple is not a sponsor" to the contest page in the app (small follow-up). |
| B. Hide contests entirely in the app | No Contests menu, no `/contests`. | Lowest risk, but loses a headline feature. |
| C. Keep everything, explain in the review notes | Nothing | Likely rejection under 5.3.1 because third-party organizers, not you, sponsor the prizes. |

Recommendation: A now, B if the reviewer still objects. This is not implemented because it changes what the app offers; it is a few lines (hide the Add > Contest row and redirect `/add-contest` inside the app, like the price pages) once you choose.

## 4. Image resizer left open (finding H4)

`https://socallights.app/cdn-cgi/image/width=40/https://any.site/x.jpg` resized any image on the internet through our zone and every width or quality counts as one of the free plan's 5,000 transformations a month.

**Done in code (PR 3):** the site no longer asks for it for anyone's photo but its own. `public/imgurl.js` is the only place that builds `/cdn-cgi/image` addresses and returns nothing for a host that is not socallights.app (or the page's own origin); the map list, event pages, city pages, contest pages and share pictures use it. Photos hosted on other websites now load straight from their own sites (https, original size). A share picture is made only from our own photos; for an event with only a third-party photo the share card is the site card (`/img/share.png`). Tests: `tests/report-hide.test.mjs`.

**Trade-off:** most event photos are hosted on organizers' sites, so on cellular they load at original size where they used to be resized. If that hurts, the fix is to copy those photos into our own R2 bucket once (check each site's permission first) and serve them from `/api/photo`.

**Cloudflare dashboard (you must do this; code cannot):**
1. Merge PR 3 and wait for the deploy. (Phones keep the old `app.js` for up to 4 hours; an old copy asking for a third-party resize gets an error and falls back to the original photo by itself, so there is no gap.)
2. Cloudflare dashboard > the `socallights.app` zone > **Images** > **Transformations** > turn **off "Resize from any origin"** (if the zone shows "Specified origins" instead, list only `socallights.app` and `www.socallights.app`).
3. Optional second lock, **Security > WAF > Custom rules > Create rule**, action Block, expression:
   `http.request.uri.path matches "^/cdn-cgi/image/[^/]+/https?://" and not http.request.uri.path matches "^/cdn-cgi/image/[^/]+/https?://(www\.)?socallights\.app/"`
4. Check usage monthly: Images > Transformations shows unique transformations against the 5,000 free limit; note it in `docs/runbooks/cloudflare-limits.md`.
5. Test: `curl -I "https://socallights.app/cdn-cgi/image/width=40/https://www.gstatic.com/webp/gallery/1.jpg"` must no longer return 200 with `cf-resized`; `curl -I "https://socallights.app/cdn-cgi/image/width=40/https://socallights.app/img/badge-160.webp"` must still return 200 image/webp.
