-- Christmas on Mt. Helix is in the unincorporated community Casa de Oro-Mount Helix, not the city of La Mesa.
-- Only the city key changes (county stays San Diego; pin is ~1.3 km from the new city center; street address kept).
UPDATE events SET city='Casa de Oro-Mount Helix', updated_at=datetime('now') WHERE id='g13-christmas-on-mt-helix' AND city='La Mesa';
