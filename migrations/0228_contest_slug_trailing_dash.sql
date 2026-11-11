-- A contest whose name was cut at 40 characters could get a web address ending in "-" (the live Covina contest:
-- light-up-the-town-holiday-home-lighting-). New contests no longer do that; this trims the ones that exist.
-- The old address keeps working: /c/<slug>- redirects to /c/<slug> (functions/_lib/contests.js trimmedSlugFor), so printed QR codes still open the contest.
-- The contest's map event id is c-<slug> cut to 40 characters and is stored in contests.event_id, so it does not change.
-- Skipped for a contest whose trimmed address is already taken by another contest.
UPDATE contests
   SET slug = rtrim(slug, '-')
 WHERE slug LIKE '%-'
   AND rtrim(slug, '-') != ''
   AND NOT EXISTS (SELECT 1 FROM contests o WHERE o.slug = rtrim(contests.slug, '-'));
