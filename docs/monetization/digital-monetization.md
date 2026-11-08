# Digital monetization: revision 2 (2026-11-04)

Author: Digital Monetization lead. Not legal or financial advice. Revised after `docs/monetization/data-2026-11-04.md`, which wins wherever it disagrees with my first draft. Vendor claims below were checked against the vendor's own pages on 2026-11-04 unless marked UNVERIFIED. All prices are still hypotheses; nothing has ever sold.

## Recommendations

1. **Prove the payment path before anything else.** Stripe shows $0 ever paid, and `featureCheckout` is already true. The webhook has never received a real paid event, so we do not know it works. Do a Stripe test-mode run, then one live $10 purchase on one of our own events, then refund it and confirm the pin appears and (after fix 1 below) disappears. Stripe does not return its original processing fee on a refund; at the published 2.9% + 30 cents for domestic cards (stripe.com/pricing) a $5 test costs about 44 cents.
2. **Ship the five Featured fixes (spec in section 4), then stop building Featured.** They are all S-sized. Do not build the generic `orders`/`entitlements` layer from my first draft yet; there is nothing to put in it.
3. **Grow the free side first and measure.** With about 50 real visits a day, 6 homes and 1 installer, no paid placement can show value. The paid products that survive are the ones that do not depend on our own audience: ticket affiliates on the 84 ticket-linked events, and hand-sold Featured to commercial organizers.
4. **Sell only to buyers who already exist.** Ticketed organizers (the 84) for Featured; chambers or cities by invoice only if they ask; installers only after at least about 10 have claimed free profiles and one lead has arrived. Everything else waits for numbers.
5. **Keep the guardrail.** The free map stays free. Paid flags touch only labelled discovery lists, never contest entries, votes, order, judging or results (add the test described in section 3).

## 1. Why nobody has bought Featured (diagnosis from code)

One expired unpaid session and zero `feature_orders` rows. Evidence-backed causes, most likely first:

1. **Nothing links to `/feature`.** A grep of `public/` and `functions/` finds `/feature` only in `add-event.html` (a post-submit button at line 70 and an error fallback at line 68) and in the checkout success/cancel URLs. `footer.js`, `robots.txt` and `_headers` do not mention it, and `public/` has no sitemap. The post-submit button is only reached by someone who submits an event, and `event_submissions` has 0 rows. So the only way in is a URL we hand out by hand.
2. **The buyer side has no relationship with us.** The 2,013 events were collected by us from public sources, not submitted by organizers. Organizers do not know the site exists, so no one is looking for a way to promote.
3. **The offer cannot show value.** `feature.html` promises "Southern Californians use SoCal Lights to decide where to go this weekend" with no numbers, and we have none to give: roughly 18 and 50 visits on Nov 2 and 3. A buyer who asks "how many people will see this?" has no answer.
4. **Friction on the page.** `feature.html` loads the whole `/api/events` list, makes the visitor search for their own event by typing, pick a plan, then click through to Stripe. No email field and no account, which is fine, but the cancel URL returns to a blank `/feature` (selection lost) and `success_url` carries no session id.
5. **The one expired session is a drop-off or a test.** Stripe's docs say a Checkout Session's `expires_at` can be 30 minutes to 24 hours after creation, default 24 hours, and `checkout.session.expired` fires when it lapses. Someone opened the Stripe page and did not pay within 24 hours, or it was a developer test. The code cannot tell which (we do not store sessions that never complete).
6. **Competing and untrusted payment path.** `site-config.js` line 98 still holds Cash App links (`$RelaxationMeditation/5`, `/10`, `/15`). They show only when `featureCheckout` is false, and `/api/config` is cached 5 minutes. If someone received those links earlier by email, they bypass Stripe, leave no D1 record and would never turn on a placement. Whether any outreach used them is UNKNOWN.
7. **No promise we can keep.** `feature.html` says "A receipt is on its way from Stripe." Per Stripe's receipts page, Stripe creates receipts for all successful payments but emails them only if "Successful payments" is switched on in Dashboard > Settings > Business > Customer emails, or `payment_intent_data.receipt_email` is set. Our checkout sets neither. Whether the Dashboard setting is on is UNKNOWN.
8. **Latent webhook bug that would hide a first sale.** In `stripe-webhook.js` the order row is inserted first (`INSERT OR IGNORE`), and later steps can return early ("submission not found", "event not found") or fail. Stripe's retry then hits the `duplicate` branch and the placement is never applied. A first real sale could silently not turn on.

Also unproven: whether the Stripe webhook endpoint is registered in the live account with the right events. The code comment lists only `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

## 2. Re-ranked build order for a tiny audience

Principle: money only where a buyer already exists, and free growth first.

**A. Free, do now (grows supply and audience, no billing)**
1. Measurement: count outbound clicks on ticket and organizer links and views of `/feature`, using the existing `site_hits` pattern (`functions/api/visit.js`). Without this nobody can be told what Featured delivers. Wait until at least 3-4 weeks of `site_hits` before quoting numbers.
2. Supply loops that already exist and cost nothing: installer claim flow, printables with a QR code, "add a house" prompts for installer customers, weekly lights email (`alert_subs`). Goal for the next review: 20+ homes, 5+ installer profiles. These belong to the product team; I only note they gate the paid installer products.
3. Organizer outreach with a free correction offer ("your event is listed, fix anything here") to the commercial events first. This builds the buyer relationship that is missing (cause 2).

**B. Paid, in order**
| # | Product | Decision |
|---|---|---|
| 1 | **Featured event** ($10/$15/$20, exists; prices live in `functions/_lib/featured.js`) | Fix, link quietly, sell by hand to the 84 ticket-linked events' organizers. Offer the first 5 free in exchange for permission to quote their click counts. |
| 2 | **Ticket affiliate links** | 84 events (not 22) already link to Eventbrite, Ticketmaster or Fever and `ticketAffiliates` is `{}` in `site-config.js`. Zero buyer, zero billing. Which programs accept a site this size, and their terms, are UNVERIFIED (not checked). Needs the FTC-style disclosure line near each link. |
| 3 | **Installer Listing** | Do not build billing. At 1 installer, 0 leads, nothing to sell. When the first installer asks, use a Stripe Payment Link plus a manual admin flag. |
| 4 | **Presenting Installer, Contest Pro, sponsor slots** | Defer. 1 contest, 0 votes, 0 sponsors: nothing to present against. Revisit after a contest has entries. |
| 5 | **Featured home boost, yard-sign pack, newsletter sponsor** | Drop for now. 6 homes; subscriber count unknown. |
| 6 | **City/chamber invoice or data feed** | Inbound only, by Stripe Invoicing created in the Dashboard. No code. |

Removed from my first draft: the generic `orders` + `entitlements` + `installer_slots` build (steps 2-4 and 7). It is the right shape if installers and contests ever sell, but building it with zero customers is waste.

Payment mechanics I can now stand behind (Stripe docs):
- **Payment Links** can limit the number of payments and then deactivate automatically ("When the payment link reaches the limit, it automatically deactivates"); they accept `metadata`, which "will automatically be copied to checkout sessions created by this payment link"; a `client_reference_id` URL parameter ("up to 200 characters", alphanumerics, dashes, underscores) is "sent in the checkout.session.completed webhook"; confirmation can be a redirect that can include `{CHECKOUT_SESSION_ID}`. This corrects my first draft's claim that the webhook cannot match a Payment Link to a subject.
- **Payment Links expiry:** I found no expiry-date parameter in the create-API parameter list. Documented controls are payment-count limit and deactivation (`active`, `inactive_message`). Treat "expires at a date" as unavailable.
- **Our webhook and Payment Links:** the handler ignores sessions without `metadata.event_id` and a valid plan ("no feature metadata"), so Payment Link sales for installers would be ignored harmlessly and found only in the Dashboard. Fine for the first few.
- **Customer Portal:** Dashboard no-code activation; customers manage billing info, payment methods and subscription status. Only useful once we sell subscriptions; we do not.
- **Invoicing:** Dashboard no-code; invoices are Stripe-hosted, can be emailed, shared by link, sent as PDF, or auto-charged. Net-30 terms, PO numbers and bank-transfer rails for cities are UNVERIFIED (not found on the page I read).
- **Idempotency:** `Idempotency-Key` header, keys up to 255 characters, saved response returned on retry (including 500s), keys may be pruned after 24 hours, and a reused key with different parameters errors.

## 3. Free/paid boundary (unchanged, tightened)

Free forever: map, search, filters, routes, Favorites, browsing and starring homes, event details, voting, entering contests, basic contest and installer pages, submitting events and homes, weekly email.

Paid only affects labelled discovery: the Featured badge/pin and level-2 list ordering (`app.js` `lead` sort, level 2 only). Guardrails: no paid code on map load; no Stripe script on the map page; paid UI hidden in the store apps; a unit test that contest entry, vote and results queries never reference `featured`, `featured_until`, any plan column, or `feature_orders`.

## 4. Exact spec: five small Featured fixes (no code written here)

Prerequisite in the Stripe Dashboard (no code): on the live webhook endpoint `https://socallights.app/api/stripe-webhook`, subscribe to exactly these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` (optional, for abandoned-checkout counts), `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Turn on Settings > Business > Customer emails > Successful payments.

### Migration `00NN_feature_orders_status.sql` (next number; never edit 0065)
```
ALTER TABLE feature_orders ADD COLUMN payment_intent TEXT;     -- from session.payment_intent
ALTER TABLE feature_orders ADD COLUMN currency TEXT;
ALTER TABLE feature_orders ADD COLUMN status TEXT DEFAULT 'paid';  -- paid | refunded | disputed | held
ALTER TABLE feature_orders ADD COLUMN applied INTEGER DEFAULT 0;   -- 1 once events row was updated
ALTER TABLE feature_orders ADD COLUMN applied_featured INTEGER;    -- what we wrote
ALTER TABLE feature_orders ADD COLUMN applied_until TEXT;
ALTER TABLE feature_orders ADD COLUMN refunded_at TEXT;
CREATE INDEX idx_feature_orders_pi ON feature_orders(payment_intent);
CREATE TABLE IF NOT EXISTS stripe_events (id TEXT PRIMARY KEY, type TEXT, received_at TEXT DEFAULT (datetime('now')));
```
Existing rows: none (0 orders), so no backfill. Defaults keep the migration safe.

### Fix 1: refund and dispute handling, `functions/api/stripe-webhook.js` and `functions/_lib/featured.js`
- Dedupe every event: `INSERT OR IGNORE INTO stripe_events(id,type)` using `evt.id`; if no change, return `{ok:true, duplicate:true}`.
- Extend the type allow-list beyond the two checkout events.
- **Paid path fix (cause 8):** store `payment_intent`, `currency`; keep the `INSERT OR IGNORE` but treat a duplicate as done only if `applied = 1`. Set `applied=1`, `applied_featured`, `applied_until` in the same `db.batch` as the `UPDATE events`. If the event or submission is not found, leave `applied=0` and return a non-2xx (500) so Stripe retries; log once.
- **`charge.refunded`** (Stripe: "Occurs whenever a charge is refunded, including partial refunds"; Stripe itself recommends listening to `refund.created` for refund detail). Use the charge object: find the order by `payment_intent = charge.payment_intent`. Revoke only if `charge.refunded === true` (verified on the Charge object page: "Whether the charge has been fully refunded. If the charge is only partially refunded, this attribute will still be false."; `amount_refunded` is also on the object). Partial refund: set `status='held'` and do nothing else; admin decides.
- **`charge.dispute.created`**: the Dispute object has a `charge` id (verified; a `payment_intent` field on it was not confirmed). Orders are keyed by `payment_intent`, so look up the charge with `GET /v1/charges/{charge}` to read its `payment_intent`, then find the order, set `status='disputed'`, and revoke. Stripe says a dispute "immediately reverses the payment" (and the published dispute fee is $15.00 each, three times a $5 sale; refund rather than fight), so do not wait. On `charge.dispute.closed` with status `won`, leave it revoked and show it in admin for a manual re-grant (do not auto-restore).
- **Revoke rule, shared helper `revokePlan(db, order)` in `featured.js`:** only if the event's current `featured_until` equals the order's `applied_until` and `featured` equals `applied_featured`, set `featured=0, featured_until=NULL, updated_at=datetime('now')` and `status`, `refunded_at`. If it does not match (the admin set Featured by hand, or a later order extended it), do not touch the event; set `status` and return `{ok:true, manual:"placement differs"}`. This protects comped placements. Pending-submission orders (`event_id` starting `sub:`) are only marked, not applied.
- Order rows are never deleted; no PII beyond the existing `email`.

### Fix 2: single price source
- `featured.js` `PLANS` stays the only definition. Add `export const PUBLIC_PLANS = Object.fromEntries(Object.entries(PLANS).map(([k,p])=>[k,{label:p.label,cents:p.cents,days:p.days,level:p.level}]))`.
- `functions/api/config.js` returns `featurePlans: PUBLIC_PLANS` (cache stays 300 seconds).
- `public/feature.html`: render the three `.plan` sections and `NAMES` from `cfg.featurePlans` in JS; delete any hard-coded `$10/$15/$20` strings and the `NAMES` constant. `public/add-event.html`: replace its own `PLANS` tile list the same way (line 58 uses a local list; contents not read). Checkout continues to read `PLANS` server-side only, so a tampered client price is impossible (already true: the client sends only the plan key).
- Bump the `?v=` on any CSS/JS tags touched, per `CLAUDE.md`.

### Fix 3: customer email and receipt, `functions/api/feature/checkout.js` and `feature.html`
- Stripe's docs: if `customer_email` is not given, Checkout asks for an email; so my first draft's "email may be blank" was mostly wrong. The real gap is the receipt. 
- Add a required `<input type=email id=em>` on step 3 of `feature.html` and in the add-event flow (it already collects `email`; reuse it). Send `email` in the POST body; validate shape and length server-side with `clean`.
- In the Checkout call add `customer_email = email` and `payment_intent_data[receipt_email] = email`. Leave `customer_creation` at its default (`if_required`; for one-time payments no Customer object is made, which is fine because refunds key off `payment_intent`).
- Add `Idempotency-Key: feature-<sha256(event_id|plan|10-minute bucket)>` header to the Stripe POST so double clicks do not create two sessions. No email in the key (Stripe advises against sensitive data in keys).
- `cancel_url = /feature?event=<id>&plan=<plan>`; `feature.html` reads those params and preselects. Keep `success_url` as is.

### Fix 4: native-app guard
- `public/feature.html`, first lines of the module: `if (/SoCalLightsApp/.test(navigator.userAgent))` hide `#auto`, `#manual` and the plan grid, and show only "Event promotion isn't available in the app." No link, no call to action (Apple 3.1.3 forbids encouraging other purchase methods outside the US storefront).
- `functions/api/feature/checkout.js`: if `request.headers.get("user-agent")` matches `/SoCalLightsApp/`, return `err(403, "Not available in the app.")`. A UA check is soft (spoofable), so also keep the UI guard.

### Fix 5: link `/feature` from the site (web only)
- `public/footer.js`: add "Promote your event" to the footer, hidden when the user agent matches the wrapper.
- `public/add-event.html`: add one line near the top of the form, "Want it featured? You can add that after you submit."
- Event detail card in `public/app.js`: for events without `featured`, a small "Organizer? Feature this event" link to `/feature?event=<id>` (needs the `?event=` preselect from fix 3) hidden in-app. Bump `?v=` for `app.js` in `index.html`.
- Add `/feature` to a new `public/sitemap.xml` only if we create one; not required.

### Fix 6: remove the competing Cash App path when Stripe is on
- `public/feature.html`: delete the `#manual` block and the `featurePay` loop. When `!cfg.featureCheckout`, show only an email-us message (no payment links).
- `public/site-config.js`: delete the `featurePay` object (line 98). The tip jar `donateUrl` is separate and stays, hidden in the app.
- Stripe's own Cash App Pay (async path) is already handled by `checkout.session.async_payment_succeeded`.
- Hand-pasted Cash App links in any prior outreach are outside the repo and cannot be revoked from here (UNKNOWN).

## 5. Compliance (re-verified)

**Apple App Review Guidelines (developer.apple.com, "Last Updated: October 16, 2026").**
- 3.1.3(g), verbatim: "Digital purchases for content that is experienced or consumed in an app, including buying advertisements to display in the same app (such as sales of "boosts" for posts in a social media app) must use in-app purchase." The title is "Advertising Management Apps", and the exemption it grants is for apps whose sole purpose is managing campaigns, which ours is not. Featured and a home boost fit the "boost" example, so they cannot be sold inside the wrapper by non-IAP means.
- 3.1.3 intro, verbatim: "Apps in this section cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront and as set forth in 3.1.1(a) and 3.1.3(a)."
- 3.1.1(a), verbatim: "These entitlements are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps." In "all other storefronts, except for the United States storefront" such links "may not" appear.
- 5.3.1: "Sweepstakes and contests must be sponsored by the developer of the app." 5.3.2: official rules "must be presented in the app and make clear that Apple is not a sponsor".
- Decision stands: every paid screen stays web-only and hidden in the wrapper, because the apps ship in non-US storefronts. 5.3.1 still sits awkwardly with organizer-run contests; counsel should look.

**Still not verified:** Google Play payment policy; California contest law (leginfo returns 403, so Cal. Bus. & Prof. Code 17539.1 text, and whether a 2025 amendment changed it, was not read); FTC Endorsement Guides primary text (ftc.gov 403; secondary sources only); CCPA thresholds. Attorney review is required before charging organizers around contests or letting sponsors fund prizes.

## 6. What remains unverified

- Whether the live webhook endpoint exists, its signing secret matches, and which events it is subscribed to.
- Whether the Dashboard "Successful payments" receipt email is on.
- Whether a `payment_intent` field exists on the Dispute object, and the exact Payment Links `restrictions` payment-limit field name.
- Stripe fees on our account may differ from the public list price.
- Net-30 and PO details for Invoicing.
- Ticket-affiliate program eligibility; Amazon Associates status.
- Whether the one expired session was a real visitor or a test, and whether any earlier outreach pointed at Cash App.
- Economics: at 2.9% + 30 cents a $10 sale nets about $9.41 and a $20 sale about $19.12.
- Real traffic: `site_hits` has two days. Treat everything about audience as unknown until it has a month.

## Sources

- Stripe (fetched 2026-11-04; API version shown on pages `2026-10-28.endive`): Create a payment link https://docs.stripe.com/payment-links/api ; Payment Link create API https://docs.stripe.com/api/payment-link/create ; Customize/limit payments https://docs.stripe.com/payment-links/customize ; Post-payment behavior https://docs.stripe.com/payment-links/post-payment ; URL parameters https://docs.stripe.com/payment-links/url-parameters ; Checkout Session create https://docs.stripe.com/api/checkout/sessions/create ; Idempotent requests https://docs.stripe.com/api/idempotent_requests ; Customer portal https://docs.stripe.com/customer-management ; Invoicing https://docs.stripe.com/invoicing ; Refunds https://docs.stripe.com/refunds ; Disputes https://docs.stripe.com/disputes/how-disputes-work ; Event types https://docs.stripe.com/api/events/types ; Charge object https://docs.stripe.com/api/charges/object ; Dispute object https://docs.stripe.com/api/disputes/object ; Pricing https://stripe.com/pricing ; Receipts https://docs.stripe.com/receipts
- Apple App Review Guidelines (3.1.1, 3.1.1(a), 3.1.3, 5.3): https://developer.apple.com/app-store/review/guidelines/
- Repo: `docs/monetization/data-2026-11-04.md`, `functions/api/feature/checkout.js`, `functions/api/stripe-webhook.js`, `functions/_lib/featured.js`, `functions/api/config.js`, `public/feature.html`, `public/add-event.html`, `public/site-config.js`, `migrations/0062`, `0065`.
- Not reached: ftc.gov, leginfo.ca.gov, Google Play policy. Note that the WebFetch tool could not resolve docs.stripe.com in this session; the Stripe pages were retrieved with curl through the session proxy and read as text.
