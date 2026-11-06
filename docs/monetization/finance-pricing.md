# Finance and pricing report, revision 2 (2026-11-04)

Author: Finance and Pricing lead. Not legal, tax or accounting advice. Real numbers come from `docs/monetization/data-2026-11-04.md`, which wins over anything here. **Verification limit:** `WebFetch` still could not resolve stripe.com, developers.cloudflare.com, resend.com or geoapify.com from this session (DNS error: hosts outside the session's allowed domains). So I could not read the vendor pages themselves. Every vendor fact below is from search results restricted to the vendor's own domain (snippets of the vendor's own pages), marked "vendor snippet". That is better than my first draft's third-party sources, but it is not a page read. Re-check the five numbers that drive decisions on the live pages before relying on them.

## Recommendations

1. **This season's revenue will be near zero, and the plan should say so.** Nobody has ever paid ($0 on Stripe, 1 expired checkout). Humans are about 20-50 visits a day. Realistic revenue Nov 4 to Jan 2: **$0 to $300**, with $0 the single most likely outcome unless we sell directly. The goal this season is proof, not income: (a) one real payment through the live Stripe path, (b) five installer conversations, (c) a real human-visit count for 30 days.
2. **Keep Featured at $10 (30 days) and $15 (season). Do not lower prices.** At 20-50 visits a day, even a $5 price would not produce volume. Cheaper does not fix a missing audience. Do not add the $9 homeowner boost.
3. **Defer these until gates pass: Presenting Installer ($500), sponsor slots ($150-$300), Pro for contests as a product to build.** There are 6 homes and 1 installer, so there is nothing to present or sponsor against. If the owner knows the one live contest organizer, offering Pro at $99 by hand is fine: it is a sales conversation, not a build.
4. **Installer profile at $299 per season is defensible only as a founder-sold pilot, not a self-serve product.** At our traffic, 3,000 season visits cannot deliver the leads that justify $299 (math in section 3). Try a discounted founding rate ($99-$149) only if an installer asks, and in exchange for a testimonial and lead tracking.
5. **Spend $0.** Fixed costs stay $0 at this traffic (section 2). The CPA call and refund policy are still needed before the first live dollar but are small tasks; do not pay for Stripe Tax or any plan.

## 1. Payment cost (re-verified)

| Item | First draft | Now | Source |
|---|---|---|---|
| US domestic card | 2.9% + $0.30 (search results) | 2.9% + 30 cents, confirmed (vendor snippet) | [Stripe pricing](https://stripe.com/pricing) |
| Cash App Pay | 2.90%, fixed fee unconfirmed | **2.9% + 30 cents**, plus 1.5% for international cards (vendor snippet) | [Cash App Pay](https://stripe.com/payments/cash-app-pay), [Managed Payments](https://support.stripe.com/questions/managed-payments-pricing) |
| Dispute fee | $15, "win or lose" (third party) | **$15 per dispute; the newer US page says it is fully refunded if the bank rules in our favor**, so "win or lose" was wrong. An older version of the page lists separate $15 "received" and $15 "countered" fees. Conflict not resolved: treat $15 to $30 as the worst case | [Stripe pricing](https://stripe.com/pricing) |
| Stripe Tax | not researched | **0.5% per transaction where registered** (vendor snippet). I found no $15 or monthly Tax fee in it. Reported as 0.5% only; confirm on the page | [Stripe pricing](https://stripe.com/pricing) |
| Managed Payments (separate Stripe product, merchant-of-record) | not mentioned | adds 3.5% on top of standard fees (vendor snippet). Not needed now; relevant only if the CPA wants Stripe to handle sales tax as seller of record | [Managed Payments](https://support.stripe.com/questions/managed-payments-pricing) |
| Fee returned on refund | "confirm in docs" | **Still unverified** (docs.stripe.com did not resolve) | none |

Fee math is unchanged (fee = 2.9% x price + $0.30): $10 nets $9.41, $15 nets $14.27, $99 nets $95.83, $299 nets $290.03. One consequence: the owner's own test purchase costs real money. A $10 test refunded later still loses about $0.59 if the fee is not returned (unverified). That is the cheapest possible proof that the path works and worth it.

## 2. Cost structure (re-verified)

| Service | Verified fact | Change from draft | Source |
|---|---|---|---|
| Pages Functions | Function requests count against the Workers Free quota of 100,000 per day, reset 00:00 UTC. **Requests to static assets are free and unlimited** on free and paid plans. Upgrade (Workers Standard) removes the cap: 10M requests/month included, then $0.30 per extra million. Free plan can be set to fail open or closed at the cap | Draft said "unverified, static assumed not counted". Both now confirmed. Caveat from the docs: once Functions exist, every request invokes one unless static routes are excluded by `_routes.json`. The repo has no `_routes.json`, and Pages normally generates one from `functions/`; check the deployed routes once | [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/) (vendor snippet) |
| D1 | Free: 5M rows read/day, 100K rows written/day, 5 GB account storage, 500 MB per database, 10 databases. Paid: $0.75/GB-month beyond included | Numbers unchanged and now agree with vendor domain. **New:** a Cloudflare changelog says D1 free limits are enforced from 2026-09-01 (queries fail past the cap until 00:00 UTC). Older release notes say 2025-02-10. Dates conflict; either way the cap is live now | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/) (vendor snippets) |
| Resend | Free: 3,000 emails/month, **100/day**, 3 domains. Pro $20/month: 50,000/month, no daily cap, overage $0.90 per 1,000 | Free limits now confirmed on the vendor domain; Pro price confirmed ($20) | [Resend pricing](https://resend.com/pricing) (vendor snippet) |
| Geoapify | Free: 3,000 credits/day (geocode or autocomplete = 1 credit, map tile = 0.25). Free plan **may be used commercially, including production, within limits, with a "Powered by Geoapify" link** plus OSM attribution; soft limits, rate 5 requests/second. Paid white-label removes the Geoapify credit | Draft said sources conflict. Resolved in favor of "allowed with attribution." First paid price ($59/month) **not re-verified** | [Geoapify geocoding docs](https://www.geoapify.com/geocoding-api/), [free maps](https://www.geoapify.com/free-maps-api/) (vendor snippets) |

Headroom against real traffic: Cloudflare shows 56,487 requests in 10 days (about 5,600/day including bots), under 6% of the 100,000/day Functions cap even if every request were a Function call. D1 and Resend caps are far away at this traffic. **Fixed cost this season: $0.** The $84/month worst case in the first draft is not a planning number at current volume.

## 2b. Featured event pricing change (2026-11-06, owner-approved)
The window now follows the event instead of a flat 30 days. Prices live only in `PLANS` in `functions/_lib/featured.js`.

| Plan | Price | Level | Runs |
|---|---|---|---|
| Featured pin | $10 | 1 (gold pin and badge) | payment to the event's last day, up to 30 days |
| Top of the list | $15 | 2 (also listed first) | payment to the event's last day, up to 30 days |
| Full run (stored key `season`; replaces Whole season $20) | $25 | 2 | payment to the event's last day, up to 90 days; events of 31+ days with 7+ days left |

- Featuring opens 30 days before the event starts; earlier checkout returns a 400 with the date to come back. A running event can buy any time.
- The end date is the admin-approved `end_date` at payment and is fixed then; later date changes do not extend the placement. A repeat purchase adds time only when the cap (not the last day) ended the first one; an upgrade of level is still sold.
- Homes are unchanged: $10 pin, $15 top, 30 days from payment, no Full run.
- Stripe fee on $25 is about $1.03 (net about $23.97). Margin per sale is unchanged in kind: still dominated by the fixed 30 cents on a $10 sale.
- Grandfathered: $20 whole-season orders already paid (and any in flight at $20) run to the event's last day with no 90-day cap.
- Short events now get shorter placements for the same price (a 10-day event is featured for 10 days, not 30), which is the intended fairness trade; revenue per buyer is unchanged for events of 30+ days. Revenue scenarios in section 3 still use $10-$15 and remain assumptions.

## 2c. Installer Sponsor placements (2026-11-06, owner-approved)
Prices live only in `INSTALLER_PLANS` in `functions/_lib/featured.js`. Self-serve at `/sponsor`.

| Plan | Price | Includes |
|---|---|---|
| Banner | $50 per season | name (linked to website or email) and phone in the labelled Sponsor banner, shown when the service area is in view, numbers in the dashboard |
| Banner and top of the list | $75 per season | the banner, plus a labelled company card at the top of the list behind Featured events |

- **Per season** = from payment to the last day of the current season on the map (public/seasons.js; Christmas ends Dec 26). the first 14 days of a season (Pacific date; day 1 is the season's first day) cost the full price. After day 14 the price is `full x days left / (season days - 13)` (days left counts the start day), rounded to a whole dollar, never below $10 (same floor for both plans), and never the full price after day 14. Day 14 is exactly full and day 15 just below it, so there is no cliff. A season shorter than 14 days is prorated over the whole season; an unknown season start is the full price. The placement always ends on the season's last day. The helper is `installerPrice()` in `functions/_lib/featured.js`; the quote, checkout and webhook amount check all use it. Christmas season (Nov 3 to Dec 26, 54 days): Nov 3 to Nov 16 $50 / $75; Nov 17 $49 / $73; Nov 24 $40 / $60; Dec 1 $32 / $48; Dec 10 $21 / $31; Dec 19 $10 / $15 (the banner reaches the floor); Dec 22 $10 / $10 (both at the floor) to Dec 26.
- Renewal starts the day after the running placement ends (full price for the next season); at most one season ahead. Upgrade (banner to banner and top) costs the difference between the two plans' prices today, floor $10.
- Stripe fee about 2.9% + 30c: on $50 about $1.75 (net $48.25); on $75 about $2.48 (net $72.52); on the $10 floor about $0.59 (net $9.41); the same floor protects the $75 plan.
- This replaces the founder-sold pilot guess of about $299 a season for the first installer sales; the owner chose these prices. Gate to watch: installer conversations and `fn:sponsor-paid` (see `docs/CHECKLIST.md`).

## 3. Revenue scenarios from real traffic

Season window: Nov 4 to Jan 2, about 60 days. Humans per day: 20 (low), 50 (high; Nov 3's count). Visits in window: **1,200 to 3,000**. Cloudflare's 450-650 "uniques" are not used.

**Conversion rates are assumptions, not measurements.** The only benchmark found is SaaS freemium: about 3-5% free-to-paid is "good" and 20% of products sit below 2.5% ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion)). Those rates are measured against free sign-ups, not site visitors, and no local-directory benchmark exists, so visitor-to-paid will be much lower. I use deliberately low rates and show the arithmetic so you can substitute your own.

| Offer | Assumption (label: assumption) | Visits per buyer | Buyers at 1,200 / 3,000 visits | Revenue range |
|---|---|---|---|---|
| Featured event, $10-$15 | 1 in 2,000 visits is an organizer who pays (0 submissions ever; 84 ticket-linked events suggest some organizers exist) | 2,000 | 0.6 / 1.5 | $0 to $20 |
| Homeowner boost, $9 | 1 in 3,000 visits, and only 6 homes exist | 3,000+ | 0.4 / 1 | $0 to $9 (do not build) |
| Installer profile, $299 | An installer needs about 4 leads to pay back: $299 / (about $400 job x about 20% close, assumption). If 0.3% of visits request a quote (assumption; 0 leads ever) and a metro gets 30% of traffic, one installer needs about 4,400 total visits | about 4,400 per installer | 0.3 / 0.7 | $0 to $200; realistically one founder-sold sale or none |
| Contest Pro, $99 | The organizer wants about 500 contest-page views. Contests are 7 of 50 visits (14%), so about 3,600 total visits per contest | about 3,600 | 0.3 / 0.8 | $0 to $99 |
| Sponsor slot, $150 | At 2 page views per visit and an assumed local display rate of $5-$20 per 1,000 views, the whole season's audience is worth $12 to $120 | not viable | 0 | $0 |
| Presenting installer, $500 | Needs supply (1 installer exists) and about 20 homeowner quotes in one city | not viable | 0 | $0 |

The sponsor CPM range is an assumption with no source; it is shown only to illustrate scale.

**What has to be true to reach each season-revenue level** (all net of about 3% fees):

| Revenue goal | Combination | What must be true |
|---|---|---|
| $100 | 1 Contest Pro, or 7 Featured at $15 | The owner personally sells Pro to the existing contest organizer, or about 14,000 visits (about 4x the high-case season traffic) |
| $300 | 1 installer at $299 | The owner personally sells it: no traffic gets here. The installer must believe leads will come, with no lead history to show |
| $1,000 | about 3 installers plus 1 Pro | At least 3 installers listed (1 today), each seeing 4+ leads: roughly 13,000+ visits concentrated in the metros |
| $4,000 (first draft's base case) | about 13 installers, or equivalent | Roughly 15x the audience and 13x the installer supply. **Not a 2026 outcome** |

Blunt version: with 1,200 to 3,000 visits, revenue is decided by how many direct sales conversations the owner has, not by traffic. The old base case ($3,980) relied on 6 installers, 60 featured purchases and 2 presenting installers; against 6 homes and 1 installer it was fiction, and I withdraw it. The realistic goal is **$0 to $300 and a working, proven path**, then size next season from a measured 30 days of human visits.

Break-even: fixed cost is $0, so any one sale is profit before owner time. Owner time is the real cost: 5 installer calls plus follow-up is likely 10-15 hours, which at any hourly rate exceeds one $299 sale. That is acceptable because the output is evidence.

## 4. Price points under a tiny audience and empty supply

| Price | Verdict | Why |
|---|---|---|
| Featured $10 / $15 | **Defensible, keep** | Already built and live. Fee drag is 4.9-5.9%. Cost to keep: $0. Cheaper would not change volume |
| Featured $5 | Drop as a headline offer | Fee drag 8.9% and one dispute ($15) cancels three sales; no volume to offset it |
| Contest Pro $99 | **Defensible, hand-sold only** | Priced about on a monthly contest-software tier ([G2 ShortStack](https://www.g2.com/products/shortstack/pricing)), sold to one known organizer. Do not build a purchase flow yet |
| Installer $299 | **Wait** for self-serve; pilot by hand | Value rests on leads we have not produced (0 leads). A founding rate is better than a price that cannot be justified with data |
| Homeowner boost $9 | **Wait / drop** | Six homes. Revisit when homes exceed 100 |
| Sponsor $150-$300 | **Wait** | The season's total audience is worth less than one sponsor slot (section 3) |
| Presenting installer $500 | **Wait** | Needs more than 1 installer in a city and measured quote volume |

## 5. Risks and admin (confirm with a CPA or attorney)

ftc.gov and leginfo.legislature.ca.gov still return 403 to bots and were not re-checked; all legal items below stay flagged for a professional.

- **Sales tax:** California generally does not tax services (secondhand, [MTC notes](https://www.mtc.gov/wp-content/uploads/2023/10/Digital-Work-Group-Notes-10-5-23.pdf)); CDTFA [digital products guide](https://cdtfa.ca.gov/industry/retailers-and-purchasers-of-digital-products/) and [ruling 120-0663](https://cdtfa.ca.gov/lawguides/annotations/120-0663.pdf) not read in full. Ask: is a Featured listing taxable, and is a seller's permit needed? Stripe Tax at 0.5% is not worth paying until that answer is yes.
- **1099-K:** threshold reported as $20,000 and 200 transactions (secondhand, [Avalara](https://www.avalara.com/us/en/blog/one-big-beautiful-bill-act-1099-reporting-threshold.html)). Irrelevant at our volume, but income is still reportable.
- **Refunds and chargebacks:** write the one-paragraph refund policy on `/feature` (refundable before placement starts or if the event is declined). Dispute fee $15 is the exposure per sale.
- **Contest law and FTC sponsored-placement disclosure:** unchanged; keep entry and votes free, charge organizers only. Needs attorney review before any prize.
- **Apple:** paid features stay web-only; `developer.apple.com` was not re-read this pass. Confirm the current guideline before each store release.
- **Entity and books:** which entity books revenue (Forza-TEK?), separate bank account, liability cover. Unchanged.

## 6. Decision gates (counted from our own counters)

| Investment | Gate | Where to read it |
|---|---|---|
| Believe the audience number | 30 consecutive days of `site_hits`, humans/day averaging at least 50 | `site_hits` table |
| Prove the payment path | 1 live paid `feature_orders` row (owner's own test counts, then 1 real stranger) | `feature_orders`, Stripe dashboard |
| Keep the Featured page prominent | 10 `event_submissions` in the season and 3 Feature checkout starts | `event_submissions`, Stripe sessions |
| Build installer self-serve paid tier | 5 verified installers listed (now 1) AND 25 `installer_leads` in the metro in 30 days (now 0), plus at least 2 of 5 interviewed installers say yes to $199 or more | `installers`, `installer_leads` |
| Build Pro checkout and sponsor slots | 3 live contests (now 1) with 100 votes in total (now 0), plus 3 sponsor inquiries | `contests`, votes, contest leads |
| Presenting installer | 1 installer in a city and 20 `installer_leads` in that city in a season | `installer_leads` |
| Homeowner boost | 100 approved `posts` (now 6) | `posts` |
| Pay for any plan upgrade | Functions requests above 60,000/day, or D1 reads above 3M/day, or Resend above 80/day, on 3 days in one week (now about 5,600 requests/day) | Cloudflare and Resend dashboards |
| Stripe Tax / sales-tax tooling | CPA says taxable, or gross above the CPA's threshold | CPA answer |

## Still unverifiable

- Stripe: whether the fee is returned on refund; the dispute-fee conflict ($15 vs $15 + $15); Stripe Tax 0.5% on the live page. Pages not fetched (stripe.com and docs.stripe.com did not resolve).
- Geoapify first paid plan price ($59/month from draft).
- Cloudflare: exact D1 enforcement start date (2025-02-10 vs 2026-09-01); whether this project's deployed `_routes.json` excludes static files.
- Ad CPMs, installer close rates and quote rates: pure assumptions.
- ftc.gov, leginfo, Apple guidelines: not re-read.

## Sources

Vendor-domain search snippets (page body not fetched; network blocked):
- Stripe pricing: https://stripe.com/pricing
- Stripe Cash App Pay: https://stripe.com/payments/cash-app-pay
- Stripe Managed Payments pricing: https://support.stripe.com/questions/managed-payments-pricing
- Cloudflare Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- D1 free-tier enforcement changelog: https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- Resend pricing: https://resend.com/pricing
- Geoapify geocoding API: https://www.geoapify.com/geocoding-api/
- Geoapify free maps API: https://www.geoapify.com/free-maps-api/

Other:
- Lenny's Newsletter, free-to-paid benchmarks: https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion
- G2 ShortStack: https://www.g2.com/products/shortstack/pricing
- MTC digital notes: https://www.mtc.gov/wp-content/uploads/2023/10/Digital-Work-Group-Notes-10-5-23.pdf
- CDTFA digital products: https://cdtfa.ca.gov/industry/retailers-and-purchasers-of-digital-products/
- CDTFA 120-0663: https://cdtfa.ca.gov/lawguides/annotations/120-0663.pdf
- Avalara 1099-K: https://www.avalara.com/us/en/blog/one-big-beautiful-bill-act-1099-reporting-threshold.html
- Thumbtack and Angi install prices (from draft, not re-checked): https://thumbtack.com/p/christmas-light-installation-prices, https://www.angi.com/articles/how-much-does-christmas-light-installation-cost/il/chicago
- Data snapshot: `docs/monetization/data-2026-11-04.md`
