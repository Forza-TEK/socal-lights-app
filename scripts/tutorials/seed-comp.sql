-- For the "Create a contest" videos (quick, custom) (LOCAL database only): gives the demo organization a founder-city style comp (one contest, through 2026-12-31),
-- so the Review screen shows the founding-partner line and Create contest works without a payment. Never run against the live database.
DELETE FROM contest_comps WHERE id = 'demo-comp';
INSERT INTO contest_comps (id, org_key, allowed, valid_until, note, created_by) VALUES ('demo-comp', 'u:maria@demo.example', 1, '2026-12-31', 'Demo comp', 'recorder');
