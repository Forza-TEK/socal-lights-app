# Project: Paid services, free heart

_Started 2026-11-04. Supervising CEO: Claude (main session). Owner / board: Rey, Forza-TEK._

## Mission
Earn revenue from SoCalLights.app without making the free map worse.

## The free-heart promise (non-negotiable)
These stay free for everyone, always: finding events and lights on the map, search, filters, routes, browsing and starring homes, the Help Center, voting in contests, entering a home in a contest.

Hard lines on money:
1. No paid votes, no entry fees, no paid ballot position. Payment never affects who wins.
2. Paid placements are always labelled ("Featured", "Presented by").
3. Paid features are web-only and hidden in the native apps (Apple in-app purchase rules).
4. No invented events, numbers or testimonials.

## Starting position (what already exists)
Found in the repo on 2026-11-04. See `docs/monetization.md`, `docs/monetization-analysis.md`, `docs/contest-business-model.md`, `docs/stripe-setup.md`.
- Featured events at $5 / $10 / $15 through Stripe Checkout and a webhook. Automatic only once the two Stripe secrets are set (unknown if they are).
- Tip jar (Cash App), Amazon Associates tag, ticket-affiliate plumbing (22 of 1,302 events link to a ticket seller).
- Installer profiles, claims, quote requests, manage page. Not charged yet.
- Contest platform (hidden, sign-in secrets not set). No paid tier yet.
- No traffic or usage numbers in the repo. Prices below are hypotheses until we measure one season.

## Organization
| Role | Who | Output |
|---|---|---|
| CEO / supervisor | main session | this plan, final strategy, decisions needing the owner, integration |
| Finance & pricing | sub-agent | `docs/monetization/finance-pricing.md` |
| Digital monetization | sub-agent | `docs/monetization/digital-monetization.md` |
| Product & marketing | sub-agent | `docs/monetization/product-marketing.md` |
| Board (owner) | Rey | approves spending, secrets, legal review, anything live |

Operating rules for the team: each reports to the CEO with sources, labels guesses as hypotheses, and edits only its own file. Nothing goes live, no secrets are set and no payment code ships without owner approval.

## Project list

### Phase 0: Mobilize (today)
| # | Task | Owner | Status |
|---|---|---|---|
| 0.1 | Read repo docs and code for existing monetization | CEO | done |
| 0.2 | Write charter and project list | CEO | done |
| 0.3 | Brief and dispatch the three department heads | CEO | done |

### Phase 1: Research and reports
| # | Task | Owner | Status |
|---|---|---|---|
| 1.1 | CEO playbook research: how successful founders monetize a small consumer product | Product/Marketing + CEO | done |
| 1.2 | Fees, costs, price points, scenarios, tax/refund questions | Finance | done |
| 1.3 | Code audit, paid product catalog, collection architecture, free/paid boundary | Digital Monetization | done |
| 1.4 | Feature ranking by persona, positioning, partnerships, 30/60/90 plan | Product/Marketing | done |

### Phase 2: Synthesis (CEO)
| # | Task | Owner | Status |
|---|---|---|---|
| 2.1 | Resolve conflicts between the three reports | CEO | done |
| 2.2 | One strategy: offers, prices, free/paid line, order of build | CEO | done (2.4 branch only) |
| 2.3 | Decisions list for the owner (see below) | CEO | done (2.4 branch only) |
| 2.4 | Update `docs/status.md`, commit to branch (no PR) | CEO | done |

### Phase 3: Build (only after owner approves the strategy; on a branch)
Order and scope are in `strategy.md` (small fixes first, then Payment Links, then the orders layer). Candidates, cheapest first:
1. Turn on Stripe for Featured (set secrets, one $5 test purchase). No new code.
2. Stripe Payment Links for the first installer and sponsor offers. No new code.
3. Shared orders / entitlements table so every product uses the same checkout and expiry.
4. Installer paid listing and exclusive presenting slot.
5. Contest Pro and sponsor tiers.
6. Pricing page, "Free forever" page, privacy-policy and terms updates.

### Phase 4: Go to market and measure
Outreach, privacy-friendly metrics, a decision review after the Christmas 2026 season. Details in the Product/Marketing report.

## Decisions the owner will have to make
To be finalized in 2.3. Already known:
- Are the Stripe secrets set in production, and is there a Stripe account?
- Who gets the money: personal, or a Forza-TEK entity with its own bank account? (Ask a CPA.)
- Attorney review of contest rules, sponsor terms and privacy before any paid sponsor or lead product.
- Whether to sell to installers and sponsors personally (calls) or only through self-serve checkout.

## Risks
- No traffic data: prices and revenue cannot be forecast yet.
- Seasonality: nearly all demand falls Halloween to New Year, and it is already November.
- Trust: the free map is the audience. Anything that looks like pay-to-win damages it.
- Legal: contest and lottery rules, sales tax, FTC disclosure, lead-sharing consent.
