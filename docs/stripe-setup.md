# Automatic Featured payments (Stripe)

Featured is fully automatic once two secrets are set. Until then `/feature` shows only an "email us" message (no payment links; the old Cash App links were removed).

## How it works
1. Visitor opens `/feature`, searches for their event, picks a plan (prices come from `functions/_lib/featured.js` via `/api/config`) and enters an email for the receipt.
2. `POST /api/feature/checkout` creates a Stripe Checkout session (card, plus Cash App Pay if enabled in Stripe) and sends them to Stripe.
3. Stripe calls `POST /api/stripe-webhook` when the payment completes. The function checks the signature, records one row in
   `feature_orders`, and sets `events.featured` (1 = gold pin + badge, 2 = also listed first) and
   `featured_until`: for an event, `min(event end_date, today + 30)` for the pin and top plans, `min(end_date, today + 90)` for Full run (stored plan key `season`), never earlier than today. The end date is the one stored when the order is applied; later date changes do not extend it. A repeat purchase can only add time while the cap, not the event's last day, was the limit, and never lowers the level or shortens a longer placement. A home has no end date: 30 days from payment, stacking on a running placement. Old $20 whole-season orders (`amount` 2000) are grandfathered: until the event's end date, no cap, no amount-mismatch flag.
   The row's `applied` flag (with `applied_featured` / `applied_until`) says whether the placement was really written. If the first attempt
   fails (for example the event isn't found yet) the webhook returns 500 and Stripe's retry finishes the job; a true duplicate does nothing.
   Each handled Stripe event id is stored in `stripe_events`.
4. Refunds and disputes switch the placement off again: `charge.refunded` (full refund only; a partial refund marks the order `held` for you to decide),
   `charge.dispute.created` and a lost `charge.dispute.closed`. It only clears the event if it still holds exactly what that order wrote, so a placement you
   set by hand or a later order that extended it is left alone (the order is still marked `refunded` / `disputed`; check the event by hand). A dispute that
   is won stays switched off with status `dispute_won`; re-grant by hand if you want it back.
   **Overlapping orders:** a refund or lost dispute recomputes the event's placement from its remaining valid orders (paid, applied, not over): the highest
   level and the latest end date. A hand-applied placement that runs longer than every order is never wiped (the order's note says "placement differs").
   **Ordering:** a refund or dispute that arrives before its order is remembered in `feature_pending_revocations`; the order is then created already
   refunded/disputed and never applied. **Amount check:** if the paid amount or currency differs from the plan price the placement is still applied
   and the order gets an `[auto] amount mismatch` note.
   **Admin > Orders** lists every order, "Needs attention" first (`refund_due`, disputed, partial refund, paid but not applied for an hour, placement differs,
   amount differs, placement running on a cancelled/postponed event, dispute won). Each links to the payment in the Stripe dashboard. Actions: *Mark refunded*
   (after you refunded in Stripe; this never calls Stripe), *Apply now*, *Add note* (your own note marks an `[auto]` warning as seen). The tab badge and the
   admin digest email use the same rule. Declining a submission that has a paid order sets it to `refund_due`; unpublishing or deleting an event with a running
   paid placement asks for confirmation (API: 409, then `confirm`), keeps the orders, and republishing restores the placement.
   A migration that deletes an event cannot be checked against production: `npm run validate` only warns with the SQL to run. Check `feature_orders` first.
   One account can open 6 Checkout sessions an hour and 20 a day (`checkout_log`). Checkout refuses (400) an event that starts more than 30 days from today ("Featuring opens 30 days before your event: come back on <date>"), Full run for an event under 31 days long or with under 7 days left, and a repeat purchase that would add nothing.
5. Placement ends by itself after `featured_until`. Scheduled sweeps and upkeep never touch these columns.

Plans and prices live only in `functions/_lib/featured.js` (change `cents`); `/api/config` publishes them and `/feature` and `/add-event` render them. Only the wording is in the HTML.
Paid placement is web only: the page, the menu link and `/api/feature/checkout` are all refused inside the store apps.

## One-time setup (about 15 minutes)
1. Create a Stripe account at stripe.com and finish activation (business details and a bank account for payouts).
2. Stripe Dashboard > Settings > Payment methods: make sure **Cards** and **Cash App Pay** are on.
3. Developers > API keys: copy the **Secret key** (`sk_live_...`).
4. Developers > Webhooks > Add endpoint: URL `https://socallights.app/api/stripe-webhook`; subscribe to exactly these events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, and (for automatic renewal of installer Sponsor placements) `payment_intent.succeeded`
   (an existing endpoint needs the four newer ones added). After saving, reveal and copy the **Signing secret** (`whsec_...`).
5. Cloudflare dashboard > Workers & Pages > socal-lights > Settings > Variables and Secrets > Production > Add:
   - `STRIPE_SECRET_KEY` = the secret key (type **Secret**)
   - `STRIPE_WEBHOOK_SECRET` = the signing secret (type **Secret**)
   Then redeploy (Deployments > the latest > Retry deployment) so the secrets load.
6. Settings > Business > Customer emails: turn on **Successful payments** so Stripe emails receipts (the checkout also passes the buyer's email as the receipt address; Stripe only sends receipts for live-mode payments).
7. Check: open `https://socallights.app/api/config`; it should show `"featureCheckout":true`. Make one real test purchase on your own event (the cheapest plan is the Featured pin; see /pricing for the price) and refund it.

## Who can pay, and the admin step
Checkout requires a signed-in account and ownership of the event (submitted it, approved claim, or contest owner/staff). Claims that cannot be auto-approved appear in the admin **Event claims** tab: check the claimant's email against the event's website, then Approve or Decline. Approving only lets them buy Featured for that event; it gives no edit rights. Migration 0157 adds `feature_orders.user_id` and `event_claims`.

## Testing without real money
- Stripe test mode: use `sk_test_...` and a test-mode webhook secret, card 4242 4242 4242 4242; refund it in the Dashboard to see the placement switch off.
- Locally: put fake values in `.dev.vars` (gitignored): `STRIPE_WEBHOOK_SECRET=whsec_test`, `STRIPE_SECRET_KEY=sk_test_fake`; run `npm run db:migrate:local` and `npm run dev`.
  POST synthetic events to `/api/stripe-webhook` with header `stripe-signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the secret>`.
  Check: paid applies once; a replay says `duplicate`; an event that can't be found returns 500 and is applied when retried; refund/dispute events revoke only the applied placement; a bad signature returns 400.

Never commit these values to the repo. Use test keys (`sk_test_...`) first if you want to try the flow with card 4242 4242 4242 4242.

## Add your event (public form)
`/add-event` posts to `POST /api/submit-event`. The server geocodes the address, rejects duplicates, and loads the submitted event page: if it
mentions the event name and the year, the event is published immediately as confirmed; otherwise it waits in the admin page under
"Submitted events" (publish as confirmed or expected, or decline). Limits: 5 submissions per hour per connection, 40 auto-publishes per day.

## Featured while adding an event
The `/add-event` form offers an optional "Make it stand out" choice (prices are on /pricing; the old $10 / $15 / $25 plans are superseded). After the event is added the visitor goes straight to Stripe.
If the event published instantly the payment attaches to it by id; if it is waiting in the admin "Submitted events" tab, the payment is recorded
against `sub:<submission id>` and applied the moment you publish it (the pending card shows "Paid Featured"). If you decline a submission that
has paid, refund it in Stripe. The choice only appears when online payment is switched on (`/api/config` shows `featureCheckout: true`).

## Panel buttons
The Events and Houses lists always follow the visible map. Their headers carry "+ Add event" (goes to `/add-event`) and "+ Add house" (opens
Showcase a House). The coffee-mug button now only holds the tip link and the optional shop links.

## Automated tests (CI)
`npm test` runs the signed-webhook, checkout, claims, orders and digest tests against an in-memory D1 (`tests/_pay.mjs`, `tests/_d1.mjs`).
`.github/workflows/test.yml` runs them and `npm run validate` on every pull request and push to `main`. To make it a merge gate: GitHub > Settings >
Rules (or Branches) > protect `main` > require the status check "Tests". Run `npm test` before touching any payment code.

## Automatic renewal of installer Sponsor placements (added 2026-11-07)
- **Webhook:** add the event `payment_intent.succeeded` to the existing endpoint (Developers > Webhooks > the `https://socallights.app/api/stripe-webhook` endpoint > Update details > add the event). `checkout.session.completed` (already enabled) also covers the small "save a card" setup page. Nothing else is new.
- **Receipts:** Stripe > Settings > Customer emails > "Successful payments" on, so the buyer also gets Stripe's receipt for an automatic charge (we pass `receipt_email`).
- **Cron:** `.github/workflows/sponsor-renewals.yml` uses the existing repository secret `ALERT_CRON_KEY` and the existing Pages secret of the same name. No new secret. Run it once by hand (Actions > Sponsor automatic renewals > Run workflow): it answers `{"ok":true,"reminded":0,...}` when nothing is due.
- **Test:** in Stripe test mode (`sk_test_` key and a test webhook secret) pay with 4242 4242 4242 4242 with the box ticked; the declined card for the failure path is 4000 0000 0000 0341 (attaches, then fails when charged). Cancel and refund from the Dashboard as above.

## Stripe reconcile and bad-signature log (added 2026-11-07, audit payments H1)
- **Bad webhook signatures are visible.** A delivery whose signature fails is answered 400 as before and now also written to `ops_log` (kind `webhook`, text only: "STRIPE_WEBHOOK_SECRET is not set", "no stripe-signature header", "timestamp more than 5 minutes off", or "signature does not match: the signing secret is probably not the one shown for this endpoint"). The header, body and secret are never stored. One row per cause per hour. The admin digest lists it under "Problems the site noticed" ("a rejected signature means STRIPE_WEBHOOK_SECRET is wrong"). A wrong secret therefore shows up in the digest instead of silently losing every payment.
- **Daily reconcile (read-only).** `.github/workflows/stripe-reconcile.yml` (14:47 UTC) calls `POST /api/stripe-reconcile` (key `ALERT_CRON_KEY`), which lists the last 3 days of Checkout Sessions and PaymentIntents with GET requests only and compares them to `feature_orders` (`functions/_lib/reconcile.js`). One call reads 10 sessions and 10 payment intents (free plan: 50 outgoing calls per request); the workflow repeats until done, with the cursor kept in `job_heartbeats.state`. It reports: **paid but no order recorded** (webhook missed; replay it from Stripe > Developers > Webhooks), **paid but not applied**, **amount differs**, **unknown payment** (no order and none of our metadata). Findings go to the digest section "Scheduled jobs and deploys" (lines starting `STRIPE:`, subject `STRIPE MISMATCH`) and to `ops_log` (kind `reconcile`, once per finding per 20 hours). Sessions younger than 30 minutes are skipped (the webhook may be in flight).
- **Key permissions.** With the normal secret key (`sk_live_...`) nothing to do. If `STRIPE_SECRET_KEY` is a **restricted key** (`rk_live_...`) it needs **Read** on: *Checkout Sessions* and *PaymentIntents* (plus whatever checkout and renewals already use: Checkout Sessions Write, PaymentIntents Write, Customers, SetupIntents, Charges Read). Stripe dashboard > Developers > API keys > the key > Edit > set those two to Read > Save. Without them the check says "could not read Checkout Sessions or PaymentIntents" in the digest and nothing else breaks.
- **Not covered:** refunds and disputes (the webhook handles them; they show in Admin > Orders), payouts, and sessions older than 3 days.

## Event plans and installer plans (2026-11-06)
No Stripe setup changes: the same endpoint, the same webhook events, no products or prices are created in the Stripe dashboard (Checkout is built from `price_data` on every payment). What changed in the payload:
- Event Checkout sessions carry `metadata[plan]` = `ev_pin` | `ev_banner` | `ev_top` | `ev_all` and `metadata[quote_from]`, `quote_to`, `quote_cents` (the window and price shown to the buyer). The webhook applies the quoted window and flags an amount that differs from the quote. Old keys `pin`, `top`, `season` still work for orders in flight.
- Installer sessions use `banner`, `top` (new) or `banner_top`.
- Homes still use `pin` and `top`.
- Make a test purchase of the cheapest event plan on your own event, then refund it: the placement switches off, including the banner. Nothing else needs to be done in Stripe.

## Contest passes (added 2026-11-07)
Contest organizer passes go through the same Checkout, the same webhook endpoint and the same `feature_orders` table as every other paid product (`target = 'contest_pass'`, `event_id` = the organization key such as `d:covinaca.gov`, `plan` = `pass_5`, `pass_10` or `pass_20`; the window dates are in `quote_from` and `quote_to`). Nothing new to set up in Stripe: the webhook events are the same, `/api/contest-pass/checkout` opens the payment page, and the quote (window, cap, price) is locked into the session metadata.
- **Applying:** a paid, matching order writes one `contest_passes` row (keyed by the Checkout session id, so a replay changes nothing). A pass bought for a window that has changed, or for an organization that already holds as much (second tab), becomes `refund_due` and is NOT applied: refund it in Stripe, then mark it refunded in Admin > Orders.
- **Refunds and disputes:** before the extra contests were used the pass is revoked; after they were used the pass stays on and the order shows "Placement differs" in Admin > Orders. Decide in Admin > Contests > Contest passes (Revoke this pass) after refunding in Stripe.
- **Testing without real money:** same as above. The test suite posts signed `checkout.session.completed` events for passes (`tests/contest-passes.test.mjs`); no real call goes to Stripe.
- Comps and the Covina founding-partner grant: `docs/contests.md`, "Contest passes".
