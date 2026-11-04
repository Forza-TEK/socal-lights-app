# Automatic Featured payments (Stripe)

Featured is fully automatic once two secrets are set. Until then `/feature` shows only an "email us" message (no payment links; the old Cash App links were removed).

## How it works
1. Visitor opens `/feature`, searches for their event, picks a plan (prices come from `functions/_lib/featured.js` via `/api/config`) and enters an email for the receipt.
2. `POST /api/feature/checkout` creates a Stripe Checkout session (card, plus Cash App Pay if enabled in Stripe) and sends them to Stripe.
3. Stripe calls `POST /api/stripe-webhook` when the payment completes. The function checks the signature, records one row in
   `feature_orders`, and sets `events.featured` (1 = gold pin + badge, 2 = also listed first) and
   `featured_until` (30 days, or the event's end date for the season plan). Extending a running placement adds time and never lowers the level.
   The row's `applied` flag (with `applied_featured` / `applied_until`) says whether the placement was really written. If the first attempt
   fails (for example the event isn't found yet) the webhook returns 500 and Stripe's retry finishes the job; a true duplicate does nothing.
   Each handled Stripe event id is stored in `stripe_events`.
4. Refunds and disputes switch the placement off again: `charge.refunded` (full refund only; a partial refund marks the order `held` for you to decide),
   `charge.dispute.created` and a lost `charge.dispute.closed`. It only clears the event if it still holds exactly what that order wrote, so a placement you
   set by hand or a later order that extended it is left alone (the order is still marked `refunded` / `disputed`; check the event by hand). A dispute that
   is won stays switched off with status `dispute_won`; re-grant by hand if you want it back.
5. Placement ends by itself after `featured_until`. Scheduled sweeps and upkeep never touch these columns.

Plans and prices live only in `functions/_lib/featured.js` (change `cents`); `/api/config` publishes them and `/feature` and `/add-event` render them. Only the wording is in the HTML.
Paid placement is web only: the page, the menu link and `/api/feature/checkout` are all refused inside the store apps.

## One-time setup (about 15 minutes)
1. Create a Stripe account at stripe.com and finish activation (business details and a bank account for payouts).
2. Stripe Dashboard > Settings > Payment methods: make sure **Cards** and **Cash App Pay** are on.
3. Developers > API keys: copy the **Secret key** (`sk_live_...`).
4. Developers > Webhooks > Add endpoint: URL `https://socallights.app/api/stripe-webhook`; subscribe to exactly these events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`
   (an existing endpoint needs the four newer ones added). After saving, reveal and copy the **Signing secret** (`whsec_...`).
5. Cloudflare dashboard > Workers & Pages > socal-lights > Settings > Variables and Secrets > Production > Add:
   - `STRIPE_SECRET_KEY` = the secret key (type **Secret**)
   - `STRIPE_WEBHOOK_SECRET` = the signing secret (type **Secret**)
   Then redeploy (Deployments > the latest > Retry deployment) so the secrets load.
6. Settings > Business > Customer emails: turn on **Successful payments** so Stripe emails receipts (the checkout also passes the buyer's email as the receipt address; Stripe only sends receipts for live-mode payments).
7. Check: open `https://socallights.app/api/config`; it should show `"featureCheckout":true`. Make one real test purchase on your own event (the cheapest plan is $10) and refund it.

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
The `/add-event` form offers an optional "Make it stand out" choice ($10 / $15 / $20). After the event is added the visitor goes straight to Stripe.
If the event published instantly the payment attaches to it by id; if it is waiting in the admin "Submitted events" tab, the payment is recorded
against `sub:<submission id>` and applied the moment you publish it (the pending card shows "Paid Featured"). If you decline a submission that
has paid, refund it in Stripe. The choice only appears when online payment is switched on (`/api/config` shows `featureCheckout: true`).

## Panel buttons
The Events and Houses lists always follow the visible map. Their headers carry "+ Add event" (goes to `/add-event`) and "+ Add house" (opens
Showcase a House). The coffee-mug button now only holds the tip link and the optional shop links.
