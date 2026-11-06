-- Event organizer tiers (2026-11-06): an event can now buy the labelled "Featured" strip pill at the top of the map list (a banner) in addition to the
-- Featured pin (events.featured level 1) and Top of the list (level 2). The banner has its own end date, like installers.banner_until.
-- Add-only. Nothing here changes an existing row: every event starts with no banner.
ALTER TABLE events ADD COLUMN banner_until TEXT;                 -- last day (Pacific, inclusive) the event shows as a pill in the banner strip; NULL or past = off
ALTER TABLE feature_orders ADD COLUMN applied_banner_until TEXT;  -- events.banner_until this order wrote (event plans with a banner only); NULL otherwise
-- banner_stats (migration 0169) is reused for events: installer_id holds "ev:<event id>" for an event (imp = shown, click = taps). Totals only, no person is recorded.
