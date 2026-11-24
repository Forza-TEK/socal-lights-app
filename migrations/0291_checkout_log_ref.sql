-- Audit F-16: remember what each payment page was for, so a second payment page for the same event and plan (a second browser tab) can warn the buyer before they pay twice.
-- ref = "<event or home id>|<plan>", idem = the checkout's idempotency key (the same key means Stripe hands back the same page, so that is not a second page). Schema only: no existing data is touched.
ALTER TABLE checkout_log ADD COLUMN ref TEXT;
ALTER TABLE checkout_log ADD COLUMN idem TEXT;
CREATE INDEX IF NOT EXISTS idx_checkout_log_ref ON checkout_log(user_id, ref, created_at);
