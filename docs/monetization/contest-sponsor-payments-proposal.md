# Contest sponsor payments: how an organizer could collect a sponsor's money through the site

Written 2026-11-07. Status: **options (a), (b) and (c) are built (PR "Organizer-collected sponsors"); (d) Stripe Connect Standard stays a proposal; (e) Plaid is not recommended.** Not legal, tax or accounting advice: the CPA and attorney questions are listed under each option.

**Fee sources and their limits.** stripe.com and plaid.com could not be opened from the build session (network allowlist), so every number below comes from web search snippets on 2026-11-07 and from third-party summaries (websiteplanet, dodopayments, feeprobe, nerdwallet blog pages on Stripe fees; Plaid's billing docs page, withorb.com pricing atlas). Treat each as unconfirmed until someone reads https://stripe.com/pricing, https://docs.stripe.com/connect/pricing and https://plaid.com/pricing (Plaid does not publish rates: they appear when you apply for Production access).

## What is built now (phases 1 and 2)
- **(a) Records only.** The organizer records a sponsor who paid them: contact, company, website, level, amount, "payment collected by me" with date and method, an optional private receipt. It shows on the contest page (labelled "Sponsor") only after the organizer confirms payment (or in-kind) and ticks permission.
- **(b) Organizer's own payment link or instructions.** One https link (Venmo, PayPal, Stripe Payment Link, a city portal) and/or plain text, plus up to three display-only levels. Shown to sponsors on the invite page with the host and "SoCal Lights has not verified this payment link." Only for live, trusted organizers; Admin can hide it.
- **(c) Sponsor self-service intake.** A private, unguessable link `/s/<token>` (on/off/new). The sponsor, with no account, reads that the money goes to the organizer, sees the organizer's payment details and sends the form (Turnstile, rate limits, honeypot). It waits in the organizer's queue; nothing is public until the organizer marks payment received and approves.
- **Money never touches us.** No fees to us, no 1099-K for us, no money-transmitter question, no new Stripe objects.

## Options compared
| | (a) Records | (b) Payment link | (c) Intake link | (d) Stripe Connect Standard | (e) Plaid / bank login |
|---|---|---|---|---|---|
| What it does | Organizer keeps the books on the site | Sponsor is sent to the organizer's own payment page | Sponsor submits their own details and logo | Organizer connects their own Stripe account; the sponsor pays through our page, funds go straight to the organizer | We link the organizer's or sponsor's bank account and move money by ACH |
| Build effort | done | done | done | 2 to 3 weeks: OAuth connect, Checkout Sessions on the connected account, webhooks for connected accounts, refunds, Admin view, tests | 4+ weeks and ongoing: Link, Auth, Transfer, returns handling, security review |
| Fees (unconfirmed) | none | none to us; the organizer's own processor fees | none | Card about 2.9% + $0.30 paid by the organizer's Stripe account; ACH Direct Debit about 0.8% capped at $5 (+ about $1.50 instant bank verification, unconfirmed); optional platform fee only if we add one; Connect Standard has no per-account fee from our side in the snippets found | Plaid: per connected account, one time (reported $1.50 to $2.00 on pay-as-you-go, unofficial) plus Transfer/ACH rail fees |
| We hold funds? | no | no | no | no (Standard: funds never touch us) | possibly (Transfer) |
| Compliance | privacy only | we show a link we did not verify: lookalike and scam risk | personal data of sponsors | KYC/KYB is done by Stripe for the organizer; we need a terms update; 1099-K is issued to the organizer by Stripe, not us; sales tax and charitable-solicitation questions for the CPA | money transmitter and bank-partner questions; heavy |
| Main risk | organizer misreports | phishing links | spam submissions | a city cannot use a Stripe account without procurement approval; disputes land on the organizer | cost and liability far above the revenue |

## Compliance notes (for the CPA and attorney)
- **Money-transmitter risk** appears the moment we receive and pass on sponsor money. Standard Connect avoids it because the charge is created on the organizer's own account; Express or Custom (where we create the account) would need review. Never use destination charges on our account for sponsor money.
- **KYC/KYB and 1099-K.** With Standard Connect Stripe verifies each organizer and reports to them. Ask the CPA whether any platform fee we add is taxable income and whether it needs sales tax (California generally does not tax services; confirm).
- **City governments.** A city often cannot take a card payment on a third-party platform without procurement approval, and may treat a sponsor's payment as a donation or sponsorship that needs its own agreement and portal. For cities, (b) pointing to the city's own portal, plus a short sponsorship agreement the city already uses, is the right answer. We should never ask a city to connect a bank account to us.
- **Sponsor protection.** Sponsors should know the money goes to the organizer, who is not SoCal Lights. The invite page says so, and says we have not verified the payment link.

## Recommendation and phases
1. **Phase 1 and 2 (done):** (a), (b) and (c). Measure for one season: invite links turned on, sponsor requests, approvals, and how many organizers add a payment link. Watch Admin for hidden links and abuse (the host of each saved payment link is logged to the ops log).
2. **Phase 3 (only if organizers ask for it and at least 5 sponsor payments a season would use it):** Stripe Connect **Standard**, card plus ACH Direct Debit, no platform fee at first. Build only after the CPA and attorney review above, and keep a city-portal route for governments.
3. **Never:** holding sponsor funds ourselves, Plaid or any direct bank-login product, or Express/Custom accounts.

## Decision table
| Decision | Recommended | Needs from the owner |
|---|---|---|
| Keep sponsor money off the site this season | Yes (done) | nothing |
| Build Stripe Connect Standard | Wait for demand | OK after a season of data |
| Charge a platform fee on sponsor payments | No (not at first) | CPA answer on tax |
| Plaid or bank login | No | none |
| City sponsors | Point to the city's own portal and agreement | attorney review of a one-page sponsorship agreement |
