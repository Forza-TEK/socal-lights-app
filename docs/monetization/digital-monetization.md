# Digital monetization: how money is collected and how paid features are enforced

Author: Digital Monetization lead, 2026-11-04. Not legal or financial advice. All prices are **hypotheses** unless a repo file or cited source says otherwise. The repo has no traffic numbers, so there are no revenue forecasts here. Production secrets were not reachable, so anything that depends on them is marked UNKNOWN.

## Recommendations

1. **Verify and switch on Featured today.** Open `https://socallights.app/api/config` and check for `"featureCheckout":true` (it is `!!(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET)`, `functions/api/config.js`). If false, follow `docs/stripe-setup.md`. This needs no code. Do one real $5 test purchase on your own event and confirm the pin appears.
2. **Fix three small gaps in Featured before promoting it** (all S): add a discoverable `/feature` link and an in-app guard on the page, handle refunds in the webhook, and add Stripe Tax/receipt settings. Details in the audit.
3. **Add an `orders` + `entitlements` layer in D1, then sell everything else through the same Checkout + webhook path.** Do not build a new payment path per product. Today `feature_orders` is hard-wired to events.
4. **Sell the installer product against a booked job, not a click:** per-season listing, an exclusive "Presenting Installer" slot per city/county, and opt-in quote leads. Start with Stripe Payment Links plus a manual flag in admin, because the lead plumbing already exists (`installer_leads`, `contests.installer_*`). Validate price with five installers first (`docs/contest-business-model.md` already says this).
5. **Keep a hard separation in code between money and rankings.** Paid flags may touch only event/home *discovery lists* (labelled). They must never be read by anything under `functions/_lib/contests.js`, vote, or judging code. Add a test and a code-review rule for this.

## 1. Audit: revenue mechanisms in code today

| Mechanism | State | Where | Notes / gaps |
|---|---|---|---|
| Featured event, Stripe Checkout ($5 pin / $10 top / $15 season) | **Built; live status UNKNOWN** (needs `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`) | `functions/api/feature/checkout.js`, `functions/api/stripe-webhook.js`, `functions/_lib/featured.js`, `public/feature.html`, migrations `0062`, `0065` | Complete loop: Checkout, signature-verified webhook (5-minute tolerance), idempotent via `feature_orders.session_id`, expiry via `featured_until`, "Featured" badge (`app.js` ~line 835), list-first sorting for level 2 (`app.js` line 695-698). Prices are in `featured.js` *and* repeated in `feature.html` text and `NAMES`, so they can drift. |
| Featured via Cash App fallback | **Live** whenever `featureCheckout` is false | `public/site-config.js` `featurePay`, `feature.html` | Manual: customer pays, then emails the event link; owner adds a migration by hand. Not scalable and no receipt record in D1. |
| Featured on `/add-event` | Built; shows only when `featureCheckout` is true and not in-app | `public/add-event.html` lines 32, 58-68 | Handles paid-while-pending via `sub:<id>`. If an admin declines a paid submission, refund is manual (docs say so). |
| Tip jar (Cash App) | **Live** | `site-config.js` `donateUrl`; `app.js` line 1019 hides it in-app | Low and unpredictable. |
| Amazon Associates | **Live in config** (tag `socallightsap-20`) | `site-config.js` | Disclosure line appears automatically per `docs/monetization.md`. Associates' 3-sales-in-180-days rule is from the repo doc, not independently checked. |
| Ticket affiliates | **Unbuilt in effect** (`ticketAffiliates: {}`); plumbing only | `site-config.js`, `app.js` | Only 22 of 1,302 events link to a ticket seller (repo doc, 2026-10-28). Low priority. |
| Installer profiles | **Built, free** | `functions/installer/[slug].js`, `functions/_lib/installers.js`, `functions/api/installers/*`, migration `0140` | Claim flow, logo, manage page, views, homes list. No paid flag in the `installers` table (columns: id, slug, name, web, phone, area, blurb, email, status, created_at, plus later owner fields). |
| Installer quote leads | **Built, free, consent-gated** | `functions/api/installers/[slug]/quote.js`, table `installer_leads` (migration `0142`) | Signed-in + consent tick + 2 per day limit. Leads are emailed to the owner or `email`. No lead status, no billing, no Turnstile on this endpoint (relies on sign-in). |
| Contest presenting installer + "Get a quote" | **Built, free** (contest area is "branch work, not live yet" per `CLAUDE.md`) | `contests.installer_name/_email/_url` (migration `0139`), `functions/api/contests/[slug]/quote.js` | Free text fields set by the organizer, so it is not exclusive and not verified or paid. Lead email goes to the installer *and* the organizer (`contest_quote_sent`). |
| Contest sponsors (tiers presenting/gold/silver/prize, logo) | **Built, free** | `functions/api/contests/[slug]/sponsors.js`, `contest_sponsors` | Cap of 12 sponsors, logo under 600 KB. No paid gate: every contest gets everything. |
| Contest Pro / organizer subscription | **Unbuilt** | none | Only analysis in `docs/contest-business-model.md`. |
| Printables (poster, VOTE! yard sign) | **Built, free** | `public/printables.js` | Theme per season; print is client-side HTML/SVG. No branded/sponsor variant yet. |
| Display ads | Not used | | Correct for a map-first product. |

### Gaps and bugs seen in code

- **No webhook handling for refunds or disputes.** `stripe-webhook.js` ignores everything except the two checkout events. A refund in Stripe leaves the event featured. Needs `charge.refunded` / `charge.dispute.created` handling that shortens or clears `featured_until`.
- **No link to `/feature` anywhere in the app UI.** A search of `public/**/*.js,html` and `functions/` found `/feature` referenced only from `add-event.html` and the checkout redirect URLs. So even with Stripe on, organizers only find it through `/add-event` or a direct link. UNKNOWN whether other pages (static footers, emails) link to it.
- **`/feature` itself has no in-app guard.** The in-app check (`SoCalLightsApp` user agent) is in `app.js` and `add-event.html`, but `feature.html` has none. The Cash App fallback and Stripe buttons render if someone reaches the URL inside the wrapper. Risk is low (no link), but add the same guard.
- **Price duplicated in three places** (`featured.js`, `feature.html` text, `NAMES`). Drift risk.
- **Edge cache:** `/api/events` is cached 2 minutes at the edge and 60 seconds in browsers (`events.js`). A new paid pin can take up to about 3 minutes to appear. Fine, but tell buyers.
- **Webhook does not store the Stripe customer, payment intent or currency**, so refunds, receipts and reconciliation need extra lookups. `feature_orders` stores only session id, event, plan, amount, email.
- **Customer email may be blank** if Checkout is not asked to collect one for some payment methods (`customer_details.email` is read but `customer_email` is never set). UNKNOWN in practice.
- **Quote endpoint has no per-installer fee gate and no spam check beyond sign-in**, so once leads are sold, add Turnstile and duplicate-lead rules.
- `docs/monetization.md` says `0062_featured_events.sql`; the webhook handles `sub:` ids, so `0065` is also required for checkout. Both exist in `migrations/`.
- Surprise: `docs/monetization-analysis.md` lists the Amazon tag as live; confirmed in `site-config.js`, but whether Associates approval is still active is UNKNOWN.

## 2. Product catalog

Free forever, for every product below: the map, search, filters, routing, browsing and starring homes, voting, entering a home in a contest, viewing sponsor lines and installer profiles.

| # | Product | Buyer | They get | Billing | Enforcement | Effort |
|---|---|---|---|---|---|---|
| 1 | **Featured event** (exists) | Event organizers | Gold pin, "Featured" badge, optional top-of-list | One-time ($5/30d, $10/30d, $15 season: existing prices) | `events.featured` 0/1/2 + `featured_until`, read by `featuredLevel()` in `util.js`; always labelled | Exists; fix gaps above (S) |
| 2 | **Installer Listing** | Installers | Verified badge, logo and bigger profile card, priority in the "find an installer" list for a city, link and call buttons, lead inbox with status | Per season (hypothesis $99-$249); per-season fits the Halloween-to-New Year demand curve noted in `monetization-analysis.md` | `installers.plan` + `plan_until`; badge shown only while active; profile still visible and claimable for free | M |
| 3 | **Presenting Installer** (exclusive per city or county per season) | Installers | "Presented by" label on contest pages and city pages, "Get a quote" button, grand-prize provider credit, first call on opt-in leads | Per season, exclusivity is the product (hypothesis $300-$1,000, from `contest-business-model.md`; test with 5 installers) | `installer_slots(region, season, installer_id)` with `UNIQUE(region, season)`; contest/city pages read the slot instead of the free-text `contests.installer_*` | M |
| 4 | **Opt-in quote leads** | Installers (add-on or included in 2/3) | Name, email, phone and note from a user who ticked consent; lead inbox and CSV | Included in plans, or pay-per-lead later (no per-lead market price was found, so ask installers) | `installer_leads` plus `consent_text_version`, `lead_status`, routing to the slot owner only; no resale to anyone else | M (table exists) |
| 5 | **Contest Pro** | Cities, chambers, HOAs, schools | Sponsor tiers and logos beyond a basic limit, per-award prizes, branded poster/yard sign with sponsor strip, results export, extra judges, emailed results, rules template | Per contest per season (hypothesis $79-$149, `contest-business-model.md`) | `contests.pro_until`; gates only **presentation and tooling** (sponsor count, export, branding). Never entries, votes, order, counts or results | M |
| 6 | **Local sponsor slots** | Hardware, roofing, solar, real estate | Labelled "Sponsored by" line on a contest or city page (`/in/<city>`), logo, link | Per contest or per city per season; start with sponsor paying the organizer (no money through us), later Stripe with a platform share (hypothesis 10-20%) | `contest_sponsors` already holds data. Add `paid_order_id`/`approved` and a visible "Sponsor" label. City-page slot needs a new table | S-M |
| 7 | **Featured home boost** | Homeowners, installers | Gold ring and "Featured" tag on the map/list card for their home | One-time per season (hypothesis $5-$15, mirroring events) | `posts.featured_until` read only by `app.js` list/map code; **must not** appear in `contests.js` queries (entries use `ORDER BY entry_no`, line 105) | S (copy of events path) |
| 8 | **Yard-sign / poster pack** | Homeowners, organizers, installers | Print-ready PDF or high-res files with own name, QR, sponsor strip | One-time $ (hypothesis); basic printable stays free | Entitlement on order; reuse `public/printables.js` | S-M (reuses existing code) |
| 9 | **Season newsletter sponsor** | Local sponsors | One labelled sponsor block in the weekly lights email (`alert_subs`, migration `0134`) | Per send/season | Template slot in `functions/api/alerts/send.js`; subscribers consented only to lights emails, so confirm wording first | S, but legal review |
| 10 | **City / chamber white-label and data access** | Cities, chambers, tourism boards | Branded contest or city portal, embed, event data export | Invoice (Stripe Invoicing), annual | Manual entitlement; API keys in a table | L, validate demand first |

Low-effort extensions of existing code: 1 (fixes), 4 (table exists), 6 (table exists), 7 (copy of events path), 8 (`printables.js`), 9 (existing email job).

## 3. Collection architecture

Use **Stripe Checkout + webhook + an orders/entitlements table**, all on Pages Functions with `fetch` to the Stripe REST API (as `checkout.js` already does, no SDK or build step needed).

**Flow.** One endpoint `POST /api/checkout` takes `{ sku, subject_type, subject_id }`, validates ownership (signed-in user owns the installer/contest/post) and price from a server-side `PRODUCTS` map (extend `featured.js`), creates a Checkout Session with `client_reference_id = order_id` and `metadata`, and writes an `orders` row with `status='pending'`. `stripe-webhook.js` verifies the signature (existing `verifyStripeSignature`), upserts the order by session id (idempotent, as today), sets `paid`, and inserts or extends an `entitlements` row. Add `charge.refunded` and `checkout.session.expired`.

**Schema sketch (not a migration):**

```
orders(id PK, stripe_session_id UNIQUE, stripe_payment_intent, stripe_customer,
       user_id, email, sku, subject_type, subject_id, amount_cents, currency,
       status[pending|paid|refunded|failed], created_at, paid_at, refunded_at)
entitlements(id PK, order_id FK, subject_type[event|post|installer|contest|region],
       subject_id, sku, level, starts_on, ends_on, revoked_at)   -- INDEX(subject_type,subject_id,ends_on)
installer_slots(region, season, installer_id, order_id, UNIQUE(region,season))
installers: + plan, plan_until          contests: + pro_until
leads: installer_leads + consent_version, status, routed_to, source[profile|contest|slot]
```

Keep `events.featured/featured_until` as the denormalized read path (fast, already cached) and have the webhook write both the entitlement and that column. Read paths never join to Stripe or to `orders`.

**One-time per season versus subscription.** Default to **one-time per season**: demand is seasonal (repo analysis), refunds are simpler, no dunning. Offer **Stripe subscriptions + Customer Portal** only for installers who want to keep a listing year-round or for Contest Pro organizers who run several contests; Portal gives cancel, card update and invoices without code (Stripe docs, unverified here). Subscription state arrives through `customer.subscription.updated/deleted` and `invoice.paid` webhooks into `entitlements.ends_on`.

**Invoices for cities and chambers.** Stripe Invoicing (net-30, PO number) rather than card Checkout; the owner creates the invoice by hand, and an `invoice.paid` webhook sets the entitlement. No code needed for the first customer: set `ends_on` by an admin action.

**Payment Links for no-code starts.** Create one per SKU in the Stripe dashboard with a `client_reference_id` convention and a post-payment admin step. Webhook can't match a Payment Link to a subject without metadata, so for the first sales the owner checks the email and flips the flag in admin (this is exactly the Cash App flow today but with receipts and refunds).

**Refunds.** Do them in the Stripe dashboard; the webhook revokes the entitlement. Write a public refund policy (terms page change needed).

**Cloudflare constraints.** No cron beyond Actions/Pages; expiry is checked at read time (`ends_on`), as `featuredLevel()` does, so nothing needs to run. Keep Stripe secrets in Pages secrets (never committed). Add an admin "Orders" tab modeled on the existing admin tabs.

## 4. Free/paid boundary

**Free forever:** map, search, filters, routes, "My night", browsing and starring homes, event details, Help Center, voting, entering a home in a contest, basic contest creation (page, QR, voting, one prize line, basic printable), basic installer profile (claim, edit, logo, homes list), submitting an event or home, weekly email, all existing data on pages.

**Paid:** placement and visibility upgrades (labelled), installer verification/exclusivity/leads inbox, contest presentation tooling (sponsor tiers beyond basics, branding, exports), extra print packs, sponsor slots, invoiced portals.

**Technical guardrails:**
- Paid state is a column read at render time. No paid path may add a network request on map load; `featured*` columns already come in the one `/api/events` payload.
- Only the existing sort lead (`lead = (a,b) => b.f - a.f`) may use paid fields; keep it level-2 only and limited (cap the number of top slots per view, hypothesis: a few) so the free list is not drowned.
- Add a unit test: contest entry, vote, and results queries must not reference `featured`, `plan`, `pro_until`, or `entitlements`.
- Paid UI hidden when `IN_APP` (`/SoCalLightsApp/` user agent), plus server-side refusal: `/api/checkout` and `/feature` should reject requests whose user agent matches the wrapper.
- Stripe/checkout code lives only in `functions/api/*checkout*` and the `/feature` area; no Stripe script is loaded on the map page.
- The map stays cached (2 min edge) and public; paid data has no auth-only variants.

## 5. Build order

| Step | What | Effort |
|---|---|---|
| 0 | **First ship, no code:** verify `featureCheckout`; if off, set the two Stripe secrets (`docs/stripe-setup.md`). Create Stripe **Payment Links** for "Installer Listing (season)" and "Presenting Installer (city, season)" and a "Contest Pro" link; fulfil by hand and record in a spreadsheet. Sell to 5 installers and 3 organizers already on `docs/contest-leads.md`. | S, 0 code |
| 1 | Featured fixes: refund webhook, `/feature` link and in-app guard, collect email, single price source | S |
| 2 | `orders` + `entitlements` tables, generic `/api/checkout`, admin Orders tab | M |
| 3 | Installer plan flag, verified badge, lead status and inbox, Turnstile on quote | M |
| 4 | `installer_slots`, "Presented by" replacing free-text `contests.installer_*` | M |
| 5 | Contest Pro flag (sponsor tiers, branding, export) and labelled sponsor slots | M |
| 6 | Featured home boost and print packs | S-M |
| 7 | Subscriptions + Customer Portal; invoice flow for cities | M |
| 8 | Data/white-label | L (only if asked for) |

Measure first (from `docs/monetization-analysis.md`): outbound clicks, quote requests, checkout starts, contests and entries. Set final prices after one season of numbers.

## 6. Compliance and platform risks

- **Apple.** Guideline 3.1.1: apps that "unlock features or functionality" must use in-app purchase. 3.1.3(g) says "buying advertisements to display in the same app (such as sales of 'boosts' for posts in a social media app) must use in-app purchase", which describes Featured and the home boost directly. 3.1.1(a): entitlements for external links "are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps", but all other storefronts still prohibit them. The page I read shows no version date. 5.3.1/5.3.2: contests "must be sponsored by the developer of the app" and rules must say Apple is not a sponsor; `rules.js` item 13 already says so, but 5.3.1 is a tension for organizer-run contests inside the wrapper (flag for counsel). **Decision: keep every paid screen web-only and hidden in the wrapper**, even though US external links are allowed, because the apps ship to other storefronts and reviewers vary. Google Play's rules were **not checked**.
- **Contest law.** Cal. Bus. & Prof. Code 17539.1 restricts contests with direct or indirect consideration; a 2012 legal guide says violation is a misdemeanor under 17534; 17539.3 has a skill-contest carve-out that may be limited to in-person contests; a 2025 act amending 17539.1 may have changed things. I could not reach leginfo.ca.gov and could not confirm current text. **Attorney review required** before charging organizers or letting sponsors fund prizes. Keep: free entry, free voting, no purchase advantage, official rules posted. Selling Contest Pro to *organizers* is not an entry fee, but a lawyer should confirm and review sponsor terms.
- **FTC.** The 2023 revised Endorsement Guides (16 CFR Part 255) treat affiliate links as a material connection needing clear, conspicuous disclosure near the link (secondary sources only; the FTC site was not reachable here). So: "Featured", "Sponsored by", "Presented by" and "affiliate" labels on or beside every paid element, with plain wording ("We earn a commission if you buy through this link"), never only in the footer. Also 16 CFR Part 465 (reviews and testimonials, effective Oct 21, 2024, per a secondary source): do not publish invented testimonials for installers.
- **Privacy and lead sharing.** `public/privacy.html` line 52 covers contest quote requests (sent to the installer and the organizer; copy kept for the organizer). It does **not** yet cover: leads from installer profiles (`installers/[slug]/quote.js`), Stripe order data and retention, sponsor email blocks, or any installer using leads for their own marketing. The "We do not sell your information" line (line 26) must stay true: never sell or rent leads beyond the consented one-to-one routing, and describe routing to a *paid* exclusive installer plainly. Update privacy and terms (refunds, placement not a guarantee, installer claims are the installer's own) and have the consent text versioned in `installer_leads`. CCPA/CPRA applicability thresholds were not checked: flag for counsel.
- **Trust.** Featured events must remain real, public and verified (`docs/monetization.md` rule). Installer claims stay unverified unless the badge says verified; do not sell "verified" without a real check.

## Sources

- Apple App Review Guidelines (3.1.1, 3.1.1(a), 3.1.3, 5.3): https://developer.apple.com/app-store/review/guidelines/
- FTC endorsement guides summaries (secondary; FTC site unreachable from this session): https://www.infolawgroup.com/insights/2023/7/31/ftc-releases-updated-endorsement-guides-10-key-takeaways , https://manatt.com/insights/newsletters/advertising-law/an-in-depth-look-at-the-ftcs-updates-2 , https://everything-pr.com/ftc-affiliate-disclosure-rules
- Cal. B&P 17539.1 text: https://california.public.law/codes/business_and_professions_code_section_17539.1 ; 17539.3: https://codes.findlaw.com/ca/business-and-professions-code/bpc-sect-17539-3/ ; commentary on 17534: https://terms.law/2012/12/26/legal-guide-for-sweepstakes-contests-and-giveaways ; 2025 amendment (advocacy PDF, unverified): https://gamblingharm.org/wp-content/uploads/2025/09/California-Sweepstakes-Casino-Ban.pdf
- Repo docs: `docs/monetization.md`, `docs/monetization-analysis.md`, `docs/contest-business-model.md`, `docs/stripe-setup.md`, `docs/installers.md`, `docs/voting-standards.md`, `docs/app-store.md`; code as cited above.
- Stripe Checkout, Payment Links, Customer Portal, Invoicing docs (https://docs.stripe.com) were **not fetched**; behaviors described are from general knowledge and should be confirmed there.
