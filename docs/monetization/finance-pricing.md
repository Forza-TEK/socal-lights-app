# Finance and pricing report (2026-11-04)

Author: Finance and Pricing lead. Not legal, tax or accounting advice. Several vendor pages could not be opened directly in this session (the fetch tool could not reach stripe.com, cloudflare.com, resend.com or geoapify.com), so vendor figures below come from search results and are marked "verify". Nothing here is a forecast: every revenue figure is a formula with labelled assumptions.

## Recommendations

1. **Turn on Stripe Featured now, but sell it as a per-season bundle and retire the $5 tier as a standalone.** A $5 charge loses about 8.9% to card fees; $15 loses 4.9%. Keep $10 (30 days) and $15 (season) as the main choices, and relabel $5 as "pin only, 30 days" only if you want a cheap entry. It is not the money-maker either way.
2. **Put the real revenue effort on installers, priced per season against one booked job.** Homeowners pay roughly $168-$686 per install (Thumbtack, Angi), so a $199-$399 per-season profile is under one job. Test with five installers before building.
3. **Contest Pro at $99 per season (range $79-$149), billed to the organizer, never the entrant.** Sponsors pay the organizer directly at first; we charge only for Pro. Sponsor payment and platform share come later.
4. **Do not buy anything until gates pass.** Fixed costs may stay near $0 for a while (see section 2). The binding limit is more likely D1 daily reads than money. Add three counters (weekly visitors, outbound clicks, Feature checkout starts) this season; price after one season of data.
5. **Before the first live dollar, book 1 hour with a CPA** (sales tax on listing placement, entity, 1099-K) and write a one-paragraph refund policy on `/feature`.

## 1. Payment cost reality

Verified in search results: Stripe US cards are 2.9% + 30 cents per successful domestic card charge, no monthly fee ([Stripe support, June 2023 note](https://support.stripe.com/questions/june-2023-pricing-updates-for-businesses-based-in-us); [fee guide dated Oct 2026](https://checkoutpage.com/blog/stripe-processing-fees)). Stripe's own page lists Cash App Pay at 2.90%, plus 1.5% for international ([Stripe support](https://support.stripe.com/questions/managed-payments-pricing)). That page defers the Cash App Pay fixed fee to the pricing page; third parties say 30 cents, which I could not confirm. Dispute fee: third parties say $15 per dispute, win or lose; Stripe's FAQ defers amounts to its pricing page ([Stripe dispute FAQ](https://support.stripe.com/questions/understanding-dispute-fees)). **Verify all of this on stripe.com/pricing.**

Fee drag by price (formula: fee = 2.9% x price + $0.30):

| Price | Fee | Fee as % | Net to us |
|---|---|---|---|
| $5 | $0.445 | 8.9% | $4.56 |
| $10 | $0.590 | 5.9% | $9.41 |
| $15 | $0.735 | 4.9% | $14.27 |
| $99 | $3.17 | 3.2% | $95.83 |
| $299 | $8.97 | 3.0% | $290.03 |
| $500 | $14.80 | 3.0% | $485.20 |

Reading: below about $10 the fixed 30 cents dominates. A single $15 dispute on a $5 sale is a 400% loss (one dispute wipes out roughly three $5 sales). Stripe refunds do not return the original fee (confirm in Stripe docs). Low prices make sense only if volume is large, which is not yet known. Prefer bundles: one $15 season purchase beats three $5 purchases by about $1.20.

## 2. Cost structure: what could force a paid plan

| Service | Free limit (as found) | Source status | What triggers payment |
|---|---|---|---|
| Cloudflare D1 | 5M rows read/day, 100K rows written/day, 5 GB account, 500 MB per DB; queries fail past the cap, reset 00:00 UTC | Official docs surfaced in search; mirrors agree ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/index.md)) | Reads. Assumption: an uncached events list scans about 1,300 rows, so about 3,800 such calls/day exhausts the cap. Check query plans and caching. |
| Pages Functions / Workers | 100,000 requests/day, 10 ms CPU per invocation (one aggregator; mapping from Workers to Pages Functions is my background knowledge) | Unverified for Pages. Verify on Cloudflare's Pages pricing page | About 100K API calls/day. At 5 API calls per visit (assumption), roughly 20,000 visits/day. Static files assumed not counted: verify. |
| R2 | 10 GB-month, 1M Class A, 10M Class B per month, egress free; paid about $0.015/GB-month (secondary sources) ([R2 pricing](https://developers.cloudflare.com/r2/pricing)) | Official page surfaced; one site contradicts it and I discount it | Photo storage. At an assumed 0.5 MB per photo, 10 GB is about 20,000 photos. |
| Resend (email) | Free: 100 emails/day, about 3,000/month; Pro $20/month for 50,000 ([Resend pricing](https://resend.com/pricing.md)) | Daily cap confirmed on Resend's page; Pro figures third-party | Sign-in codes plus invites plus quote emails over 100/day. A busy contest day could hit this before anything else. |
| Geoapify | Free 3,000 credits/day, "limited commercial use"; first paid plan reported $59/month ([Geoapify](https://geoapify.com/pricing)) | Search snippets only. Sources conflict on commercial terms | Geocoding on submissions. Read the terms before charging, since paid listings make the site clearly commercial. |
| Stripe | No monthly fee | See section 1 | Per sale only |

Worst-case recurring cost if everything tips over (assumption: Workers paid $5, Resend $20, Geoapify $59 per month): about $84/month, about $1,000/year. Likely near-term cost is $0 to $25/month. Domain renewal and any Stripe Tax fee are not included (not researched).

## 3. Price architecture per segment (per season)

A season is roughly Halloween (Oct), Christmas (Nov 15-Jan 2), Valentine's, spring, summer/4th. No paid-tier competitor was found that sells per season, so anchors are monthly tools or the customer's own job value.

| Segment | Product | Recommended | Range | Anchor (source) | Status |
|---|---|---|---|---|---|
| Event organizers | Featured pin / top / season | $10 / $15 season | $5-$25 | Existing pricing; no external anchor found | Built |
| Homeowners | Featured home boost on map (never in contest ballot or counts) | $9 per season | $5-$15 | Internal; contest entry stays free | Hypothesis, not built |
| Installers | Verified profile, badge, quote button, lead emails | $299 per season | $199-$499 | One install is $168-$675 ([Thumbtack](https://thumbtack.com/p/christmas-light-installation-prices), [Angi](https://www.angi.com/articles/how-much-does-christmas-light-installation-cost/il/chicago)). Franchises spend heavily on lead generation ([Total Landscape Care](https://www.totallandscapecare.com/business/article/15041301/all-about-the-holiday-lighting-franchise-christmas-decor)). No per-lead prices found | Hypothesis |
| Contest organizers (cities, HOAs, chambers) | Pro: sponsor logos, prize list, export, extra judges | $99 per season | $79-$149 | Contest software lists about $29-$99/month ([G2 ShortStack](https://www.g2.com/products/shortstack/pricing)); sources are review sites | Hypothesis |
| Local sponsors | Sponsor slot on a contest or city page | $150 Silver / $300 Gold per contest | $100-$500 | None found. Chambers use Gold/Silver/Bronze tiers ([Light Up Langdon](https://langdonchamber.ca/product/light-up-langdon-sponsorship/)); no prices published | Pure hypothesis |
| Presenting installer (exclusive) | One per city per season, grand prize, quote button | $500 per city per season | $300-$1,000 | Existing hypothesis in `docs/contest-business-model.md`; priced against one booked job | Hypothesis |

Sources conflict or are missing on: installer lead prices (none found), sponsor prices (none found), Cash App Pay fixed fee. Do not quote these externally as market facts.

## 4. Revenue model

Per season, gross revenue = sum over products of (buyers x price). Net = gross x (1 - fee%) - fixed costs. All buyer counts are assumptions, not data; they are placeholders for measurement.

| Line | Formula | Low | Base | High |
|---|---|---|---|---|
| Featured purchases | N x $12 avg (assumed mix) | 20 -> $240 | 60 -> $720 | 200 -> $2,400 |
| Installer profiles | N x $299 | 2 -> $598 | 6 -> $1,794 | 15 -> $4,485 |
| Contest Pro | N x $99 | 1 -> $99 | 3 -> $297 | 8 -> $792 |
| Presenting installer | N x $500 | 0 -> $0 | 2 -> $1,000 | 5 -> $2,500 |
| Sponsor slots (if we bill) | N x $225 x 15% share | 0 | 5 -> $169 | 20 -> $675 |
| **Gross per season** | sum | **$937** | **$3,980** | **$10,852** |
| Card fees (about 3.5% blended, assumption) | gross x 3.5% | $33 | $139 | $380 |
| Fixed costs, per season (2-4 months of tools, assumption) | $0 / $25 / $84 x 3 months | $0 | $75 | $252 |
| **Net per season** | | **$904** | **$3,766** | **$10,220** |

Buyer counts are invented placeholders sized against 1,302 events, about 450 homes, and a handful of contests; none are measured. Treat the table as a template.

**Break-even.** Break-even buyers B = fixed costs / (price x (1 - fee%) - variable cost). At $299 and 3% fees, one installer covers about $290; so at worst-case $252 per season fixed cost, **one installer profile per season covers hosting**; at $10 Featured sales it takes about 27 sales ($252 / $9.41). Real cost not in the table: owner time and tax/accounting (unknown, see section 5). If the owner values time at $X/hour, add X x hours to fixed costs.

**Cheap measurements that replace assumptions**
- Weekly visitors and API calls/day (Cloudflare analytics, free) replaces the traffic and limit assumptions.
- Feature page views to checkout starts to completed (Stripe dashboard) replaces Featured conversion.
- Outbound quote clicks and quote requests per installer, already counted on manage pages (`docs/installers.md`), replaces installer value.
- Email sends/day (Resend dashboard) replaces the email limit assumption.
- Five installer calls ("what do you pay per lead today?") replaces the installer price hypothesis.
- Contest count, entries, votes, and sponsor inquiries replace the organizer and sponsor assumptions.

## 5. Risks and admin (confirm with a CPA/attorney)

| Topic | What I could verify | What to ask |
|---|---|---|
| Sales tax | California generally does not tax services (secondhand, [MTC notes](https://www.mtc.gov/wp-content/uploads/2023/10/Digital-Work-Group-Notes-10-5-23.pdf)); CDTFA has a [digital products guide](https://cdtfa.ca.gov/industry/retailers-and-purchasers-of-digital-products/) and an [advertising-on-internet ruling](https://cdtfa.ca.gov/lawguides/annotations/120-0663.pdf) whose conclusion I could not read. Other states tax advertising or placement differently. | Is a Featured listing or profile subscription taxable in CA? Do we need a seller's permit or CDTFA registration? Do out-of-state buyers create nexus? Is Stripe Tax worth it (fee not verified)? |
| 1099-K | Threshold is back to $20,000 and 200 transactions (not indexed) under OBBBA, secondhand ([Avalara](https://www.avalara.com/us/en/blog/one-big-beautiful-bill-act-1099-reporting-threshold.html)); retroactive start year differs by source | Stripe reports to us if we pass it; we report income either way. When must we issue 1099s to anyone (for example prize payouts or contractors)? |
| Refunds | None researched | Draft: Featured refundable before the placement starts or if the event is cancelled or declined; otherwise no refund. Decide the declined-submission refund (already in `docs/stripe-setup.md`). Ask: are these terms enforceable in CA? |
| Chargebacks | $15 per dispute (third-party) | Keep receipts and the placement log; reply with evidence only on larger sales. |
| Contest law | `docs/contest-business-model.md`: paid votes and entry fees would risk lottery treatment. We charge organizers, sponsors and installers only. Bus. & Prof. Code 17534 not retrievable here. | Review rules and sponsor terms before any prize is offered. FTC disclosure for sponsored placements. |
| Entity and books | None researched. Owner is Forza-TEK. | Is revenue booked in Forza-TEK or a separate entity? Separate bank account and Stripe payout? Liability coverage for installer or sponsor claims? Bookkeeping tool and annual filing needs? |
| Apple | Existing rule: paid features web-only and hidden in native apps | Confirm the current guideline before each store release. |

## 6. Decision gates

| Investment | Must be true first | Metric / source |
|---|---|---|
| Turn on Stripe Featured | CPA call done; refund text published; test purchase works | Checklist |
| Build installer paid tier | 5 installer conversations, at least 2 say they would pay $199+ per season or name a lead cost above it | Call notes |
| Build contest Pro and sponsor slots | At least 3 live contests with entries and votes; at least 3 sponsor inquiries | Admin contest data |
| Presenting installer sales | Quote requests from at least 20 homeowners across the season in one city | `installers` quote log |
| Pay for any plan upgrade | D1 reads above 60% of 5M/day, or email above 80 per day, on 3 days in a week | Cloudflare and Resend dashboards |
| Sales tax tooling (Stripe Tax) | Taxable status confirmed by CPA, or gross above the CPA's threshold | CPA answer |
| Hire or outsource sales | Net per season is above the owner's time value at current volume | Section 4 formula |

## Sources

- Stripe June 2023 US pricing note: https://support.stripe.com/questions/june-2023-pricing-updates-for-businesses-based-in-us
- Stripe Managed Payments pricing (Cash App Pay): https://support.stripe.com/questions/managed-payments-pricing
- Stripe dispute fees FAQ: https://support.stripe.com/questions/understanding-dispute-fees
- Third-party Stripe fee guide: https://checkoutpage.com/blog/stripe-processing-fees
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/index.md
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing
- Resend pricing: https://resend.com/pricing.md
- Geoapify pricing: https://geoapify.com/pricing
- Thumbtack: https://thumbtack.com/p/christmas-light-installation-prices
- Angi: https://www.angi.com/articles/how-much-does-christmas-light-installation-cost/il/chicago
- Total Landscape Care (franchise): https://www.totallandscapecare.com/business/article/15041301/all-about-the-holiday-lighting-franchise-christmas-decor
- G2 ShortStack: https://www.g2.com/products/shortstack/pricing
- Light Up Langdon: https://langdonchamber.ca/product/light-up-langdon-sponsorship/
- CDTFA digital products guide: https://cdtfa.ca.gov/industry/retailers-and-purchasers-of-digital-products/
- CDTFA annotation 120-0663: https://cdtfa.ca.gov/lawguides/annotations/120-0663.pdf
- MTC digital work group notes: https://www.mtc.gov/wp-content/uploads/2023/10/Digital-Work-Group-Notes-10-5-23.pdf
- Avalara on 1099-K: https://www.avalara.com/us/en/blog/one-big-beautiful-bill-act-1099-reporting-threshold.html
