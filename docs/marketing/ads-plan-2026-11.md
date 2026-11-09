# Paid ads plan, first $300 (Nov 9 to Dec 24, 2026), five audiences

_Drafted 2026-11-08; **revision 2 (same day) adds a fifth audience, families who want to drive around and look at lights ("visitors")**. Draft for the owner; nothing is bought, created or published. Ad copy is in `docs/marketing/ads-content.json` (42 items, all `status: "draft"`: 26 for homeowners, event holders, contest organizers and installers, 16 for families). Email and DMs already run, so this plan is ads only. Revision 1's budget table is replaced by section 5; the rest of revision 1 stands unless a section says otherwise._

**What changed in revision 2:** families are the demand side that makes the site worth adding a home, event or contest to, and they peak Nov 24 to Dec 24. The $300 is now split across five audiences (section 5), the families channel research is section 3b, the family conversions and tracking are in sections 9 and 10, and the family ad items are `fa-*` in the JSON. **One owner decision is new and important: families peak after Dec 8, the old "month 1" end date (section 5, decision 1).**

**How to read the evidence.** Research was done with web search on 2026-11-08. Official platform pages (facebook.com, ads.tiktok.com, business.nextdoor.com, sites.google.com) could not be opened from this session (hosts blocked), so almost every price, minimum and limit below comes from search snippets of third-party marketing blogs. Those are marked **UNVERIFIED**. Where a number is from a vendor's own page (as shown in a snippet) it is marked **vendor snippet**. No CPC or price below is invented; every range names its source. Re-check anything marked UNVERIFIED in the platform's own console before you commit money.

## 1. Recommendation in short

1. **Spend most of the $300 on Meta (Facebook and Instagram), a small amount on Google Search, a test on Nextdoor, and hold $20 in reserve (revision 2; it was $30).** Families get the largest share ($100) because they are the audience every other audience wants. TikTok, YouTube, Reddit, Pinterest, radio and print are not worth funding at this size (section 3).
2. **Treat this as a $300 experiment to learn which message and which audience adds homes, events and contests at a tolerable cost, not as a revenue play.** Today's baseline is roughly 20-50 human visits a day, 6 homes, 1 installer and no paid orders (`docs/monetization/product-marketing.md`). Ads send people to sign-in forms; expect few conversions and treat any paid purchase as a bonus.
3. **Run in waves so the cap is enforced by end dates, not by hope.** Contest organizers, event holders and installers first (Nov 12-23: events close early and organizers need lead time); homeowners from Nov 24 (lights go up around Thanksgiving, Nov 26; the Christmas season ends Jan 6).
4. **No tracking pixel.** The site uses no cookies or ad pixels (privacy-first, counters only). Do not add Meta or Google tags for this test; measure with the site's own `?ref=` and funnel counters (section 7) plus platform click counts.

## 2. Constraints from the repo

- Prices come only from `functions/_lib/featured.js` (`PLANS`, `EVENT_PLANS`, `INSTALLER_PLANS`) and `functions/_lib/passes.js` (`CONTEST_PASSES`), served live by `/api/config` and shown on `/pricing`. **No ad copy contains a price.** Where a price would help, the copy points to the Pricing page. No screenshot of the Pricing page is allowed in creative (it would go stale).
- Free and always free: map, search, routes, favorites, voting, entering a contest. First contest per organization in every 12-month window is free (`FREE_CONTESTS = 1`, `WINDOW_MONTHS = 12`). Paid placements are labelled and never change a contest result.
- Product wording: "home", never "house" or "display". The word "voting" is kept out of Meta and Nextdoor copy on purpose (section 4).
- Per `docs/monetization/product-marketing.md` (rev 2, Nov 4): pitch paid offers only once the Stripe path has been proven with a real charge; installer paid offers are gated (25+ homes, 3+ installers). Ads therefore lead with free actions. Concepts that mention paid options (ev-c, in-c) are last in line.
- Quote only numbers we can pull live. The last verified figures (2026-11-04, `outreach-targets.md`) were 1,244 upcoming listings, 579 confirmed, 266 city pages, but ad copy uses none of them. If a number is wanted, write `[LIVE NUMBER: events count]` and fill it from the database the day the ad is built.

## 3. Channel research (all sources accessed 2026-11-08)

| Channel | What we found | Verdict for $300 | Source |
|---|---|---|---|
| **Meta (Facebook, Instagram)** | Official floor reported as $1/day for impression/click objectives and $5/day for conversion objectives (secondary reports of Meta documentation, UNVERIFIED). CPC range cited by blogs: about $0.50-$3.50, average about $1.72; Instagram $0.40-$2.00 CPC and $5-$15 CPM. No local-awareness CPC found. Meta suggests a daily budget of at least 5x the target cost per result for cost-controlled bidding. Blogs say $20-$50/day per campaign is needed for the algorithm to "learn"; we cannot afford that, so we use traffic objective and lifetime budgets. | **Fund. Main channel.** Best geo control and the only one reaching homeowners, organizers and installers in one account. | [cropink](https://cropink.com/minimum-budget-for-facebook-ads), [stackmatix](https://www.stackmatix.com/blog/how-much-to-run-ads-on-facebook), [trackbee](https://www.trackbee.io/blog/facebook-ads-cost), [get-ryze local](https://www.get-ryze.ai/blog/meta-ads-cost-local-business-what-spend-2026) (all UNVERIFIED) |
| **Google Search** | LocaliQ/WordStream 2026 (13,000+ campaigns, Apr 2025-Mar 2026): average CPC **$5.42**, cost per lead $66.69; Arts and Entertainment **$1.63**; Restaurants **$2.05**; Home and Home Improvement **$8.33**. No official daily minimum found. Responsive search ad limits confirmed from Google's help page: headline 30, description 90, up to 15 headlines and 4 descriptions. ZIP and county targeting exist in the US (Google help, target types); some ZIPs may be unavailable for privacy reasons (UNVERIFIED). | **Fund small, intent-only.** Only people typing "list my christmas event" or "lights contest" see it. Expect only a handful of clicks at these CPCs: $75 at $1.63-$5.42 is roughly 14-46 clicks (arithmetic on the cited range, UNVERIFIED). | [Google RSA help](https://support.google.com/google-ads/answer/7684791), [Google location types](https://support.google.com/google-ads/answer/1722075), [WordStream/LocaliQ benchmarks via clickminded](https://www.clickminded.com/google-ads-benchmarks/), [adwave](https://adwave.com/resources/google-ads-cost-benchmarks) |
| **Google Ad Grants** | $10,000/month of Search ads, but US eligibility requires IRS 501(c)(3) status (or group exemption), a quality website, and a monthly account-level 5% CTR floor. I found no statement either way for for-profits; the 501(c)(3) rule implies a for-profit like Forza-TEK is **not eligible** (UNVERIFIED: Google's eligibility page was not readable). | **Not available to us** unless Forza-TEK is a 501(c)(3), which nothing in the repo says. Idea only: a **nonprofit partner** (school PTA, a chamber foundation) that runs a contest on our site may qualify for its own grant. Do not promise this. | [Elevation Web](https://www.elevationweb.org/ad-grant-basics/), [Daxko guide](https://www.daxko.com/insights/the-ultimate-guide-to-getting-a-monthly-10k-google-ad-grant), [Harbor Compliance](https://www.harborcompliance.com/google-for-nonprofits-vs-ad-grant) (UNVERIFIED) |
| **Nextdoor** | Self-serve Ads Manager says a daily goal is a cap ("you won't be charged beyond it"). Launch pieces say "no minimum" or "a few pounds" (UK, Dec 2025). Third-party: $1/day minimum; CPC $2.50-$5.00; CPM about $20; typical small business $100-$500/month. An older post says $50/day minimum (judged stale). Creative specs pages disagree (headline 70 vs 120; body shown to about 90 characters). Targeting is by neighborhood; ZIP targeting in Ads Manager unconfirmed. Ads policy bans political and controversial social-issue ads. | **Fund a $30 test, homeowners only.** Neighbors posting lights is the natural fit and a short test is cheap. | [Nextdoor self-serve launch](https://about.nextdoor.com/gb/news/nextdoor-announces-new-self-serve-ads-platform-for-small-businesses), [Nextdoor Ads Manager](https://business.nextdoor.com/en-us/advertise-with-nam-2026), [Nextdoor ad policy](https://business.nextdoor.com/en-us/enterprise/ad-policy), [creative specs](https://business.nextdoor.com/en-us/small-business/resources/ads-creative-specs), [The Stacc](https://thestacc.com/blog/nextdoor-for-business/) |
| **Reddit** | Self-serve floor reported as $5/day (consistent across blogs); Max Campaigns (Jan 2026) reportedly $20/day, $620 lifetime (single source). DMA geo targeting reported, not confirmed. Reddit says at least 3x CPA daily per ad group. | **Skip paid.** Local subreddits do better with a genuine post than an ad, and moderators dislike promotion. Free alternative stays in the organic plan. | [Stackmatix Reddit minimum](https://www.stackmatix.com/blog/reddit-ads-minimum-spend), [Enrich Labs](https://www.enrichlabs.ai/blog/reddit-ads-complete-guide-2026) (UNVERIFIED) |
| **TikTok** | TikTok's own help article (via search snippet): campaign budget must exceed **$50/day** and each ad group **$20/day** (lifetime: days x minimum). | **Skip.** One campaign at the minimum would use the whole $300 in about 6 days. | [TikTok budgets help](https://ads.tiktok.com/help/article/budget?lang=en) (snippet; exact wording "exceed" unverified) |
| **Pinterest** | Metro, postal code and DMA targeting confirmed on Pinterest's help page. No official minimum found; blogs say start near $10/day, $20-$50 to test; CPC $0.50-$1.50 (WebFX 2026), CPM $2-$5 up to $11-$18 for conversion objectives. | **Candidate for month 2.** Good fit for visual homes, but not funded now to protect the Meta test. | [Pinterest location targeting](https://help.pinterest.com/en/business/article/location-language-device-and-gender-targeting), [WebFX](https://www.webfx.com/social-media/how-much-does-pinterest-advertising-cost.html), [trackbee](https://trackbee.io/blog/pinterest-ads-cost) |
| **YouTube** | No hard minimum; blogs say practical floor $5-$10/day; cost per view $0.01-$0.30 depending on source (wide spread). No 2026 geo rules found. | **Skip.** We have 31 tutorial videos but no short brand video worth paid reach. Revisit later. | [relevantaudience](https://www.relevantaudience.com/youtube-ads/what-is-cpv-youtube-cost-per-view/), [delante](https://delante.co/how-much-does-youtube-advertising-cost/) (UNVERIFIED) |
| **Patch and local newsletters** | Patch sells display, native, newsletter and "local only" ads but publishes **no rate card**; sales contacts are on its California advertising pages. Vendor blog: a flat $100-$300 per placement is a reasonable range for lists under 5,000 (UNVERIFIED, not local-specific). | **Ask for quotes, spend only from the $30 reserve.** The two newsletter blurbs in the JSON are for this. | [Patch local sponsorships](https://sites.google.com/patch.com/community-publishers-info/local-sponsorships), [Patch: how to advertise](https://patch.com/california/novato/how-to-advertise-your-business-on-patch), [dupple newsletter rates](https://dupple.com/learn/newsletter-advertising-cost-2026) |
| **Community Facebook groups** | No rates found; groups are usually free to post in and many ban promotion. Paid "sponsorship" from admins is negotiated privately. | **Not an ad spend.** Keep it organic (already in `product-marketing.md` play 4). If an admin offers a paid pinned post, ask for a flat quote and use the reserve. | none found: UNVERIFIED |
| **Local radio and print** | Radio blogs: small-market 30-second spot $100-$500; medium $500-$1,500; large market $2,000-$5,000 or more (LA and Orange are large markets). Print rates: nothing found. | **Out of reach** for $300. | [media.co.uk radio guide](https://media.co.uk/blogs/blog/us-radio-advertising-costs-market-pricing-guide), [pipelineon](https://pipelineon.com/blog/hvac-radio-advertising/) (UNVERIFIED) |

## 3b. Families (visitors): channel research (added in revision 2; accessed 2026-11-08)

Goal: people who want to drive around and look at lights, using the free map, search, "Find my location", "This weekend", favorites, "Route these", sharing and the weekly lights email.

| Channel | What we found | Verdict for families | Source |
|---|---|---|---|
| **Meta (Facebook, Instagram)** | Same cost data as section 3 (CPC about $0.50-$3.50, UNVERIFIED). Vendor posts on event advertising say vertical full-screen formats (Stories, Reels) often convert better than feed for events and that letting Meta allocate across placements beats splitting by hand (vendor opinion, not Meta data). No family-audience CPC benchmark found. A Texas community event's ad was rejected under the "social issues, elections or politics" category, so ordinary local events can be misclassified; a secondary source says a March 2026 update widened "misleading claims" enforcement, which can flag superlatives like "the best". | **Fund, largest family line ($55).** Run 9:16 clips first. No "best" or "#1" wording. | [Ticket Fairy](https://www.ticketfairy.com/blog/mastering-facebook-instagram-ads-for-event-promotion-in-2026-advanced-targeting-strategies-for-maximum-roi), [Hive](https://resources.hive.co/articles/meta-ads-in-2026-6-shifts-event-marketers-cant-ignore), [Dallas Express report of rejection](https://dallasexpress.com/?p=331158), [Enrich Labs policy guide](https://www.enrichlabs.ai/blog/meta-ads-policy-guide-2026) (all UNVERIFIED) |
| **Google Search** ("christmas lights near me", "christmas lights [city]") | **No volume or CPC figure found for these phrases.** The closest data: a rankhero estimate of $1.11 CPC for the broad word "christmas" (not a proxy), and the LocaliQ/WordStream benchmark for Arts and Entertainment of $1.63 (section 3). Intent is exactly ours, but the generic term is dominated by listicles, and at $30 total we can afford only a handful of clicks. Use phrase/exact match and city-specific terms. Get real numbers from Google Ads Keyword Planner (free, in the account) before launch. | **Fund small ($30, runs to Dec 24).** Cheapest high-intent source; lowest daily rate. | [rankhero](https://www.rankhero.com/keywords/christmas), [Keywords Everywhere Christmas list](https://keywordseverywhere.com/ctl/top/christmas-keywords) (snippet had no rows), [clickminded benchmarks](https://www.clickminded.com/google-ads-benchmarks/) (UNVERIFIED) |
| **Nextdoor** | Section 3 data. Neighbors discuss "where are the good lights" there, but the ad must stay free of residents' homes. | **Fund $15 test, same dates as Meta wave 2.** | [Nextdoor Ads Manager](https://business.nextdoor.com/en-us/advertise-with-nam-2026) (UNVERIFIED minimums) |
| **Pinterest** | Section 3 data: metro, postal and DMA targeting confirmed; CPC $0.50-$1.50 (WebFX 2026, UNVERIFIED); pins for "christmas lights ideas" are a visual fit. But those searches are mostly decorating ideas, not local viewing, and an account and image set are needed. | **Not funded at this size.** Good month-2 test. | [Pinterest targeting help](https://help.pinterest.com/en/business/article/location-language-device-and-gender-targeting), [WebFX](https://www.webfx.com/social-media/how-much-does-pinterest-advertising-cost.html) |
| **TikTok** | Official minimums: campaign above $50/day, ad group above $20/day (snippet of TikTok help). | **Not viable.** One minimum-budget campaign would use the whole $300 in about 6 days. | [TikTok budgets help](https://ads.tiktok.com/help/article/budget?lang=en) |
| **Parent and mom-blog newsletters** (Mom's LA, San Diego Family, Macaroni Kid editions) | No rate card found for Mom's LA or San Diego Family. Macaroni Kid editions are run by local publishers who set their own rates and keep the revenue: one Gig Harbor, WA edition advertises digital ads "starting at $99"; a Maryland edition lists 9,700+ subscribers; a Beverly Hills page is dated 2016. Nothing verified for our counties. Mom's LA's own Advertise page is paid (`outreach-targets.md`). | **Ask for quotes; pay only from the $20 reserve and only if the quote fits.** A free route stays open: editors accept link suggestions (`outreach.md` Draft A). Blurb is `fa-nl-newsletter`. | [Macaroni Kid Gig Harbor](https://gigharbor.macaronikid.com/guides/65415d5e702bfd508403259c/local-business-advertising-op-digital-ads-starting-at-99), [Macaroni Kid rate sheet example](https://pasadenamd.macaronikid.com/directory/61f84f91bd22cf4deffc0d94/macaroni-kid-pasadena-severna-park-glen-burnie-media-rate-sheet) (UNVERIFIED for our counties) |
| **Patch** | No rate card (section 3). Patch also runs free reader-submission "where are the best holiday lights" posts. | **Free route first** (`product-marketing.md` play 2); paid only by quote from the reserve. | [Patch local sponsorships](https://sites.google.com/patch.com/community-publishers-info/local-sponsorships) |
| **Free listings** (library, parks and city community calendars, local event calendars) | Calendars generally accept free or low-cost, open-to-public events from nonprofits, governments and community groups. I found no Los Angeles or Orange County pages, so the rules for those are unknown. Our site is a map, not an event, so the ask is a link on their holiday-lights page rather than a calendar entry; where they run a lights event themselves, they can list it on our free add-event page. | **Free, not paid.** Part of the organic plan: ask LA Public Library, OC Public Libraries, city parks and rec holiday pages and chambers to link `/in/<city>`. | [example submission rules, Colchester CT](https://www.colchesterct.gov/node/3493), [DeKalb library calendar](https://dkpl.org/?p=24876) (not our region; UNVERIFIED for LA/OC) |

**Policy notes for families:** Find my location uses the browser's own location permission; the ad must not say we know where someone is. No safety or health claims ("safe", "healthy", "good for kids") and no superlatives. The map shows private homes: the creative uses public events only, or demo data (section 8).

## 4. Platform rules that matter for us

| Topic | Rule or finding | What we do |
|---|---|---|
| Holiday events | No holiday-event prohibition found for Meta, Google, Nextdoor. (Could not open the policy pages; UNVERIFIED.) | Normal event and community-service ads. |
| Photos of people's homes and addresses | Nothing platform-specific was readable. California Civil Code 3344 covers commercial use of a person's name, photo or likeness without consent (our understanding, **attorney to confirm**). An address is personal information even without a face. | **Never use a person's name or a real home in an ad without written consent for paid advertising**, separate from the consent to show it on the map. Default creative is our own UI with demo data. Blur addresses and house numbers in any map screenshot. |
| Meta personal-attributes policy | Meta bars ads that assert or imply a user's personal attributes, including wording that points at "you" (Meta transparency page, found by search). | Copy is conditional ("If your home has lights up...") and never "Are you a homeowner?". |
| Meta "social issues, elections or politics" | Contests with public voting could be classified as social-issue or election content, which needs advertiser authorization (UNVERIFIED; Meta's page unreadable). | Meta and Nextdoor copy avoids "vote", "election", "ballot". The word stays in Google and on the site. If an ad is flagged, reword it; do not start the authorization process for $20. |
| Special ad categories (credit, employment, housing) | Restrict targeting to country, region, city level and impose radius minimums (sources conflict: 10-15 miles or km). | Our ads are not in those categories, so county/ZIP/radius targeting should be available. If Meta asks us to pick a category, we have picked wrongly: stop and ask. |
| Nextdoor | Bans political and controversial social-issue ads. | No "vote" wording; contest ads are not run on Nextdoor. |
| Google Ads | Personal-information policy not researched. RSA copy limits confirmed. | Text ads only; no addresses. |
| Contests and prizes | We run no sweepstakes or lottery. | Negative keywords: raffle, sweepstakes, lottery. |
| Affiliate and sponsor labelling | Paid placements on our site are labelled Featured or Sponsor. | Any paid newsletter blurb must be labelled "Sponsored" by the publisher. |

## 5. Budget (hard cap $300 in total; revision 2, five audiences)

**Decision 1 for the owner: the cap window.** Revision 1 ended everything on Dec 8 ("month 1"). Families peak Nov 24 to Dec 24, so a Dec 8 end would stop their ads just before the busiest weeks. This revision keeps **$300 as the cap for the whole first campaign, Nov 12 to Dec 24**, with homeowner, event, contest and installer lines still ending by Dec 8 (about $241 spent by then) and only the three family lines running on (about $59 after Dec 8). Nothing is spent after Dec 24 or beyond $300 without a new approval. **Alternative (if you want the strict Dec 8 end):** shorten the family Meta and Google lines to Nov 24 to Dec 8, which raises their daily caps to about $3.67 and $1.97 and misses Dec 9-24; I do not recommend it. If launch slips, do not extend end dates: move the schedule left and cut the budget with it.

| Audience | Platform | Budget | Flight (end date is hard) | Daily cap (budget / days) | Items in JSON |
|---|---|---:|---|---:|---|
| **Families** | Meta | $55 | Nov 24 to Dec 24 (31 days) | $1.77 | fa-a/b/c/d/e-meta |
| **Families** | Google Search | $30 | Nov 24 to Dec 24 (31 days) | $0.97 | fa-a/b/c/f-google |
| **Families** | Nextdoor | $15 | Dec 9 to Dec 23 (15 days) | $1.00 | fa-a/b/c/d/e-nextdoor |
| Homeowners | Meta | $45 | Nov 24 to Dec 8 (15 days) | $3.00 | ho-a/b/c-meta |
| Homeowners | Nextdoor | $15 | Nov 24 to Dec 8 (15 days) | $1.00 | ho-a/b/c-nextdoor |
| Contest organizers | Google Search | $40 | Nov 12 to Dec 8 (27 days) | $1.48 | ct-a/b/c-google |
| Contest organizers | Meta | $15 | Nov 12 to Nov 23 (12 days) | $1.25 | ct-a/b/c-meta |
| Event holders | Meta | $25 | Nov 12 to Nov 23 (12 days) | $2.08 | ev-a/b/c-meta |
| Event holders | Google Search | $20 | Nov 12 to Dec 1 (20 days) | $1.00 | ev-a/b/c-google |
| Installers | Meta | $20 | Nov 12 to Nov 23 (12 days) | $1.67 | in-a/b/c-meta |
| **Reserve** (not loaded into any account) | any | $20 | released only by a scale trigger (section 9) | n/a | in-*-google, newsletter blurbs |
| **Total** | | **$300** | | | |

By platform: **Meta $160, Google $90, Nextdoor $30, reserve $20.** By audience: **families $100, homeowners $60, contest organizers $55, event holders $45, installers $20, reserve $20.**

**What moved (revision 1 to 2):** families 0 to $100; homeowners $110 to $60; contest organizers $70 to $55; event holders $60 to $45; installers $30 to $20; reserve $30 to $20. Meta $165 to $160, Google $75 to $90, Nextdoor $30 (unchanged).

**The tradeoff, plainly:**
- *Why families get the most:* they are the demand side. A homeowner or organizer gains nothing from us without people looking, and a family needs no sign-in to start (open the map, tap Find my location), so the click-to-conversion path is shorter than any supply-side form. Counters to read already exist for route taps and email sign-ups.
- *What it costs:* supply-side ads are thinner. $20 for installers and $45 for events is roughly 6-40 and 13-90 Meta clicks at the cited $0.50-$3.50 range (arithmetic, UNVERIFIED), so those audiences give us a read, not a result. The supply side also depends on free routes (email, DMs, city outreach), which already run.
- *Why homeowner money is the one cut hardest:* the map already has about 1,244 upcoming listings that are mostly events (`outreach-targets.md`, 2026-11-04), so visitors have plenty to see even with 6 homes, while adding a home needs an emailed-code sign-in and has the lowest expected conversion.
- *Risk:* family ads can drive visits that never turn into anything we can count. That is why the family conversion is defined as route, favorite, email or location actions (section 9), and why the family lines are stopped quickly if there is no engagement.
- *Reserve is $20, not $30:* smaller than before, so scale triggers can only top up one winner a little. If you want a bigger reserve, take it from the Nextdoor lines first (the least proven channel).

**Hard daily caps (what to set in each console):**

| Platform | Daily cap | Mechanism | Caveat |
|---|---|---|---|
| Meta | $5.50 across the account Nov 12-23; $5.00 Nov 24-Dec 8 (homeowners $3.00 + families $1.77); $1.80 Dec 9-24 (families only) | **Lifetime budget with an end date on every ad set** (the ad set total can never exceed its line above), plus the account spending limit set to $160 in Billing | Meta can spend more than the daily budget on a given day when using daily budgets (commonly reported; UNVERIFIED here), which is why lifetime budgets are preferred |
| Google | $2.50 per day Nov 12-23; $3.50 Nov 24-Dec 1; $2.50 Dec 2-8; $1.00 Dec 9-24 | Campaign daily budgets and end dates | Google may spend up to about double a campaign's daily budget on a given day while keeping to the monthly average (as I know Google's documentation; UNVERIFIED this session). **Check spend every day** and pause manually if the running total passes its line |
| Nextdoor | $1.00 per day (only one Nextdoor test runs at a time: homeowners until Dec 8, then families from Dec 9) | Daily goal ("you won't be charged beyond it", Nextdoor page) | Minimums UNVERIFIED |

Safety net: pay with a card or virtual card that has a **$300 limit** (owner's choice, not a platform feature). Estimated clicks are not forecast conversions; no conversion rate exists yet.

## 6. Week-by-week schedule

| Week | Dates | Actions |
|---|---|---|
| 0 | Nov 8-11 | Owner reviews and approves items (statuses in the JSON). Create accounts (Meta Business and Page, Google Ads, Nextdoor Business). Shoot the real screenshots and clips (section 8), including the family map clips. Get written consent for any home photo used. Record the **baseline**: from Admin > Home, the last 7 days of funnel steps and any `ref:` rows. In Google Ads, open Keyword Planner and read real volume and CPC for the family keywords (section 3b). Apply the pre-launch checks (below). |
| 1 | Nov 12-18 | Launch wave 1 (supply side): Meta (contest, event, installer), Google (event, contest). Launch concepts **A and B only** per audience (keeps the number of `ref` codes low). Day 3: first check of clicks, spend, disapprovals, and the Admin counters. |
| 2 | Nov 19-23 | Mid-wave review (rules in section 9). Pause the worse of A or B where it has clear evidence. Nov 23 is the last wave-1 day for Meta. |
| 3 | Nov 24-30 | Launch wave 2: **families on Meta and Google (concepts A, B, C)** and homeowners on Meta and Nextdoor (A and B). Thanksgiving Nov 26 and Black Friday Nov 27: ad competition is usually higher (UNVERIFIED), so do not raise bids; watch spend daily. Google contest and event lines keep running. |
| 4 | Dec 1-8 | Event Google ends Dec 1. Mid-flight review Dec 2-3 (move budget between concepts within an audience, not between audiences). Homeowner Meta and Nextdoor and Google contest end Dec 8. Family concepts D and E can start if A-C have shown engagement. |
| 5 | Dec 9-15 | Families only: Meta, Google, and the Nextdoor family test (Dec 9). Review the family weekend (Dec 11-13) against the counters. |
| 6 | Dec 16-24 | Families only. Last weekend and Christmas Eve (Thursday Dec 24) are the last big traffic days; all family lines end Dec 24. |
| 7 | Dec 25 onward | Write the results table (section 9) in `docs/status.md`. No spend. Decide about a second campaign (the season ends Jan 6, so little is left; better for spring and Halloween 2027). |

**Pre-launch checks (all must pass):**
1. `/add-house`, `/add-event`, `/add-contest`, `/contests`, `/pricing`, `/` and `/in/mission-viejo` return 200 and load on a phone.
2. Open one ad link with `?ref=...` in a fresh tab; confirm the `ref:` row appears in Admin > Home next day.
3. Stripe path has had one real test charge before any ev-c or in-c item goes live.
4. Owner has confirmed the "remove it any time", "QR poster", "Request a quote button" and "Choose your area and distance" claims against the live site.
5. Sign-in works (adding a home or event needs an emailed code).
6. The family map clips were recorded with a demo location and show no private address.

## 7. Geo targeting

Target by county, using the seven counties. Counts below are from `outreach-targets.md` (2026-11-04) and will have changed; re-pull them live before launch.

| County | Upcoming listings / cities (2026-11-04) | Campaign use |
|---|---|---|
| Los Angeles | 374 / 109 | Included in every campaign |
| Orange | 297 / 37 | Included in every campaign |
| San Diego | 169 / 39 | Included in all but installers wave if budget thin |
| Riverside | 152 / 29 | Included |
| San Bernardino | 121 / 31 | Included |
| Ventura | 67 / 10 | Fund only if a campaign has no inventory in the larger counties |
| Santa Barbara | 64 / 11 | Same |

How: Google Ads supports county and ZIP targets in the US (Google help, target types); Pinterest supports metro/DMA/ZIP (not used). Meta: ZIP and radius targeting normally exist, and county targeting may (UNVERIFIED; if not offered, target the largest cities in each county or a 25-mile radius around the city center). Nextdoor: neighborhood targeting (ZIP unconfirmed). **Use "people living in or recently in this location" on Meta and "presence" on Google**, not "interested in".

**Two ad sets per Meta campaign so we can tell regions apart:** (1) Los Angeles and Orange; (2) Riverside, San Bernardino, San Diego. That is the only geo split; there is not enough budget for more.

**Families:** all seven counties on Meta and Google, because visitors travel; on Meta use one ad set for the whole area (a $1.77 daily cap cannot support two). On Google, bid on city-specific phrases only for cities that have a live page with upcoming events (`/in/<city>`; today the two written as items are Mission Viejo and Covina) and on the generic phrases county-wide with 'presence' targeting. Nextdoor families: neighborhoods in Orange and Los Angeles counties first. Family ads must target where people live or are, not 'interested in Christmas'.

**Optional ZIP seeds** for contest and homeowner ads, from cities already on our contest list (`docs/contest-leads.md`). I know these as real ZIPs but did not verify them live; check in the console: Mission Viejo 92691/92692, Glendora 91740/91741, Covina 91722-91724, Chino Hills 91709, Signal Hill 90755, Beaumont 92223, Orange 92866-92869. Only use ZIPs where a city has a live or planned contest.

## 8. Visuals (real only)

Everything is our own screenshots or recordings, our own demo data, or an owner-approved home photo. No stock images, no other site's images, no person's name or home without written consent. Needed assets:
1. Add-a-home flow recording (phone, 4:5 and 9:16), from the existing tutorial video.
2. Map at county zoom, addresses hidden.
3. "Route these" recording on public events.
4. City page screenshot (`/in/<city>`) with public events.
5. Map with a gold Featured pin on a consenting organizer's event or our own test event.
6. Demo contest screenshots and a QR poster labelled "Example".
7. Installer profile screenshot with consent, or an "Example" profile.
8. Optional: 2-3 homeowner photos, each with a signed consent that names paid advertising and the platforms.
9. **Families (new):** (a) 'Find my location' recording on a phone with a demo location; (b) 'Route these' recording from Favorites; (c) screenshot of the list with 'This weekend' selected; (d) favorite and share recording; (e) city page sign-up box screenshot. All from our own site, public events only. Private home pins and cards are excluded: zoom the map so no resident's address is legible, or filter to events before recording. No real person's face, no stock, no other site's images.

## 9. Success metrics, thresholds, stop and scale rules

### Conversions we count (real, trackable)
| Audience | Conversion | Where it shows today |
|---|---|---|
| Homeowners | Home added | `fn:add-house-done` ("House or installer display submitted") |
| Event holders | Event listed | `fn:add-event-done` |
| Event holders | Featured paid | `fn:event-feature-paid` (counted by the server) |
| Contest organizers | Contest started | **Not counted today** (no `fn:` counter). Read `contests` rows created in the window from the database or Admin |
| Contest organizers | Contest pass paid | `fn:pass-paid` |
| Installers | Installer profile or home added | `fn:add-house-done` (same bucket as homes) |
| Installers | Sponsor paid | `fn:sponsor-paid` |
| Families | **Route taps** (opened a route in the maps app) | `click:route` (counted for "Route these" buttons and route legs) |
| Families | **Email signup** | `fn:subscribe` (any), `fn:subscribe-landing` (from a city or event page), `fn:subscribe-confirm` (confirmed) |
| Families | **Event card opened** (engaged visit) | `fn:event-open` |
| Families | Find my location, favorite saved, plan shared | **Not counted today** (proposal in section 10) |
| Everyone | Landing | `ref:<code>` row (Admin > Home, "Arrived from link ?ref=..."); `fn:visit` for all new tab sessions |

Supporting steps that tell us where people drop off: `fn:signin-open`, `fn:signin-done`, `fn:event-feature-pick`, `fn:event-feature-checkout`, `fn:pass-choose`, `fn:sponsor-picked`.

### Decision thresholds
These are **owner decisions, not market data**. They are placeholders to react to, labelled H (hypothesis). No cost-per-conversion figure exists for us yet.

| Audience | Good (keep going) | Stop the ad set |
|---|---|---|
| Home added | cost per home added at or under $10 | half of the ad set's line spent (about $22 on Meta homeowners) and 25+ landings (`ref` rows or platform clicks) with 0 sign-ins started, or cost per home above $25 once 3+ homes are added |
| Event listed | at or under $10 | half of the line spent (about $12 on Meta events) and 25+ landings with 0 sign-ins started |
| Contest started | at or under $25 | $20 spent and 0 landings on `/add-contest` or `/contests` with 1+ click, or 0 contests started after the whole $55 on the audience |
| Installer profile | at or under $20 | $10 spent (half the line) and no profile or home submitted by an installer |
| **Families: route tap** | cost per route tap at or under $2 | $15 spent on Meta families (or $8 on Google) with 0 route taps and 0 event-card opens beyond baseline |
| **Families: email signup** | cost per signup at or under $4 | $15 spent on the email concept (E) with 0 signups started |
| **Families: engaged visit** (event card opened) | cost per `fn:event-open` at or under $1 | clicks at 2x or more the `ref:` landings (see global rules) |
| Any paid purchase (Featured, Sponsor, pass) | Treat as success. The ad cost for that audience should be below the order's net of Stripe fees (price from `/pricing`; fee formula in `finance-pricing.md`) | n/a |

### Global stop rules (pause everything and tell the owner)
- Any single platform reaches its total line in section 5 or its end date (the platform should stop it; verify).
- A **policy disapproval** twice on the same ad: stop editing; ask the owner before re-submitting.
- A comment or message complaining about privacy, an address shown, or "you posted my home": pause that ad, remove the item, and check consent records.
- Platform clicks are 2x or more the `ref:` landings for 3 days running (suggests bot or accidental clicks or a broken landing page): pause and test the link.
- A site problem on the destination page (sign-in down, 5xx): pause until fixed.
- A budget line is untouched for 5 days after launch because of low delivery: widen geo or raise the bid within that line, never above it.

### Scale-up triggers and winners
- **Release the $20 reserve** only to a concept that has met the "Good" threshold with at least 2 conversions, and only up to its original daily cap + 50%. Order of preference: **families Meta (A, B or C), families Google, then** homeowners Meta (A or B), event Google, contest Google. Family thresholds (route tap $2, signup $4, event-card open $1) are H placeholders like the rest: there is no cost data for us yet.
- **Move, do not add:** after one week, shift up to half of an underperformer's remaining budget to the winner in the same audience. Never move money between waves after its end date.
- **Keep winners' words:** the winning concept's copy becomes the base for any organic posts, email subject lines and the city-page intro.
- **After Dec 24:** a separate decision. Only a few days of the season remain (it ends Jan 6), so a second campaign is better aimed at spring (Easter, Mar 28, 2027) and Halloween 2027.
- **Old month-2 note (revision 1) removed:** families now run to Dec 24 inside the same $300. Event-holder and contest-organizer ads are weak after mid-December (events are already planned; contests need lead time) but a spring (Easter, Mar 28, 2027) and Halloween 2027 push is worth planning from this data.
- **Results table:** after Dec 8, record per ad set: spend, platform clicks, `ref` landings, conversions, cost per conversion, and the decision. Put it in `docs/status.md`.

## 10. Tracking and attribution

### What the site records today (checked in code)
- `public/hit.js` reads `?ref=<code>` (lowercase letters, digits, hyphens, 1-20 characters) and counts **one landing per code per browser tab session** under `ref:<code>` in `site_hits`, one number per day. It stores the code in `sessionStorage` as `scl-ref`. `functions/api/visit.js` accepts at most **30 different codes a day** (a code already counted always keeps counting). See `docs/monetization/outreach.md`, "Campaign links".
- Funnel steps (`functions/_lib/funnel.js`): one daily number per step, no IP, cookie or account. The list is in section 9.
- **`utm_*` parameters are ignored by the site.** They are harmless and let the ad platforms show clicks by campaign and ad, but the site does not store them.
- There is **no join** between a `ref` code and a later step: `ref:` landings and `fn:` steps are separate daily totals. So today we can tell "how many landed from code X" and "how many homes were added that day", not "which ad led to which home".

### URL scheme per ad (already in each item's `landing_url`)
`https://socallights.app/<path>?ref=<code>&utm_source=<platform>&utm_medium=<medium>&utm_campaign=<campaign>&utm_content=<concept>-v<n>` (Google adds `&utm_term={keyword}`).

| Field | Values |
|---|---|
| `ref` (site-recorded, max 20 characters) | `<plat>-<aud>-<concept>`: plat `mt` Meta, `gg` Google, `nd` Nextdoor, `nl` newsletter; aud `ho` homeowners, `ev` events, `ct` contests, `in` installers; concept `a`/`b`/`c`. Example `mt-ho-a` |
| `utm_source` | `meta`, `google`, `nextdoor`, `newsletter` |
| `utm_medium` | `paid_social`, `cpc`, `sponsor` |
| `utm_campaign` | `scl-<aud>-nov26`, e.g. `scl-ho-nov26` |
| `utm_content` | `<concept>-<label>-v<n>`, e.g. `a-onmap-v1` (bump `v` for each creative revision) |

**Code budget:** 24 ad codes plus about 4 organic ones (`grok-email`, `press`...) is close to the 30-a-day limit. So launch only concepts A and B per audience in wave 1 (16 codes at most) and add C later, or drop to one code per platform and audience if the cap is hit.

### Family conversions and tracking (revision 2)

What exists in code today (checked in `functions/_lib/funnel.js`, `functions/api/visit.js`, `public/app.js`, `public/hit.js`):

| Family action | Counted today? | Where |
|---|---|---|
| Landed from an ad | Yes, per code per day | `ref:<code>` (landings only) and `fn:visit` (all new tab sessions) |
| Opened an event card | Yes | `fn:event-open` (browser beacon) |
| **Route created / opened in a maps app** | **Yes** | `click:route` (taps on "Route these" and route legs, `app.js`) |
| Weekly email sign-up | Yes | `fn:subscribe`, `fn:subscribe-landing`, `fn:subscribe-confirm` |
| Ticket or event-page tap | Yes | `click:ticket`, `click:event-link` |
| **Find my location tapped** | **No** | location is read in the browser only; nothing is sent |
| **Favorite saved** | **No** | stored on the device; nothing is sent |
| **Plan shared** | **No** | uses the share sheet or a link; nothing is sent |
| Which ad led to which route or signup | **No** | `ref:` and `click:`/`fn:` are separate daily totals, no join |

**Family conversion definition (what we call a win):** primary = a **route tap** (`click:route`) or an **email signup** (`fn:subscribe`, confirmed = `fn:subscribe-confirm`). Secondary = event card opened (`fn:event-open`). A "family conversion" is counted per day from the Admin counters minus the Nov 8 baseline, compared with that day's family `ref:` landings.

**Proposed changes, NOT implemented (owner decides; each needs a PR):**
1. Add three fixed keys to `CLICK_KEYS` in `functions/api/visit.js` and `data-clk` attributes in `public/app.js`: `click:locate` (Find my location), `click:favorite` (first favorite per tab session), `click:share` (plan shared). The mechanism already exists (`data-clk`); counts stay one daily number each, no person stored. This is the smallest change that makes the family funnel complete.
2. The same `fnref:<code>:<step>` idea as the supply side (section 10, item 1) so a route tap or signup is tied to the ad code that landed in that tab (`scl-ref` is already in `sessionStorage`). Without it we can only compare daily totals.
3. Add the family `ref` codes to the Admin 'Ads' table proposed in item 4.
Ref codes are recorded as `ref:<code>` by `hit.js` when the first page of a tab session has `?ref=<code>` (1-20 lowercase letters, digits, hyphens; at most 30 different codes a day). Family codes are `mt-fa-a..e`, `gg-fa-a..c`, `gg-fa-f1`, `gg-fa-f2`, `nd-fa-a..e`, `nl-fa-a`: 17 codes. Launch concepts A, B and C first (9 codes on Meta, Google and Nextdoor, with Nextdoor family from Dec 9 so it does not overlap the homeowner Nextdoor codes), and add D, E and F only if the day's code count (ads plus organic codes) stays well under 30.

### Attribution with no code change (use this if nothing is built)
- One `ref` per audience, platform and concept (above); read landing counts per code in Admin.
- Keep landing pages audience-specific: `/add-event` only gets event ads, `/add-house` only homeowner and installer ads (separate by `?kind=installer`; note the `kind` is not counted separately).
- Compare each day's `fn:` totals against that day's `ref:` landings, and subtract the baseline recorded on Nov 8. This is **weak attribution** (organic visitors also add homes); say so in the results.
- Record platform clicks, spend and impressions from each console in the results table.

### Minimal changes proposed (NOT implemented; owner decides)
1. **Attribute the conversion.** When a form posts a success (`submit.js`, `submit-event.js`, contest create, installer create), the browser already holds `scl-ref` in `sessionStorage`. Send it as an extra field and bump a counter such as `fnref:<code>:<step>` (needs a small whitelist like `visit.js` `REF_CODE`), or add a `ref` column to the submissions tables. That gives "ads that led to a signup" per code without cookies, IPs or accounts. A counter is the lightest option.
2. **Add the missing counters:** `fn:contest-created` (organizer finished creating a contest) and `fn:installer-profile-created`, because `fn:add-house-done` mixes homes and installers.
3. **Persist `ref` over sign-in:** the sign-in redirect can drop the query string; confirm `scl-ref` survives the emailed-code step (same tab) and, if it does not, store it before opening the sheet.
4. **Admin view:** a "Ads" table in Admin > Home joining `ref:` landings to `fnref:` steps by code and day.
Cost: small; each touches code that must go through a PR and the usual migration rules. Do none of this without the owner's go-ahead.

## 11. Owner decisions needed

1. **Approve the budget split and the Nov 12 launch date** (or move dates; do not extend end dates). **Decide the cap window:** $300 across Nov 12 to Dec 24 so families run through their peak (recommended), or a strict Dec 8 end (section 5).
1b. **Families:** approve the $100 family share (and the cut to the other four audiences), the 16 `fa-*` items, and the five new real clips and screenshots (section 8, item 9). Decide whether to approve the three small tracking additions (`click:locate`, `click:favorite`, `click:share`).
2. **Accounts to create:** Meta Business Manager with a Facebook Page named for SoCal Lights (Forza-TEK as business); Google Ads account (no Grants); Nextdoor Business account (needs a business page; address rules UNVERIFIED). Billing: a card with a $300 limit.
3. **Approve each of the 42 items** in the review page (all `draft`). Items to check closely: ho-c (removal claim), ct-b ("QR poster"), in-a/in-b (installer features), ev-c and in-c (paid options; hold until Stripe is proven).
4. **Photo and name consent:** decide whether any real home photo is used; if so get **written consent for paid advertising** from each homeowner (separate from showing it on the map). Same for `/installer/lights-up-today` as a screenshot subject. Default: demo data only.
5. **Targeting:** confirm county targeting is acceptable if Meta only offers cities and radius.
6. **Pixel stance:** confirm no Meta or Google tags on the site (recommended) and that attribution relies on `?ref=` plus platform click counts.
7. **Tracking changes:** whether to approve the four small changes in section 10.
8. **Newsletter and Patch quotes:** whether to ask Patch and two chamber or parks newsletters for a quote (zero cost to ask).
9. **Legal:** attorney to confirm the likeness and home-photo consent wording, and contest wording once prizes are involved (also in `product-marketing.md`).

## 12. UNVERIFIED list

- Every Meta, Nextdoor, Reddit, Pinterest and YouTube minimum and CPC figure (third-party blogs only).
- Meta's own current character limits (125/40/30 are consensus of guides; "27 recommended" is also from guides) and Meta's policy text on social-issue classification, radius minimums and photo likeness.
- Nextdoor's specs (headline 70 vs 120, CTA 20 vs 45), ZIP targeting, self-serve minimum, and whether contest wording would pass its policy.
- Whether a for-profit can get Google Ad Grants (the 501(c)(3) rule says no; Google's page unreadable). Whether Forza-TEK is a nonprofit (nothing in the repo says so).
- Google's daily-budget overspend behaviour, Google ZIP availability, and Google's personal-information policy.
- TikTok's exact "exceed" wording and Max Campaign minimums on Reddit.
- Patch, newsletter, Facebook group sponsorship and print prices (none published), and any holiday-season CPM spike.
- ZIP codes in section 7 (known by me, not checked live) and all county counts (from 2026-11-04).
- Estimated clicks in sections 3 and 5 are arithmetic on third-party ranges, not forecasts.
- **Families (revision 2):** no volume or CPC figure was found for 'christmas lights near me' or city variants (read Keyword Planner before launch); family CPC and CTR benchmarks for Meta; Meta's handling of local-event ads (misclassification and superlatives, secondary sources); Macaroni Kid, Mom's LA, San Diego Family and Patch rates for our counties; whether LA or OC libraries and parks calendars accept a link or listing (no LA/OC pages found); the weekly email's 'choose your area and distance' text; the exact weekend and 'Find my location' behavior on the live site; the Nextdoor family test's $1.00 daily minimum; whether `/in/covina` and `/in/mission-viejo` return 200 with upcoming events on launch day.
- Whether the live site matches the claims in ho-c ("remove it any time"), ct-b ("QR poster", judges), in-b ("Request a quote button").

## Owner review, Nov 8 2026: decisions and rules

- **Approved:** 40 of 42 ads. **Rejected:** `fa-f-google-mission-viejo` and `fa-f-google-covina` (the two city-search ads). Do not run them.
- **City rule (owner):** do not market a city unless that city has active events or an active contest. This covers city-named ads, city landing pages (`/in/<city>`) and any geo-targeting down to a city or ZIP. Counties are fine as a broad target only where the county has active listings (all seven do today).
- **How to check (before any city ad, and weekly while ads run):** read the live data, not this document. `GET /api/events` rows have `city`, `s` (start) and `e` (end); `GET /api/contests` lists live contests with `city`. A city is eligible when it has at least one active contest or at least 3 events whose end date is today or later and whose start date is within the ad's flight. Drop the city from targeting when it falls below that. The threshold of 3 is a proposal; the owner can change it.
- **Snapshot on Nov 8 2026:** 989 events with an end date on or after today and a start before Dec 31; by county LA 322, Orange 182, San Diego 145, Riverside 130, San Bernardino 104, Ventura 58, Santa Barbara 48. Cities with 9 or more: San Diego 36, Riverside 30, Newport Beach 24, Temecula 22, Pasadena 19, Los Angeles 19, Long Beach 19, Arcadia 16, Anaheim 14, Santa Barbara 14, Redlands 14, Rossmoor 14, Thousand Oaks 13, Dana Point 12, Santa Clarita 12, Rancho Cucamonga 11, Huntington Beach 11, Altadena 11. Covina has 2 events and no contest, so it fails the rule today.
- **Call to action note:** Google Search text ads have no button; the action is the headline and the landing page. Meta and Nextdoor ads have a button (see `cta`).

## Instagram (owner question, Nov 8 2026)

The Meta lines in the budget table are Facebook and Instagram together: one Meta Ads Manager account, one budget, one set of ad sets. Instagram is not a separate line, so Meta can move spend to whichever surface performs better. Each Meta item in `ads-content.json` now carries an `instagram` block (placements, caption limit, vertical video, hashtags, account link). Setup: connect an Instagram business account to the Facebook Page in Meta Business settings. Caption length and format guidance is from third-party sources and UNVERIFIED against Meta's own pages.

## Owner decisions, Nov 8 2026 (second pass)

- **End date: December 8 for every ad, families included.** Budget stays $300 total. Family flights now run Nov 24 to Dec 8 (15 days): Families Meta $55 = $3.67 a day; Families Google Search $30 = $2.00 a day; Families Nextdoor $15, moved from Dec 9-23 to Nov 24 to Dec 8 = $1.00 a day. All other lines are unchanged. Nothing runs after Dec 8, so the reserve is the only money that could extend a winner, and only if the owner releases it.
- **Accounts:** the Meta Business account already exists under the Forza-TEK account; a new Page for SoCalLights.app is being created. Google Ads and Nextdoor Business accounts are still to do.
- **Claims confirmed on the live site by the owner:** "remove it any time", "QR poster", the "Request a quote" button and the judge flow.
- **Help decisions:** add-homes limit is 100 per paste; the Add page contest tile wording stays as is.

## Owner decision, Nov 9 2026: Facebook and Instagram only

No Google Ads and no Nextdoor. Everything runs on Meta (Facebook and Instagram together), with the same approved Meta ads and the same $300 cap and Dec 8 end date. Re-split: contest organizers $55 (Nov 12 to Dec 8, about $2.04 a day); event holders $45 (Nov 12 to Dec 1, about $2.25 a day); installers $20 (Nov 12 to 23, about $1.67 a day); families $100 (Nov 24 to Dec 8, about $6.67 a day); homeowners $60 (Nov 24 to Dec 8, about $4.00 a day); reserve $20 not loaded. Meta account spending limit $280. Dropped: all Google Search and Nextdoor items (the Google and Nextdoor accounts stay open, unused). Tracking is unchanged (ref codes and funnel counters). Meta daily-minimum figures are UNVERIFIED; check in Ads Manager.
