-- Founder city badge and the two founding comps (owner request 2026-11-09). Add-only; safe to re-run.
--   contest_comps.badge       : 1 = this comp also carries the "Founder city" badge.
--   contest_comps.badge_until : last day the badge shows (the badge has its own end date, so it can outlast the free contest). '' = until valid_until.
-- The badge shows on an organization's contests only while a comp with badge = 1 is not revoked and today <= badge_until. It is a label only: it never changes results, votes, judging,
-- ranking or order, and it does not imply the city endorses anything. Ending (revoking) the comp hides it.
ALTER TABLE contest_comps ADD COLUMN badge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contest_comps ADD COLUMN badge_until TEXT NOT NULL DEFAULT '';

-- Eastvale (eastvaleca.gov) and Covina (covinaca.gov): ONE free contest (allowed = 1: the comp rule counts total contests per 12-month window), created by 2026-12-31; after that the normal pass prices apply.
-- The badge keeps showing through 2028-12-31. Fixed ids make a re-run a no-op; an organization key is "d:" + registrable host.
INSERT INTO contest_comps (id, org_key, allowed, valid_until, note, created_by, badge, badge_until) VALUES ('founder-city-eastvaleca-gov', 'd:eastvaleca.gov', 1, '2026-12-31', 'Founder city', 'system:founder-city', 1, '2028-12-31')
  ON CONFLICT(id) DO NOTHING;
INSERT INTO contest_comps (id, org_key, allowed, valid_until, note, created_by, badge, badge_until) VALUES ('founder-city-covinaca-gov', 'd:covinaca.gov', 1, '2026-12-31', 'Founder city', 'system:founder-city', 1, '2028-12-31')
  ON CONFLICT(id) DO NOTHING;
