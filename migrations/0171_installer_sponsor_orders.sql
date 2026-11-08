-- Installer Sponsor placements are paid through the same orders table as Featured events and homes (feature_orders.target = 'installer';
-- event_id then holds the installer's id and plan is 'banner' or 'banner_top'). Add-only; nothing here changes an existing row.
ALTER TABLE feature_orders ADD COLUMN applied_top_until TEXT;   -- installers.top_until this order wrote (banner_top only)
ALTER TABLE feature_orders ADD COLUMN applied_from TEXT;        -- first day of the paid window
ALTER TABLE feature_orders ADD COLUMN prev_banner_until TEXT;   -- what an admin had set by hand before this order, put back on a refund
ALTER TABLE feature_orders ADD COLUMN prev_top_until TEXT;
