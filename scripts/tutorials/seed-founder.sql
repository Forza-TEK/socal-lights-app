-- For the "Founder city badge" video (LOCAL database only): the demo organizer's two contests (the live one and the finished one) carry the Founder city badge,
-- through a comp with badge = 1 for the organization key u:maria@demo.example. Never run against the live database.
UPDATE contests SET org_key = 'u:maria@demo.example' WHERE id IN ('c_demo', 'c_past');
DELETE FROM contest_comps WHERE id = 'demo-founder';
INSERT INTO contest_comps (id, org_key, allowed, valid_until, note, created_by, badge, badge_until) VALUES ('demo-founder', 'u:maria@demo.example', 1, '2026-12-31', 'Founder city', 'recorder', 1, '2028-12-31');
-- The finished demo contest needs a real frozen result (the Past results tab reads it), or the tab shows nothing.
UPDATE contests SET announced = 1, results = '{"at":"2025-12-21","categories":["Best Traditional"],"entries":[{"id":"p_jamie25","no":1,"name":"The Kim Family","address":"22 Maple Street","city":"Irvine","photos":[],"votes":{"Best Traditional":14}},{"id":"p_ava25","no":2,"name":"The Lopez Family","address":"31 Maple Street","city":"Irvine","photos":[],"votes":{"Best Traditional":9}}],"awards":[{"category":"Best Traditional","kind":"public","label":"People''s Choice","ids":["p_jamie25"]}]}' WHERE id = 'c_past';
