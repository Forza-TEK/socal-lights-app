-- Buyer emails when a paid Featured placement (event or home) is about to end and when it has ended (functions/_lib/placementmail.js, daily job "placement-notices").
-- One timestamp each, so an email is sent once per order and kind. Orders whose placement already ended before this ran are marked so nobody is emailed about an old order.
ALTER TABLE feature_orders ADD COLUMN ending_notice_at TEXT;
ALTER TABLE feature_orders ADD COLUMN ended_notice_at TEXT;
UPDATE feature_orders SET ending_notice_at = 'before-notices', ended_notice_at = 'before-notices' WHERE applied_until IS NULL OR applied_until < date('now', '-1 day');
-- Starts the clock for the new job so it is not flagged before its first run.
INSERT OR IGNORE INTO job_heartbeats (job) VALUES ('placement-notices');
