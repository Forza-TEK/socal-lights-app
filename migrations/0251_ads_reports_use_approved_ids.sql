-- Grok reported the ads as ct-a, ev-a, in-a... while the approved launch set is ct-a-meta, ev-a-meta, in-a-meta..., so Admin > Ads showed "Not in launch set" for each of them.
-- The report API now stores a short name under the approved id (functions/_lib/ads.js canonicalAdId). This renames the rows already stored the same way.
-- A short name is renamed only when its "-meta" version is an approved ad and has no report of its own yet (the id is the primary key).
UPDATE ads_reports SET ad_id = ad_id || '-meta'
 WHERE ad_id NOT IN (SELECT id FROM ads_items)
   AND (ad_id || '-meta') IN (SELECT id FROM ads_items)
   AND (ad_id || '-meta') NOT IN (SELECT ad_id FROM ads_reports);
UPDATE ads_report_log SET ad_id = ad_id || '-meta'
 WHERE ad_id NOT IN (SELECT id FROM ads_items) AND (ad_id || '-meta') IN (SELECT id FROM ads_items);
