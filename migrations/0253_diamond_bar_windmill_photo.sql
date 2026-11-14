-- Diamond Bar Windmill Lighting Ceremony had no photo. Its city page (diamondbarca.gov/1117/Windmill-Lighting-Ceremony) has one: the lit windmill with the red bow (file windmill2023-117, 1733x2600, about 0.35 MB).
-- scripts/photo_pass.py skipped it because it is a tall portrait photo (width/height 0.67, the old limit was 0.8); the limit is now 0.55. A city event may use the city's own photo.
-- Only filled when the event still has no photo.
UPDATE events SET image='https://www.diamondbarca.gov/ImageRepository/Document?documentID=11910', updated_at=datetime('now') WHERE id='diamond-bar-windmill-lighting' AND (image IS NULL OR image='');
