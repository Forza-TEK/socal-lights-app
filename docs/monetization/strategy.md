# Strategy: paid services, free heart

_CEO synthesis, 2026-11-04. Built from the three department reports in this folder: `finance-pricing.md`, `digital-monetization.md`, `product-marketing.md`. Every price here is a hypothesis to test, not a forecast. There is no traffic data in the repo._

## Verified today
- `https://socallights.app/api/config` returns `featureCheckout: true`, so Stripe is configured in production and Featured events can already be bought.
- Not verified: whether a real purchase completes end to end, whether the Amazon Associates account is still active, and the production state of Google/Resend sign-in for contests.

## The decision in one paragraph
Charge the people who earn from the lights (installers, contest organizers, local sponsors, event organizers) and never the families who look for them. Sell exclusive local seats priced against one booked installation job, per season, through one shared Stripe checkout. Spend the 2026 season proving demand with the features that already exist, then build the rest for 2027.

## Where the three departments agree
- First products: Featured Event (built), Installer Partner with an exclusive presenting slot and quote leads, Contest Pro.
- Per-season pricing, not monthly. Nearly all demand is Halloween to New Year.
- Never sell votes, entry fees or ballot position. Payment never touches contest outcomes.
- Paid features stay web-only and out of the native apps.
- Prices are unproven; measure one season first.

## Where they differ, and my call
| Question | Finance | Digital | Marketing | Decision |
|---|---|---|---|---|
| Featured $5 tier | Fixed fee eats 8.9%; make it optional | Fix webhook gaps first | Cap slots so the free list stays good | Keep all three tiers for now, lead with $10 and $15 on the page, cap Featured slots, fix refund handling before promoting |
| How to start selling installers | Test with five installers | Stripe Payment Links plus a manual flag | Sell after free contests prove traffic | Do all three in order: five conversations, then Payment Links, then build only what they ask for |
| Build a generic orders/entitlements layer | Not covered | Yes, one layer for every product | Not covered | Yes, but only after the first installer or sponsor pays by Payment Link, so we build what is proven |
| Who gets sponsor money | Sponsors pay the organizer at first | Optional platform share later | Sell "Presented By" ourselves | Phase 1: sponsors pay the organizer, we charge Contest Pro only. Regional "Presented By" sold by us once there are live contests |

## Free forever
Map, search, filters, routes, browsing and starring houses, Help Center, tutorials, weekly email, voting, entering a home as a neighbor. Free search order is never changed by money except labelled Featured slots, which are capped.

## Paid offers (hypothesis prices)
| Offer | Buyer | What they get | Hypothesis price | State |
|---|---|---|---|---|
| Featured Event | Event organizers | Gold pin, top of list, season option | $5 / $10 / $15 | Built, Stripe on |
| Installer Partner | Installers | Featured profile, quote button, view and quote stats, verified badge | about $299 per season (range $199-$499) | Profile exists; no payment yet |
| Presenting Installer | One installer per city per season | Exclusive slot on contests and winner pages, opt-in leads | $300-$1,000 per city per season | Free-text field only; not exclusive |
| Contest Pro | Cities, HOAs, chambers | Sponsor logos and tiers, prize list, branded poster, exports | about $99 per season (range $79-$149) | Unbuilt |
| Presented By | Regional sponsors | Named presenting slot across a county's contests | unpriced | Unbuilt |

## What I need fixed before promoting anything (all small)
1. Webhook ignores refunds and disputes: a refunded event stays Featured (`functions/api/stripe-webhook.js`).
2. `/feature` is linked from nowhere except `add-event.html`, and it lacks the native-app guard (`public/feature.html`).
3. `/feature` shows both Stripe and the Cash App "email us" path. Pick Stripe.
4. Prices live in three places. Make `functions/_lib/featured.js` the single source.
5. Checkout never sets a customer email, so no receipts.
6. Apple 3.1.3(g) describes paid "boosts" in an app. Keep `/feature` and checkout hidden in the wrapper.
7. Privacy policy does not cover installer leads, Stripe order data or sponsor emails.
8. Add a test that contest, vote and results queries never reference `featured`, `plan`, `pro_until` or `entitlements`.

## 90-day plan
| When | Move |
|---|---|
| This week | Owner confirms a $5 test purchase works. Fix items 1-5 on a branch. Publish the Free Heart Promise and `/pricing`. Start the eight privacy-light counts |
| Weeks 2-4 (Nov) | Talk to five installers; ask what they pay per lead today. Link `/feature` from the site. Get 3-5 free contests live from `docs/contest-leads.md`. One hour with a CPA |
| December | Sell the first installer and sponsor seats by Stripe Payment Link. Review counts. Fix privacy policy |
| January | Decide on the generic orders layer and Contest Pro from the evidence. Price for 2027 |
| 2027 | Spring and 4th of July contests, Halloween and Christmas 2027 packages |

## Decisions that need the owner
1. Run one real $5 Featured purchase on your own event and confirm it appears and the receipt behaves. This is the cheapest check on the whole payment path.
2. Which entity and bank account receive the money, and sales-tax treatment of listings: one hour with a CPA.
3. A California attorney to read contest rules, sponsor terms and the privacy policy before any paid sponsor or lead product. Nothing on contest or lottery law was verified from primary sources.
4. Are you willing to sell to installers and sponsors personally (calls and email), or self-serve only? Marketing's plan assumes you will make about five personal conversations.
5. Approve building the small fixes (items 1-5 above) on a branch. I have not changed any code.

## What I did not do
No code, no migrations, no secrets, no outreach, nothing live. All figures from the three reports are second-hand: vendor pages for Stripe, Cloudflare, Resend, FTC and the California statutes could not be opened from this environment.
