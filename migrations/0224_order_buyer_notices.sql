-- Buyer emails about a payment that was not applied ("we are refunding it") and about a refund that was issued. One timestamp each, so an email is sent once.
-- Orders that already exist are marked so nobody is emailed about an old order the owner has already handled.
ALTER TABLE feature_orders ADD COLUMN not_applied_notice_at TEXT;
ALTER TABLE feature_orders ADD COLUMN refund_notice_at TEXT;
UPDATE feature_orders SET not_applied_notice_at = 'before-notices' WHERE status IN ('refund_due', 'refunded', 'held', 'disputed', 'dispute_won');
UPDATE feature_orders SET refund_notice_at = 'before-notices' WHERE status IN ('refunded', 'held', 'disputed', 'dispute_won');
