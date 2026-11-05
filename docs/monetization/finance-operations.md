# Finance operations package (2026-11-04)

Author: Finance and Pricing lead. **I am not a CPA. Everything below is "confirm with CPA" (or with the attorney where noted).** Facts come from `data-2026-11-04.md` (wins on any conflict), `finance-pricing.md`, `legal-research.md`, `strategy.md`, `outreach.md`, `public/feature.html`, `public/terms.html`, `public/privacy.html`, `functions/api/stripe-webhook.js` and `functions/_lib/featured.js`.

Pages I read this session (curl, 2026-11-04) are listed in "Sources". Anything I could not read is listed in "Not verified".

---

## 1. One-page CPA brief (hand this page over)

**Business.** SoCalLights.app is a free map of Southern California holiday lights and events (2,013 events, 266 city pages, 6 showcased homes, 1 installer, 1 contest). The site is operated by Forza-TEK (per `terms.html` and `privacy.html`). Entity type, state of formation and who owns it: **unknown to me, please advise.** Revenue to date: **$0** (Stripe live account: 0 paid charges, 0 refunds, 0 disputes; 1 checkout started, expired unpaid). Fixed costs: about $0 (Cloudflare free tier, Resend free tier; domain is the only known cost).

**Planned revenue lines** (all digital, no goods shipped):
1. Featured event listings, sold on the website through Stripe Checkout: $10 Featured pin (30 days), $15 Top of the list (30 days), $20 Whole season (until the event ends). The single source of truth is `PLANS` in `functions/_lib/featured.js` (prices in cents); the web pages read it from `/api/config`.
2. Affiliate commissions: Amazon Associates (status unknown) and ticket affiliates on 84 events (Eventbrite, Ticketmaster, Fever; none registered yet).
3. Later, hand-sold: installer subscriptions per season (about $299), contest organizer fees (about $99), sponsor placements ($150-$500, unpriced), possibly invoiced to cities and chambers.

**Customers.** Mostly California event organizers, but anyone can pay by card (Cash App Pay is also offered). Service delivered: a labelled, time-limited placement on a web page. Free giveaway: 5 free Featured placements planned (`outreach.md`).

**Where money lands today: unknown.** Open facts for the owner to answer before the meeting: (a) which bank account is connected to Stripe, and is it business or personal? (b) is the Stripe account registered under Forza-TEK's name and EIN, or under the owner's SSN? (c) is Forza-TEK a sole proprietorship, an LLC or a corporation? (d) who is the Amazon Associates payee (tax form on file)? (e) is there a California seller's permit or city business license today?

**The 12 sharpest questions** (most urgent first):
1. **Entity and bank account.** Should Forza-TEK (or a new LLC) be the Stripe account holder, with a dedicated business bank account, before the first live dollar? What is the cost and timing?
2. **Sales tax on listing fees.** Is a paid Featured listing (advertising placement on our own site) subject to California sales or use tax? The regulations the legal analyst found (CDTFA Reg. 1540(b)(1)(E)-(F), Reg. 1501) treat website design/hosting and ad-placement fees as non-taxable services, but they concern agencies, not a site selling its own ad space. Analogy only; no rule found for our case.
3. **Seller's permit.** If listings are non-taxable services, do we still need a CDTFA seller's permit (for any taxable sale, for affiliate or digital items, or for registration "just in case")? Does registering create obligations if we sell nothing taxable?
4. **Out-of-state and foreign payers.** Anyone can pay. Do we have any sales-tax or nexus exposure for non-California buyers (economic nexus thresholds)?
5. **Stripe Tax: yes or no?** Stripe lists Tax at 0.5% per transaction "where you're registered to collect taxes". Not worth it unless Q2 or Q3 says "taxable".
6. **Income reporting.** Stripe 1099-K (IRS says $20,000 and 200 transactions; Stripe may send lower), affiliate income (Amazon and ticket networks issue 1099-NEC or 1099-MISC, possibly below the threshold), and our own obligation to issue 1099s if we pay anyone (contest prizes of $600 or more, per legal-research.md Q5).
7. **Comped (free) placements.** How do we record 5 free Featured placements (revenue at $0, marketing expense, or nothing)? Is there any tax effect? See section 5.
8. **Deductible costs.** Domain, Cloudflare/Resend if they ever go paid, Stripe fees, CPA fees, home-office or equipment, mileage for site visits, app-store fees. What documentation does each need?
9. **Estimated taxes.** At what profit level do federal and California quarterly estimates start, and are they needed this tax year at $0 to $300 of revenue?
10. **Refunds, disputes and the Stripe fee.** Books treatment: Stripe keeps the processing fee on refunds (docs.stripe.com/refunds), and a dispute costs $15 or more. Net vs gross revenue presentation, and a refund reserve?
11. **LLC costs (if an LLC).** California LLC annual tax is $800 per FTB; the first-year exemption on FTB's page covers only LLCs formed 2021 through 2023, so I believe it does not apply now. LLC fee applies above $250,000 gross California income. Statement of Information and filing fees: could not confirm. Is an LLC worth it at under $1,000 revenue?
12. **Local business license.** Does the owner's city (home-based online business) require a business tax certificate, and is Forza-TEK's address a home address?

**What I verified (official pages):** Stripe card price 2.9% + 30 cents; Stripe does not return processing fees on refunds; Stripe dispute fees; Stripe Tax 0.5%; California LLC $800 annual tax and $250,000 fee threshold; IRS 1099-K threshold $20,000 and more than 200 transactions. **Could not confirm:** California seller's permit rules for advertising services (CDTFA pages 404 or did not state it); 1099-NEC/MISC current threshold; SOS LLC filing and Statement of Information fees; city license rules.

---

## 2. Bookkeeping setup (minimal)

**Chart of categories.**
- Income: Featured listings; Affiliate commissions (Amazon; ticket partners, one line each); Future: installer subscriptions; contest organizer fees; sponsorships; Refunds and disputes (contra-income, negative); Comped placements (memo only, $0).
- Cost of revenue: Stripe processing fees; Stripe dispute fees.
- Operating expenses: Domain; Hosting and infrastructure (Cloudflare, Resend, map tiles); Software and subscriptions; Professional fees (CPA, attorney); Licenses and filings (LLC tax, SOS, city); Marketing (including comped placements at $0 for now); Other.
- Balance sheet: Stripe balance (pending and available); Business bank; Owner contributions and draws; Sales tax payable (only if the CPA says so).

**Monthly Stripe export (do on the 1st-3rd, for the prior month).** Dashboard: Reports, then Balance, download "Balance change from activity" (itemized: one row per balance transaction with gross, fee, net, type) and the Payouts reconciliation report (payouts matched to transactions). Also export Payments (all) with metadata (event_id, plan). Save the CSVs as `YYYY-MM_stripe_balance.csv`, `_payouts.csv`, `_payments.csv`. If the Reports menu differs, the Balance transactions list can be exported by date range.

**Fee tracking.** Fee on each charge is 2.9% x amount + $0.30 (so $10 nets $9.41; $15 nets $14.27; $20 nets $19.12). Use the `fee` column from the balance export as the source of truth, never the formula. Dispute fees appear as separate rows of type "dispute fee" or "adjustment".

**Monthly spreadsheet layout (one tab per month, plus a Summary tab).**
Columns: A Date; B Stripe ID (charge/refund/dispute/payout); C Type (charge, refund, dispute, dispute_fee, payout, other); D Customer or event; E Gross; F Stripe fee; G Net (=E-F, check against Stripe); H Category; I Order row in D1 (`feature_orders.session_id`); J Notes (comp, test, refund reason).
Summary formulas: Gross revenue =SUMIFS(E,C,"charge"); Refunds =SUMIFS(E,C,"refund"); Net revenue = gross - refunds; Fees =SUM(F); Disputes lost =SUMIFS(E,C,"dispute"); Net profit = net revenue - fees - disputes - expenses. Check cell: payouts total + ending Stripe balance - beginning balance = SUM(G). It must equal 0.

**Reconciliation checklist (monthly).**
1. Stripe balance transactions total = sum of Net in the sheet.
2. Every payout in Stripe matches one bank deposit (amount and date, allow 2-3 days).
3. Every paid charge has a `feature_orders` row with `applied=1`; every refund or dispute has `status` refunded or disputed or dispute_won (query D1; the owner or the CEO session can run it).
4. Every `stripe_events` webhook delivered (Stripe Dashboard, Webhooks, no failed deliveries).
5. Affiliate statements entered when paid (cash basis) and matched to deposits.
6. Receipts for each expense saved.
7. Open disputes list: due dates for evidence.

**Save for audits (keep at least 3 to 4 years; confirm retention period with the CPA).** Monthly Stripe CSVs; Stripe year-end 1099-K; bank statements; affiliate statements and tax forms (W-9); receipts and invoices for expenses; the refund and comp log (section 5); screenshots of the live `/feature` page and the terms effective on each date (customers pay under the wording then in force); the CPA's written answers to the 12 questions; formation documents and EIN letter.

---

## 3. Refund, dispute and cancellation policy

**What the code actually does** (`functions/api/stripe-webhook.js`, `functions/_lib/featured.js`):
- A **full refund** (`charge.refunded` with `refunded=true`) switches the placement off automatically (`revokePlan`, status `refunded`), but only if the event still holds exactly what that order wrote; a hand-extended or hand-comped placement is not wiped (reported as "placement differs", needs a manual check).
- A **partial refund** does not revoke; it marks the order `held` for the admin.
- A **dispute opened** (`charge.dispute.created`) switches the placement off immediately (status `disputed`). If the dispute is **lost** it stays off; if **won**, the order becomes `dispute_won` and **nothing is restored automatically** ("re-grant by hand").
- Nothing in the code refunds money by itself, moves a placement to another event, or prorates. Those are manual (Stripe Dashboard plus an admin edit).

**The existing FAQ answer is not fully consistent with the code.** It promises that if an event is cancelled "we will move your placement to another event of yours or refund the unused time". Moving is possible only by hand and "unused time" has no mechanism. Not wrong if the owner honors it by hand, but it is a promise.

**Proposed replacement (about 100 words):**

> **Can I get a refund?** Yes, in these cases. If we cannot feature your event, we refund you in full. If you ask within 7 days of paying and your placement has been live for less than 3 days, we refund you in full. If your event is cancelled, email us and we will refund the unused days or move the placement to another of your events. A refund switches your Featured placement off, and so does a payment dispute. Please contact us before disputing a charge with your bank. Stripe keeps its card processing fee on refunds, but you receive the full amount you paid back.

(Last sentence: only say it if the owner decides to absorb the fee; see below.)

**Owner decisions (each flagged, with my recommendation):**
1. **Refund window.** Recommend 7 days from payment, and only while the placement has run fewer than 3 days. Why: at $10-$15 the dollars are tiny, goodwill matters more with five early organizers, and a short window caps abuse.
2. **After it has run.** Recommend no refund once more than 3 days have run, except for event cancellation (below). Why: the service has been delivered; a clear cutoff avoids case-by-case arguments.
3. **Event cancelled or declined.** Recommend full refund if we decline or cannot verify; prorated refund (or a move to another event) if the organizer cancels. Why: it is the fair outcome and matches the current FAQ; the cost is a manual task.
4. **Who eats the Stripe fee.** Verified: Stripe does not return the processing fee on refunds (docs.stripe.com/refunds: "Stripe's processing fees from the original transaction aren't returned"). Recommend refunding the full price and absorbing the fee (about $0.59 on $10, $0.74 on $15), because deducting it looks petty at this size. Reassess if refunds exceed 10 percent of orders.
5. **Disputes.** Recommend responding to every dispute with evidence (order record, event page screenshot, email receipt) when the amount and fee make sense; at $10-$15 a $15 fee often exceeds the sale, so **recommend accepting disputes under $20** unless it looks like fraud. Disputes revoke the placement; restore only if won (manual).
6. **Cash App Pay refunds** follow the same rule; strategy.md says that path is to be retired.

---

## 4. First-30-days cash view

**Revenue: $0** (most likely outcome per finance-pricing.md; plan range $0-$300 this season).

| Item | Monthly cost | Note |
|---|---|---|
| Domain (socallights.app) | unknown; typically about $1-$2/month averaged (annual renewal, owner to confirm price and date) | Only known real cost |
| Cloudflare Pages, D1, R2 | $0 | Free tier; about 6% of the Functions cap in use |
| Resend email | $0 | Free: 3,000/month, 100/day |
| Stripe | $0 fixed | Fees only on sales; no monthly fee ("No setup fees, monthly fees, or hidden fees" on stripe.com/pricing) |
| Geoapify / map tiles | $0 | Free tier with attribution |
| Owner's Stage 1 test purchase | about $0.44 to $0.59 | A $10 test refunded still loses the fixed fee |
| CPA consultation (planned) | one-time, price unknown | The only likely cash spend; owner to get a quote |
| Total expected cash out | about $2 to $10 plus the CPA hour | |

**Thresholds that trigger spending** (from `strategy.md` and `finance-pricing.md`; nothing else justifies spending):

| Spend | Trigger |
|---|---|
| Any hosting/plan upgrade | Functions above 60,000 requests/day, or D1 reads above 3M/day, or Resend above 80 emails/day, on 3 days in one week |
| Stripe Tax or tax tooling | CPA says listings are taxable, or gross passes the CPA's threshold |
| Installer self-serve build | 5 verified installers (now 1), 25 `installer_leads` in 30 days (now 0), 2 of 5 interviewed installers say yes to $199+ |
| Contest Pro / sponsor build | 3 live contests (now 1), 100 votes (now 0), 3 sponsor inquiries |
| Presented By | 1,000 real visits a day for 14 days |
| Homeowner boost | 100 approved homes (now 6) |
| Audience claim on `/feature` | 30 days of `site_hits` averaging 50 humans/day |

**Stop-loss rule (my recommendation, owner to decide).** Total cash spent on the business before the first sale may not exceed $100 without a written gate being met; no recurring (monthly) cost above $20 is added until trailing 60-day net revenue covers it twice; and if the Featured path produces fewer than 1 paid order by 2027-01-31 despite 10 organizer conversations, stop all paid-feature work and keep only free product and affiliate links.

---

## 5. Free Featured giveaway (5 comped placements)

All of this is "confirm with CPA".

- **Is a comped placement revenue?** My reading: no. No money is received and no sales price is invoiced, so there is nothing to report as income. Barter or value-for-value (the organizer gives permission to quote click counts) could be argued as non-cash consideration, but with no stated value and no real trade it is hardly worth tracking beyond a memo line. Ask the CPA once; expect "not income at this scale; keep records".
- **Do not run it through Stripe.** No $0 checkout; there is no order row from Stripe and no charge to reconcile. Apply the placement by hand (the admin edit that sets `featured` and `featured_until`), which the revoke code deliberately leaves untouched.
- **How to record.** A "Comps" tab in the books: date, organizer, event ID, plan equivalent (e.g. "30 days, list value $10"), end date, permission to quote clicks (yes/no, saved email), and a note "no payment". Count them against the list value but book no revenue and no expense. The memo total (5 x $10 = $50 at most) tells the owner the "marketing cost" in opportunity terms.
- **Tax effect.** None expected: no revenue, no deduction. No 1099 obligations (nothing paid to anyone). Ask the CPA to confirm.
- **Label rule.** legal-research.md section 3 and `outreach.md` ("Featured placements given free must still carry the Featured label"): a comped placement is still a promotional placement, so it carries the same label as a paid one. The FTC Native Advertising Guide says "Featured" and "Promoted" are not on its list of terms clearly understood, and prefers "Ad", "Advertisement" or "Sponsored"; the attorney should decide the label (legal Q9). A free placement given in exchange for quoting click counts is arguably a material connection if the organizer later endorses the site, so ask the organizer to disclose it if they do.
- **Terms.** Say in writing (an email is fine) that it is a limited 30-day trial, the placement may be removed, no refund question arises, and what we may quote (click counts only). Do not quote traffic numbers we cannot back up.
- **Limit.** Stay at 5. Anything more begins to look like a pricing decision, not a test.

---

## Sources (read this session via curl, 2026-11-04)

- Stripe pricing: https://stripe.com/pricing (2.9% + 30 cents domestic cards; no monthly fees; dispute received $15; dispute countered $15 returned on a won dispute; dispute appealed $15; Tax 0.5% per transaction where registered; FAQ: no fee for issuing refunds except bank transfers; original fees not returned)
- Stripe refunds: https://docs.stripe.com/refunds ("Stripe's processing fees from the original transaction aren't returned.")
- Stripe disputes: https://docs.stripe.com/disputes
- FTB LLC: https://www.ftb.ca.gov/file/business/types/limited-liability-company/index.html ($800 annual tax; fee above $250,000; first-year exemption listed only for 2021-2023 formations)
- IRS 1099-K: https://www.irs.gov/businesses/understanding-your-form-1099-k ($20,000 and more than 200 transactions; all income reportable regardless)
- IRS 1099-NEC: https://www.irs.gov/forms-pubs/about-form-1099-nec (threshold not stated on that page)
- CDTFA digital products: https://cdtfa.ca.gov/industry/retailers-and-purchasers-of-digital-products/ (no statement on advertising placement)
- CDTFA regulations (from legal-research.md): https://www.cdtfa.ca.gov/lawguides/vol1/sutr/1540.html, https://www.cdtfa.ca.gov/lawguides/vol1/sutr/1501.html
- SOS forms and fees: https://www.sos.ca.gov/business-programs/business-entities/forms (fees not extracted)

## Not verified

- California seller's permit requirements for a service that sells ad/listing placement (cdtfa.ca.gov permit and FAQ URLs returned 404; no regulation on a site's own ad space).
- Current 1099-NEC / 1099-MISC reporting threshold (not stated on the IRS pages fetched; I believe it changed for 2026 payments but did not confirm).
- Stripe Tax pricing page (docs.stripe.com/tax/pricing 404); only the 0.5% line on stripe.com/pricing.
- Whether Stripe's "dispute received" fee is returned on a won dispute (the page says only the "countered" fee is).
- SOS LLC filing fee and Statement of Information fee; any city business-license rules; Delaware/Wyoming alternatives.
- The owner's real facts: entity type, bank account, Stripe account holder, Amazon Associates status, domain renewal price.
