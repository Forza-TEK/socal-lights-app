-- Three Salvation Army Thanksgiving meals say "Free in past years" (an estimate, not this year's confirmed price) but had free=1.
-- The free flag is 1 only when the price text starts with "Free" for this year, so set it to 0; price text is left as is.
UPDATE events SET free=0, updated_at=datetime('now') WHERE id='tg-salvation-army-centre-city' AND free=1;
UPDATE events SET free=0, updated_at=datetime('now') WHERE id='tg-salvation-army-oceanside' AND free=1;
UPDATE events SET free=0, updated_at=datetime('now') WHERE id='tg-salvation-army-el-cajon' AND free=1;
-- Mt. Helix Turkey Trot Community Walk is in the unincorporated community Casa de Oro-Mount Helix, not La Mesa (same fix as 0277).
-- Only the city key changes (county stays San Diego; pin ~1.3 km from the community center; address kept).
UPDATE events SET city='Casa de Oro-Mount Helix', updated_at=datetime('now') WHERE id='g13-mt-helix-turkey-trot-walk' AND city='La Mesa';
