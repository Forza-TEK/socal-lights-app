-- For the "Contest passes" video only (LOCAL database): the demo organization (u:maria@demo.example) must have NO live contest in the window and NO comp,
-- so the wizard's Review screen shows the pass picker (single contest, up to 5, up to 20). Never run against the live database.
DELETE FROM contest_comps WHERE org_key = 'u:maria@demo.example';
DELETE FROM contest_passes WHERE org_key = 'u:maria@demo.example';
UPDATE contests SET live_at = '' WHERE owner_id = 'u_org' AND id <> 'c_demo' AND id <> 'c_past';
