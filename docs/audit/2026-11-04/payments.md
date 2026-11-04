# Payments and revenue-integrity audit (2026-11-04)

Scope: read-only. Repo `main` at adb35b3, live site, Stripe (restricted live key via proxy, GET only), D1 (SELECT only). No payment, write or POST was made.

## Summary

The Featured payment path is well built: signature check with tolerance and constant-time compare, one order per Checkout session, an `applied` flag that is the real idempotency guard, retryable 500s that leave the Stripe event unrecorded, a guarded revoke that refuses to wipe hand-set placements, and server-only prices. Live state matches the docs: one enabled webhook with exactly the six handled events, no products or prices, 0 charges, 0 refunds, 0 disputes, 1 expired $5 checkout. D1 is empty of money data (0 orders, 0 `stripe_events`, 0 claims, 0 submissions, 0 featured events). **The webhook has never received a real paid event**, so every finding below is from code reading, not production behaviour.

The weaknesses are operational, not cryptographic: nothing tells the owner when a paid order needs a human (declined paid submission, partial refund, dispute won, "placement differs", stuck webhook), there is no orders or refund view, and there are zero automated tests for money code. A few lifecycle edges (unpublish then republish, overlapping orders, extended event dates) silently cost a paying customer their placement.

## Ranked findings

| ID | Sev | Area | Evidence | Impact | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| P1 | High | Tests | `git ls-files` shows no test or spec for `functions/` (only Android boilerplate). `package.json` has no `test` script; workflows only validate migrations. | First real payment is also the first test. A regression in `applyPlan`, `revokePlan` or signature code ships unnoticed. | Add the signed-payload suite in section "Test plan" and run it in CI (node:test, in-memory D1 stub or `wrangler d1 --local`). | M |
| P2 | High | Declined paid submission | `admin/submissions/[id].js` decline only sets `status='declined'` and emails the submitter. Order stays `paid, applied=0, event_id='sub:..'` forever. Docs say "refund it in Stripe" (stripe-setup.md). The "Paid Featured" fact is shown on the card (admin.js:233), the list query returns `paid_plans` for any status, but nothing blocks, warns or lists it after decline. The decline email has no refund wording. | Customer pays, is declined, no refund until they complain. Chargeback risk ($15 fee exceeds the sale). Also account deletion blanks `contact_email`, orphaning a paid `sub:` order. | On decline: if a paid unapplied order exists, show a modal "refund $X in Stripe first", mark the order `needs_refund`, and add that text to the decline email. Add an "Orders needing action" list (P4). | S |
| P3 | High | Overlapping orders and refund | `revokePlan` clears the event only if `featured` and `featured_until` equal that order's `applied_*`. Order 2 (extension) overwrites the event values. Refunding order 1 then returns `manual`, placement stays (customer keeps refunded time, only visible in the webhook JSON). Refunding or disputing order 2 wipes the whole placement, including time paid for by order 1. | Wrong outcome in both directions, silently. | On revoke, recompute from remaining paid, applied, unrefunded orders for the event (replay `applyPlan` over them) instead of all-or-nothing. At minimum write `manual_review=1` on the order. | M |
| P4 | High | Reconciliation | No admin view of `feature_orders`, refunds, held, disputed or `dispute_won` orders (grep: only `submissions/index.js` reads the table). `{manual:...}` outcomes are visible only in Stripe's delivery log. Admin edit UI has no featured field. finance-operations.md tells the owner to "ask the CEO session" to query D1. | Owner cannot reconcile Stripe to D1 monthly without SQL. Held and won-dispute orders are never surfaced. | Add `GET /api/admin/orders` and an Orders tab (status, applied, plan, amount, event, refunded_at, filter "needs action"), plus CSV export. Digest line in `admin-digest` for orders needing action. | M |
| P5 | Med | Unpublish then republish | `admin/submissions/[id].js` `unpublish` DELETEs the event; republish upserts a new row and applies only orders with `applied=0` under `sub:<id>`. The earlier order is already `applied=1` and its `event_id` is the real id. A later refund hits a missing or fresh row (`changes=0` returns `manual`). | A paid, applied placement vanishes after an admin unpublish and returns nothing. Also admin `DELETE /api/admin/events/<id>` and account deletion of a contest owner (`DELETE FROM events`) have no paid-order check. | Block or warn on delete/unpublish when `feature_orders` has applied orders for the id; on republish reapply applied, unrefunded orders still within `applied_until`. | S |
| P6 | Med | Season plan edges | `applyPlan`: season `until = end_date` if `>= today`. `end_date` is NOT NULL (migration 0001), so null cannot occur. Checkout rejects only `end_date < today`, so an event ending today passes and a webhook arriving after midnight gives `until=today` (a $20 plan lasting hours). Sweep upserts never touch `featured_until`, so if a sweep later extends the end date, "until your event ends" ends early. D1: 0 long events (>120 days) today. | Customer promised "until your event ends" gets less. | Require `end_date >= today + 1` for season; for season orders store `featured_until=NULL` meaning "follows end_date" (featuredLevel already treats a null until as no expiry, then also test `end_date`), or re-sync in upkeep. | S |
| P7 | Med | Cancelled or postponed after payment | `events.notice` cancelled/postponed does not touch `featured`. `featurable.js` marks it non-buyable, but the badge and top placement continue. FAQ promises "move your placement or refund the unused time" with no mechanism, no list of paid cancelled events. | Paid placement keeps promoting a cancelled event; refund promise is manual and untracked. | Query "featured AND notice IN (cancelled, postponed)" into the orders-needing-action list; hide level on cancelled events. | S |
| P8 | Med | Webhook ordering | `charge.refunded` or dispute arriving before the order row exists returns `{ignored:"no matching order"}` and the event id is stored as handled; the later `checkout.session.completed` then applies the placement for a refunded charge. | Rare (needs a refund within seconds or retry reordering) but permanent. | For unmatched refund/dispute, return 500 once (retry) or write a tombstone row keyed by payment_intent; in `paid()` check the PaymentIntent's refunded state via Stripe GET before applying. | S |
| P9 | Med | No alerting on failure | `catch` only `console.error`; 500 retries last up to ~3 days. Nothing emails the owner when an order is paid but `applied=0` (for example event deleted, submission missing). | Paid customer with no placement, found only when they email. | Daily check (admin digest) for `status='paid' AND applied=0 AND created_at < now-1h` excluding `sub:` waiting orders; send via existing `notify`. | S |
| P10 | Med | Card testing and checkout creation | `checkout.js`: needs session + ownership, same-origin, idempotent per (event, plan, user, 10 min). No per-user or per-IP cap on sessions; plan rotation multiplies sessions. Ownership can be self-granted by submitting an event (8/day/email, 5/h/IP, 40 auto-publish/day) with any non-disposable email (DISPOSABLE list has 18 domains). Cards are tested on Stripe's hosted page where Radar applies. | A bot can mint accounts, auto-publish events and use hosted checkout to test cards; dispute fees fall on the owner. | Cap sessions per user/day (for example 10) and per IP; require Turnstile on submit-event if not already; enable Radar rules (block high risk, 3DS) in Stripe; alert on 3+ failed payments per hour. | S |
| P11 | Med | Claim auto-approval | `trustOf`: `host === dom || host.endsWith("."+dom) || dom.endsWith("."+host)`. FREE_DOMAINS has 12 entries (missing ymail, gmx, mail.com, zoho, fastmail, pm.me, hey.com, comcast, sbcglobal, att, cox, verizon, ...). AGGREGATORS (21 names) lacks stubhub, axs, seetickets, universe, dice, eventeny, ticketweb, eventeny, wix/squarespace/wordpress/github.io/linktr.ee style shared hosts. Any `@city.gov` or `@university.edu` address auto-approves for every event whose link is on that domain (D1: 365 events link .gov/.edu/disney). | Claim then pay for an event that is not theirs: low harm (they pay, no edit rights), but a free-mail alias or shared-host owner could get a "domain" approval, and it undermines "only the organizer". | Expand both lists; treat public suffixes and shared-host domains as non-matching; for institution domains (.gov/.edu/city) require admin approval or a path-level check; log `method='domain'` approvals in a weekly review list. | S |
| P12 | Med | Receipts, refund terms | Stripe "Successful payments" email toggle is not readable by API (unverified). `terms.html` has no refund or Featured terms (grep: none); only the FAQ in `feature.html`/`pricing.html`. `receipt_email` is passed, but test-mode and restricted-key checks cannot prove delivery. | Consumer-law and dispute posture rests on one FAQ line that promises a refund mechanism that does not exist (see P7). | Verify toggle in Dashboard; add a Featured terms and refund section to `terms.html` (use proposed text in finance-operations.md section 3); keep wording to what code does. | S |
| P13 | Med | App wrapper affiliate links | `syncShopTab()` has no `IN_APP` guard, so the Shop tab (Amazon `tag=socallightsap-20`, `rel="sponsored noopener"`) shows inside the Android/iOS wrapper. affiliate-plan.md line 85 itself flags Amazon app-context rules as unverified. Checkout and tips are correctly hidden in-app. | Possible Associates Program violation; store review friction. | Hide the Shop tab and affiliate links when `IN_APP` until Amazon wording is confirmed. | S |
| P14 | Low | Account deletion | `account.js` blanks `event_submissions.contact_email` but leaves `feature_orders.user_id` and `.email`, and `event_claims.user_id/email`. | Defensible: financial records need retention, but `privacy.html` should say it; orphan claims keep an email after deletion. | Document retention in privacy; null `event_claims.email` on delete; keep orders (tax records). | S |
| P15 | Low | Price drift in docs | Code and `/api/config`: pin $10, top $15, season $20 (single source `PLANS`, HTML renders from `cfg.featurePlans`; verified live). Stale: `finance-operations.md` ("$10 (30 days), $15 (season)", "$5 pin plan", "$5 nets $4.56"), `digital-monetization.md` ("$5/$10/$15", "live $5 purchase"). The only expired checkout was $5. No hard-coded price text found in `feature.html`, `pricing.html`, `add-event.html` (only a free-form price example). | Planning docs mislead the owner; no customer-facing drift. | Mark those docs superseded or update. | S |
| P16 | Low | Promise vs sort | Promise "Listed first in your city, county and season". Real (app.js:707-710): `lead` puts `f===2` first in all three sorts, but only among places in the current map viewport and active filters; several level-2 events tie and sort by distance; no cap. Level 1 matches promise (pin ring, badge in list and detail; no sort effect). `/api/events` is cached 60 s browser + 120 s edge, so "within a minute" is up to about 3 minutes. | Mostly honest; wording "city, county and season" overstates a viewport sort. | Say "listed first in your area of the map"; "within a few minutes". | S |
| P17 | Low | Duplicates | D1: 2,013 events, 2,010 distinct name+start; 3 near-duplicates. Orders key on event id, so a migration that deletes the duplicate that was paid for loses the placement. Admin DELETE has no guard (see P5). | Placement can be lost in a dedupe pass. | Add a validator rule: a migration may not DELETE an event id that has orders. | S |
| P18 | Info | Webhook amount check | `paid()` never compares `amount_total` or currency to `PLANS[plan].cents`. Safe today (price is set server-side at session creation and events are signed) but a plan price change between creation and payment, or a mispriced session, applies silently. | Reconciliation blind spot. | Store expected cents in metadata; flag mismatch as `held`. | S |

## Failure-mode trace (money paths)

- **New purchase:** `/api/feature/checkout` (ownership, end_date, idempotency key) then Stripe Checkout then `checkout.session.completed` then order insert then `applyPlan` then batch update. OK.
- **Extend and upgrade:** `applyPlan` adds 30 days on top of a running `featured_until` and takes max level; season never shortens. OK. Refund interaction: P3.
- **Pending `sub:` order:** order inserted, `held` until approval; approval applies all unapplied paid orders in one batch. Decline path: P2. Unpublish path: P5. Race (approve before webhook): webhook sees `event_id` and applies. OK.
- **Contest listing:** owner or staff of the contest passes `ownsEvent` (c). Owner account deletion deletes the contest's map event (P5).
- **Duplicates and retries:** `stripe_events` precheck plus `applied=0` guarded batch means concurrent redelivery cannot double-extend. OK.
- **Async payment:** `completed` with unpaid returns `waiting`; `async_payment_succeeded` applies. `async_payment_failed` is not subscribed (no state change needed).
- **Refunds:** full revokes if exact match; partial marks `held` (no admin list, P4); partial then full works.
- **Disputes:** created revokes immediately; lost stays revoked; won becomes `dispute_won` and is not restored (manual, no list).
- **Expired checkout:** recorded only. One live example exists (the $5 expired session).
- **Stripe outage at checkout:** fetch failure or non-OK returns 502 with a friendly message; nothing written. OK. Outage on retrieving a dispute's charge returns 502 so Stripe retries. OK.
- **Event renamed:** no effect (id-keyed); Stripe line item keeps the old name, harmless.
- **Hand-comped vs revoke:** comp is left alone by design; collision only if comp values exactly equal an order's applied values (negligible).

## Fraud and abuse

- Owner-only bypass through submission email: `submit-event.js` forces `email = user.email` (signed-in, never typed), and checkout compares `normEmail` of both. Spoofing by typing another address is not possible on this path. Residual: `normEmail` strips `+tags` for every domain (not only Gmail), so `a+x@corp.com` equals `a@corp.com` (acceptable, intended). Admin edit can rewrite `contact_email` (admin-only, logged).
- Claim abuse: limits 5 pending and 10/day per user are OK; auto-approval rules need hardening (P11).
- Self-refund loops: each refund costs the owner the Stripe fee (about $0.59 on $10) and revokes the placement; no automatic refunds exist, so only owner-approved. Chargebacks: revoked at once, but $15 fee each; policy proposal exists in finance-operations.md.
- Checkout probing: unknown or someone else's submission returns the same 404; unowned event returns 403. Good.

## Affiliate and Amazon

- Rendering: Shop tab (`app.js:724`) carries "As an Amazon Associate we earn from qualifying purchases" beneath the grid; the support box shows "Some links are affiliate links" (line 899); `privacy.html:66` repeats it; links use `rel="sponsored noopener"`; no affiliate links in emails or offline (grep of `functions` found none). `ticketAffiliates` is empty, so no ticket affiliate links render today; when filled, the event-info link gets `sponsored` but the disclosure appears only in the support box, not next to the link (FTC "clear and conspicuous, near the link" gap). The Amazon-required sentence is not shown per card; affiliate-plan.md already notes this. App wrapper: P13. `amazonTag` is public by design.

## Stripe read-only checks (compare with stripe-setup.md)

- Webhook: 1 endpoint, `https://socallights.app/api/stripe-webhook`, status enabled, live, API version 2025-06-30.basil. Events: exactly `charge.dispute.closed`, `charge.dispute.created`, `charge.refunded`, `checkout.session.async_payment_succeeded`, `checkout.session.completed`, `checkout.session.expired` = the six handled and documented. No drift.
- Recent events: 2 (one `checkout.session.expired`, one `payment_intent.canceled`), `pending_webhooks` 0 (no failed deliveries). Note the `expired` event was delivered but `stripe_events` has 0 rows, so **the webhook probably did not record it**: either delivery predates the secret or the DB write path is untested. Worth a real check (see unverified).
- Counts: checkout sessions 1 (expired, $5, unpaid); charges 0; refunds 0; disputes 0; products 0; prices 0 (as designed: inline `price_data`). One older canceled PaymentIntent for $100 (created 2025-07-15, before this project's checkout), unexplained.
- Balance: 0 available, 0 pending.
- Not readable: account settings, payment-method configuration (Cash App Pay on/off), customer-email receipts. The key lacks those permissions (Stripe returned permission-denied).

## D1 read-only checks

`feature_orders` 0 rows (schema has `idx_feature_orders_pi`, `idx_feature_orders_user`); `stripe_events` 0; `event_claims` 0; `event_submissions` 0; events with `featured>0` 0 and with `featured_until` 0 (all 2,013 rows `featured=0`); no orphans (nothing to orphan); 1 contest; 769 past events. Consistent with the Stripe side (no paid orders). Missing index: `feature_orders(event_id, status, applied)` for the `sub:` lookup (fine at this scale). Live `/api/events` has no `f>0` entries, so the pin ring, badge and list order could not be verified against live data; verified by code reading only.

## Money reconciliation

Possible only through Stripe CSVs plus ad hoc SQL from finance-operations.md section 2. Missing: admin orders view, refund log, "needs action" list, revenue totals, comp log (comps are hand migrations with no record). Receipts: Stripe "Successful payments" toggle is unverified (API cannot read it).

## Test plan (CI, minimal, node:test)

Use the signed-payload approach the builder used (`t=<unix>,v1=HMAC_SHA256(secret, "t.body")`) against `onRequestPost` with a stub D1:
1. Bad signature, stale timestamp (over 300 s) and missing header return 400; good signature passes.
2. Paid event applies once (`featured`, `featured_until`, `applied=1`); replay returns `duplicate`; same session via `async_payment_succeeded` does not double-extend.
3. Event missing returns 500 and applies on retry; `unpaid` completed returns `waiting`.
4. Extension adds 30 days; upgrade keeps level 2; season uses `end_date`; end_date today and past edge (P6).
5. `sub:` order is held, then admin approve applies; decline leaves the order paid and unapplied (document or assert the reminder once P2 is built).
6. Full refund revokes; partial refund holds; dispute created revokes; lost stays off; won sets `dispute_won`; refund of a superseded order returns manual (P3); refund before order exists (P8).
7. `applyPlan`/`featuredLevel` unit tests around the Pacific midnight boundary; `ownsEvent` and `trustOf` truth tables (gov/edu, aggregators, plus-addressing).
8. Add `"test": "node --test tests/"` and a workflow step.

## Verified OK

- Signature verification (HMAC SHA-256, 5-minute tolerance, constant-time compare, multiple `v1`).
- Prices come from one server source; client sends only a plan key; `/api/config` matches `PLANS` live ($10/$15/$20); no hard-coded prices in the three public pages.
- Webhook endpoint and enabled events match docs; no products/prices; no charges, refunds or disputes.
- Idempotency: `stripe_events` plus `applied=0` guarded batch; retries safe.
- Checkout requires login, ownership and unended event; submissions of others look like "not found"; receipt email is the account email; Stripe outage handled.
- Refund/dispute revoke refuses to wipe hand-set placements.
- Expiry uses Pacific date in checkout, webhook and `featuredLevel`; upkeep never touches the columns; `featured` stays hidden after expiry.
- Payments hidden and refused in the store apps (UA check server-side).
- Amazon disclosure sentence present on the Shop tab; `rel=sponsored` on affiliate links; no affiliate links in emails.

## Money-flow diagram (text)

1. Owner signs in, submits event (contact_email = account email) or claims an existing one (auto by domain, else admin approval).
2. `/feature` or `/add-event` then `POST /api/feature/checkout` (ownership, plan price from `PLANS`, idempotency key) then Stripe Checkout.
3. Stripe sends `checkout.session.completed` (or `async_payment_succeeded`) then `POST /api/stripe-webhook` verifies signature then inserts `feature_orders` then (live event) `applyPlan` then `events.featured/featured_until` and `applied=1`; (pending `sub:`) held until admin approves, which applies it; (decline) order stays paid, manual refund (P2).
4. `/api/events` (cached about 3 min) exposes `f`; app.js shows pin ring and badge for f>=1, lists f=2 first.
5. Refund or dispute then `revokePlan` (exact-match guard) then order status `refunded/disputed/held/dispute_won`; won or held cases need a human with no list (P4).
6. Placement ends by date; no job. Payout flows from Stripe to the bank; monthly reconciliation is manual.
