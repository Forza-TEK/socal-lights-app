-- Remove the five false "Deploy stalled alerts sent" rows from 2026-11-14 (Admin > Errors, last 7 days). They came from one Cloudflare Pages deployment record (0ff1f32e) that never closed;
-- the cause is fixed in functions/_lib/deploys.js. Narrow on purpose: kind deploy-stalled, detail "stuck" (the only problem kind those alerts carried), and only rows made on 2026-11-14 UTC.
-- Any real alert, before or after that day, is left alone.
DELETE FROM ops_log WHERE kind = 'deploy-stalled' AND detail LIKE 'stuck%' AND created_at >= '2026-11-14 00:00:00' AND created_at < '2026-11-15 00:00:00';
