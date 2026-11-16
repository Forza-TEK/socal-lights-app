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

## 4. Image resizer left open (finding H4): owner decided to keep it open

**Decision (owner, 2026-11-16):** keep using the Cloudflare image resizer (`/cdn-cgi/image/...`) for photos hosted on other websites, exactly as before the audit. In the Cloudflare dashboard, **Images > Transformations > "Resize from any origin" stays ON**. The code restriction from PR #691 (`public/imgurl.js`, which returned nothing for any host but socallights.app) was undone: `public/imgurl.js` is deleted; the map list, event pages, city pages, contest pages and share pictures resize third-party photos again, and a failed resized copy falls back to the original photo. `probeRemoteThumbs` and `THUMBS_REMOTE` are back in `public/app.js`. The rest of PR #691 (Report or hide dialog, Hide for me, Terms) is unchanged. Tests: `tests/report-hide.test.mjs`.

**What stays true (the risk the audit named):** `https://socallights.app/cdn-cgi/image/width=40/https://any.site/x.jpg` resizes any image on the internet through our zone, and every distinct source, width or quality counts as one of the free plan's **5,000 transformations a month**. Over the limit, resized images return an error (the site falls back to the original photo, so nothing breaks, but outsiders could use up the allowance).

**Watch usage:** Cloudflare dashboard > `socallights.app` zone > **Images > Transformations** (unique transformations against the 5,000 free limit). Check it monthly in season and note it in `docs/runbooks/cloudflare-limits.md`. If it gets close, the options are: the optional WAF block rule (Security > WAF > Custom rules, action Block, expression `http.request.uri.path matches "^/cdn-cgi/image/[^/]+/https?://" and not http.request.uri.path matches "^/cdn-cgi/image/[^/]+/https?://(www\\.)?socallights\\.app/"`, which would also stop our own third-party thumbnails), "Specified origins" in the same Transformations setting, or copying event photos into our own R2 bucket (check each site's permission first) and serving them from `/api/photo`.
