-- Grok reported the ads as ct-a, ev-a, in-a... while the approved launch set is ct-a-meta, ev-a-meta, in-a-meta..., so Admin > Ads showed "Not in launch set" for each of them.
-- The report API now stores a short name under the approved id (functions/_lib/ads.js canonicalAdId). This renames the rows already stored the same way.
-- A short name is renamed only when its "-meta" version is an approved ad and has no report of its own yet (the id is the primary key).
-- When the "-meta" ad already has its own report (the live numbers), an old short-name row for the same ad is a stale duplicate (for example the Nov 9 report of six paused copies with $0 spend) and is deleted,
-- but only when it is not newer than the "-meta" one. Nothing in the live reports changes.
UPDATE ads_reports SET ad_id = ad_id || '-meta'
 WHERE ad_id NOT IN (SELECT id FROM ads_items)
   AND (ad_id || '-meta') IN (SELECT id FROM ads_items)
   AND (ad_id || '-meta') NOT IN (SELECT ad_id FROM ads_reports);
DELETE FROM ads_reports
 WHERE ad_id NOT IN (SELECT id FROM ads_items)
   AND EXISTS (SELECT 1 FROM ads_reports m WHERE m.ad_id = ads_reports.ad_id || '-meta' AND m.as_of >= ads_reports.as_of);
UPDATE ads_report_log SET ad_id = ad_id || '-meta'
 WHERE ad_id NOT IN (SELECT id FROM ads_items) AND (ad_id || '-meta') IN (SELECT id FROM ads_items);
