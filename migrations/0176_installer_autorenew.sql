-- Optional automatic renewal of an installer's Sponsor placement (default OFF). Add-only.
-- One row per installer profile. Only Stripe ids are stored (customer and payment method): never a card number.
CREATE TABLE IF NOT EXISTS installer_autorenew (
  installer_id             TEXT PRIMARY KEY,
  user_id                  TEXT,                              -- the account that agreed (cleared on account deletion with the row)
  stripe_customer_id       TEXT,
  stripe_payment_method_id TEXT,
  plan                     TEXT NOT NULL DEFAULT 'banner',    -- banner | banner_top: the plan that renews
  enabled                  INTEGER NOT NULL DEFAULT 0,        -- 1 = may be charged
  status                   TEXT NOT NULL DEFAULT 'active',    -- active | paused (refund or dispute) | lapsed (two failed charges) | cancelled
  consent_text_version     TEXT,                              -- which wording the buyer saw (the text is a versioned constant in functions/_lib/renewal.js)
  consent_at               TEXT,
  consent_session_id       TEXT,                              -- the Stripe Checkout session the consent came with (makes enrolling replay-safe)
  next_charge_date         TEXT,                              -- Pacific date: the last day of the running placement
  notice_sent_for          TEXT,                              -- the charge date the 7-day reminder was sent for
  retry_at                 TEXT,                              -- date of the one retry after a failed charge
  attempts                 INTEGER NOT NULL DEFAULT 0,        -- failed charges for this renewal (0, 1; at 2 the renewal lapses)
  last_error               TEXT,                              -- a short Stripe decline code or message, never card data
  last_paid_cents          INTEGER,                           -- what the buyer last paid, to say when the price changed
  cancel_token             TEXT,                              -- unguessable; the cancel link in every email carries it (no login needed)
  cancelled_at             TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_installer_autorenew_due ON installer_autorenew(status, enabled, next_charge_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_installer_autorenew_token ON installer_autorenew(cancel_token);
-- An order made by an automatic charge is marked here (Admin > Orders shows "auto-renewal"; a refund or dispute of it pauses the renewal).
ALTER TABLE feature_orders ADD COLUMN renewal INTEGER NOT NULL DEFAULT 0;
-- The exact wording the buyer agreed to (rendered with the price at that time), kept as evidence next to the version and time.
ALTER TABLE installer_autorenew ADD COLUMN consent_text TEXT;
-- One claimed row per (installer, season start, attempt) BEFORE any Stripe call, so a cron overlap, a retry after a timeout or a manual run can never charge twice.
-- status: pending (claimed, outcome unknown: the next run repeats the same Stripe idempotency key) | done (answered: charged or declined).
CREATE TABLE IF NOT EXISTS installer_renewal_attempts (
  installer_id TEXT NOT NULL,
  season_from  TEXT NOT NULL,
  attempt      INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  payment_intent TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (installer_id, season_from, attempt)
);
-- The dates and amount a Sponsor buyer was quoted at checkout, kept on the order (the webhook applies exactly these, or holds the order for a refund if they no longer fit).
ALTER TABLE feature_orders ADD COLUMN quote_from TEXT;
ALTER TABLE feature_orders ADD COLUMN quote_to TEXT;
