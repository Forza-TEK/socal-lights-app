# Automatic Featured payments (Stripe)

Featured is fully automatic once two secrets are set. Until then `/feature` falls back to the Cash App + email flow.

## How it works
1. Visitor opens `/feature`, searches for their event, picks a plan ($5 pin / $10 top of list / $15 whole season).
2. `POST /api/feature/checkout` creates a Stripe Checkout session (card, plus Cash App Pay if enabled in Stripe) and sends them to Stripe.
3. Stripe calls `POST /api/stripe-webhook` when the payment completes. The function checks the signature, records one row in
   `feature_orders` (so retries do nothing), and sets `events.featured` (1 = gold pin + badge, 2 = also listed first) and
   `featured_until` (30 days, or the event's end date for the season plan). Extending a running placement adds time and never lowers the level.
4. Placement ends by itself after `featured_until`. Scheduled sweeps and upkeep never touch these columns.

Plans and prices live in `functions/_lib/featured.js` (change `cents`) and the copy in `public/feature.html`.

## One-time setup (about 15 minutes)
1. Create a Stripe account at stripe.com and finish activation (business details and a bank account for payouts).
2. Stripe Dashboard > Settings > Payment methods: make sure **Cards** and **Cash App Pay** are on.
3. Developers > API keys: copy the **Secret key** (`sk_live_...`).
4. Developers > Webhooks > Add endpoint: URL `https://socallights.app/api/stripe-webhook`; events `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`. After saving, reveal and copy the **Signing secret** (`whsec_...`).
5. Cloudflare dashboard > Workers & Pages > socal-lights > Settings > Variables and Secrets > Production > Add:
   - `STRIPE_SECRET_KEY` = the secret key (type **Secret**)
   - `STRIPE_WEBHOOK_SECRET` = the signing secret (type **Secret**)
   Then redeploy (Deployments > the latest > Retry deployment) so the secrets load.
6. Check: open `https://socallights.app/api/config`; it should show `"featureCheckout":true`. Make one real $5 test purchase on your own event.

Never commit these values to the repo. Use test keys (`sk_test_...`) first if you want to try the flow with card 4242 4242 4242 4242.

## Add your event (public form)
`/add-event` posts to `POST /api/submit-event`. The server geocodes the address, rejects duplicates, and loads the submitted event page: if it
mentions the event name and the year, the event is published immediately as confirmed; otherwise it waits in the admin page under
"Submitted events" (publish as confirmed or expected, or decline). Limits: 5 submissions per hour per connection, 40 auto-publishes per day.
