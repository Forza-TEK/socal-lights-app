-- Payments hardening (audit 2026-11-04, batch C). Add-only: nothing here changes an event.

-- A short note on an order: what the system saw ("[auto] ..." lines mean "needs a look") or what the owner wrote in Admin > Orders.
ALTER TABLE feature_orders ADD COLUMN note TEXT;   -- status also gains 'refund_due' (paid, but the owner must refund it in Stripe)

-- A refund or dispute that reached us before its order existed. When the order is created it is born refunded/disputed and never applied.
CREATE TABLE IF NOT EXISTS feature_pending_revocations (
  payment_intent TEXT PRIMARY KEY,
  kind           TEXT,                              -- refunded | disputed
  created_at     TEXT DEFAULT (datetime('now'))
);

-- One row per Checkout session we asked Stripe for, so one account cannot mint unlimited payment pages.
CREATE TABLE IF NOT EXISTS checkout_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_checkout_log_user ON checkout_log(user_id, created_at);
