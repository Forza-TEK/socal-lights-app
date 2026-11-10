-- For the "Founder city badge" video (LOCAL database only): the demo organizer's two contests (the live one and the finished one) carry the Founder city badge,
-- through a comp with badge = 1 for the organization key u:maria@demo.example. Never run against the live database.
UPDATE contests SET org_key = 'u:maria@demo.example' WHERE id IN ('c_demo', 'c_past');
DELETE FROM contest_comps WHERE id = 'demo-founder';
INSERT INTO contest_comps (id, org_key, allowed, valid_until, note, created_by, badge, badge_until) VALUES ('demo-founder', 'u:maria@demo.example', 1, '2026-12-31', 'Founder city', 'recorder', 1, '2028-12-31');
