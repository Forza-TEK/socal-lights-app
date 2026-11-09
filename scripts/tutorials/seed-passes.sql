-- For the "Contest passes" video only (LOCAL database): the demo organization's live contest went live 40 days ago, so its free contest in the 12-month window is used
-- and creating a second contest shows the pass picker instead. Never run against the live database.
UPDATE contests SET live_at = date('now', '-40 day'), org_key = 'u:maria@demo.example' WHERE id = 'c_demo';
DELETE FROM contests WHERE owner_id = 'u_org' AND id <> 'c_demo' AND id <> 'c_past';
