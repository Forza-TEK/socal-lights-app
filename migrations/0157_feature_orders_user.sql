-- Featured orders belong to the account that paid (checkout now requires sign-in). Add-only; 0065 and 0155 are untouched.
ALTER TABLE feature_orders ADD COLUMN user_id TEXT;   -- users.id of the buyer; NULL on orders made before accounts were required
CREATE INDEX IF NOT EXISTS idx_feature_orders_user ON feature_orders(user_id);

-- Event claims: a signed-in person says "this event is mine". An APPROVED claim only lets them buy a Featured placement for that
-- event; it gives no edit rights. Auto-approved when their business email domain matches the event's own website, else the admin decides.
CREATE TABLE IF NOT EXISTS event_claims (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  email      TEXT,
  method     TEXT,                          -- domain | admin
  status     TEXT DEFAULT 'pending',        -- pending | approved | declined
  note       TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  decided_at TEXT,
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_claims_status ON event_claims(status, created_at);
