-- Featured payments: track whether an order's placement was applied, link orders to Stripe charges/payment intents
-- for refunds and disputes, and dedupe Stripe webhook events. Add-only; 0065 is untouched.
ALTER TABLE feature_orders ADD COLUMN payment_intent TEXT;        -- Stripe payment_intent id from the Checkout session
ALTER TABLE feature_orders ADD COLUMN charge_id TEXT;             -- Stripe charge id, filled when a refund/dispute event names it
ALTER TABLE feature_orders ADD COLUMN currency TEXT;
ALTER TABLE feature_orders ADD COLUMN status TEXT DEFAULT 'paid';  -- paid | refunded | disputed | dispute_won | held
ALTER TABLE feature_orders ADD COLUMN applied INTEGER DEFAULT 0;   -- 1 once the events row was updated for this order
ALTER TABLE feature_orders ADD COLUMN applied_featured INTEGER;    -- events.featured value this order wrote
ALTER TABLE feature_orders ADD COLUMN applied_until TEXT;          -- events.featured_until value this order wrote
ALTER TABLE feature_orders ADD COLUMN refunded_at TEXT;
CREATE INDEX IF NOT EXISTS idx_feature_orders_pi ON feature_orders(payment_intent);
CREATE TABLE IF NOT EXISTS stripe_events (
  id          TEXT PRIMARY KEY,                    -- Stripe event id (evt_...); recorded only after the event was handled
  type        TEXT,
  received_at TEXT DEFAULT (datetime('now'))
);
