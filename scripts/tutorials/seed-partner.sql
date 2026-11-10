-- For the "Event Partner" video (LOCAL database only): the demo event organizer (jamie@demo.example, u_mine) has an active plan for the current season and one event already covered,
-- so the Partner page shows "1 of 10 events used", the covered event with its badge, and "Use the plan" next to the other event. Both candidate organization keys are seeded
-- (an email at a website is matched as "d:<domain>", otherwise the person's own "u:<email>"). Never run against the live database.
DELETE FROM event_partner_plans WHERE session_id LIKE 'demo-plan-%';
DELETE FROM event_partner_events WHERE org_key IN ('d:demo.example', 'u:jamie@demo.example');
DELETE FROM event_partner_comps WHERE org_key IN ('d:demo.example', 'u:jamie@demo.example');
INSERT INTO event_partner_plans (session_id, org_key, season_key, season_start, season_end, cap, cents, status, user_id) VALUES ('demo-plan-d', 'd:demo.example', 'christmas', '2026-11-03', '2027-01-06', 10, 14900, 'active', 'u_mine');
INSERT INTO event_partner_plans (session_id, org_key, season_key, season_start, season_end, cap, cents, status, user_id) VALUES ('demo-plan-u', 'u:jamie@demo.example', 'christmas', '2026-11-03', '2027-01-06', 10, 14900, 'active', 'u_mine');
INSERT INTO event_partner_events (event_id, season_start, org_key, source_session, applied_from, applied_until, applied_featured, status, user_id) VALUES ('ev-oak-hill-holiday-market', '2026-11-03', 'd:demo.example', 'demo-plan-d', date('now'), '2026-12-07', 1, 'active', 'u_mine');
INSERT INTO event_partner_events (event_id, season_start, org_key, source_session, applied_from, applied_until, applied_featured, status, user_id) VALUES ('ev-oak-hill-holiday-market', '2026-11-03', 'u:jamie@demo.example', 'demo-plan-u', date('now'), '2026-12-07', 1, 'active', 'u_mine');
UPDATE events SET featured = 1, featured_until = '2026-12-07', partner_until = '2026-12-07', partner_verified = 0 WHERE id = 'ev-oak-hill-holiday-market';
