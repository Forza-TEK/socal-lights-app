# Strategy v2: earn the right to charge, then charge for the free heart's extras

_CEO synthesis, 2026-11-04, revised after real data. Sources: `data-2026-11-04.md` (Stripe, Cloudflare and D1, read-only), and the revised `finance-pricing.md`, `digital-monetization.md`, `product-marketing.md`. This replaces the first strategy, which assumed an audience and a supply side that the data shows do not exist yet._

## What the data changed
| First plan assumed | Real data (2026-11-04) |
|---|---|
| Hundreds of visitors a day | Cloudflare shows 450-650 "uniques", but that includes bots. The site's own counter shows 18 and 50 human visits on Nov 2 and 3 (counter is two days old) |
| About 450 showcased homes | 6 |
| Installers want exclusive leads | 1 installer, 0 leads |
| Contests drive traffic | 1 live contest, 0 votes |
| Featured at $5-$15 is "most promising" | $0 ever paid; 1 checkout started, expired unpaid |
| Fixed costs might force a paid plan | $0 this season; about 6% of the free Functions cap |

**Conclusion: this season is about proof, not revenue.** Realistic 2026 revenue is $0 to $300 (Finance). The goal is a proven payment path, a measured audience and the first supply.

## The rule that does not change
Free forever: the map, search, filters, routes, browsing and starring homes, Help Center, tutorials, weekly email, voting, entering a home as a neighbor. No paid votes, no entry fees, no paid ballot order; money never touches contest outcomes. Paid placements are labelled and capped. Paid features stay web-only in the apps.

## Three stages, each unlocked by counts from our own tables
### Stage 1: Prove (now to mid-December)
Cost: about $0 plus time. Revenue target: one real paid Featured order.
1. **Prove the payment path.** Test-mode run, then one live $5 purchase and a refund (about 44 cents in fees). Confirm the webhook marks the event featured. The owner does the purchase; I verify it in Stripe and D1.
2. **Fix the Featured path** (spec in `digital-monetization.md`), on a branch, reviewed before merge:
   - Webhook bug: the order row is written before the placement is applied, and Stripe's retry then hits the "duplicate" branch, so a failed first attempt is never applied. Confirmed by me in `functions/api/stripe-webhook.js` lines 19-36.
   - Handle `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `checkout.session.expired`.
   - One price source, receipts, an idempotency key, native-app guard on `/feature`, link `/feature` from the site, retire the Cash App path.
3. **Measure.** Add outbound-click and `/feature` view counters to the site's own counter; keep `site_hits`. Real human visits are the number every later decision rests on.
4. **Grow the audience for free.** City pages (266 `/in/<city>` pages already exist), local press and Patch, parks-department and neighborhood-group sharing, the weekly email.
5. **Seed supply for free.** Pursue the free contests in `docs/contest-leads.md`; help the first homes and installers sign up.

### Stage 2: Earn small (Dec to Feb)
Only these products are sold, by hand, with no new build beyond Stage 1:
- **Featured Event at $10 (30 days) and $15 (season)** to organizers of real, ticketed events. $5 is not promoted: the fixed 30-cent fee takes 8.9% of it. Give the first 5 organizers a free placement in exchange for permission to quote their click counts.
- **Affiliate links** on the 84 events that link to Eventbrite, Ticketmaster or Fever (`ticketAffiliates` is empty today). Apply to the programs; expect token income.

### Stage 3: Build the business (spring 2027 onward)
Each product unlocks only when its counts are real:
| Product | Price hypothesis | Unlocks when |
|---|---|---|
| Installer Partner (profile, quote button, stats) | about $299 per season, founder-sold first | 3+ installers, 25+ homes, 20 installer clicks a week, a first real lead |
| Contest Pro | about $99 per season, hand-sold | 3 contests with 20+ entries and 100+ votes each |
| Presented By (regional sponsor) | unpriced | 1,000 real visits a day for 14 days |
| Homeowner boost, newsletter sponsor | unpriced | 100 homes; 500 subscribers |
| Cities and chambers | Stripe Invoicing, inbound only | When one asks |
Plan-upgrade triggers for infrastructure: over 60,000 Functions requests a day, 3M D1 reads a day or 80 Resend emails a day.

## Cut from the first plan
The generic orders/entitlements/installer-slots build, exclusive "Presenting Installer", the $500 slot price, sponsor slots and a $5 headline tier. With 6 homes and 1 installer there is nothing to put in them yet.

## Where the departments still disagree, and my call
- **Installer pricing:** Finance says a founder-sold pilot, maybe with a founding discount; Digital says wait for about 10 claimed profiles. My call: have the five installer conversations in December to learn what they pay per lead, but do not take payment until the Stage 3 gate is met.
- **Likely reasons nobody bought Featured:** nothing on the site links to `/feature`; organizers have no relationship with us (we added their events); the page claims an audience without numbers; finding your own event is a chore; the cancel URL lands on a blank page. The webhook endpoint registration is unconfirmed.

## Decisions for the owner
1. **Run the $5 test purchase** on your own event (I'll verify it in Stripe and D1), then refund it.
2. **Check the Stripe Dashboard:** is the webhook endpoint registered at `https://socallights.app/api/stripe-webhook` with the events listed above, and is "Successful payments" email receipts on?
3. **Approve building the Featured fixes** on a branch (nothing merged without your review).
4. **CPA hour:** who receives the money and the sales-tax treatment of listings.
5. **Attorney review** before any sponsor, lead or contest-prize product.
6. **Personal outreach:** about five installer conversations and five event-organizer conversations. I draft the messages; you or I send them with your OK.
7. **Tell me:** Amazon Associates status, and whether the Google and Resend sign-in secrets are set.

## Still unverified
Amazon and ticket-affiliate status, Stripe webhook registration and receipt setting, the expired checkout session's cause, California contest law and FTC rules (primary sites return 403 to automated visitors), and traffic beyond two days of the site's own counter.
