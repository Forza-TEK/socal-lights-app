-- Showcase a House: separate street / state / ZIP, and who is posting (homeowner or professional installer).
-- `address` stays as the full one-line address (the map pin, directions and routes use it), now built from the new parts.
ALTER TABLE posts ADD COLUMN poster_type TEXT NOT NULL DEFAULT 'homeowner';
ALTER TABLE posts ADD COLUMN street TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN state TEXT NOT NULL DEFAULT 'CA';
ALTER TABLE posts ADD COLUMN zip TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN service_area TEXT NOT NULL DEFAULT '';

-- Any other row: street = the text before the first comma (an admin can add a ZIP from the edit dialog).
UPDATE posts SET street = trim(substr(address, 1, instr(address || ',', ',') - 1)) WHERE street = '' AND address <> '';

-- The four houses on the site today, with the city taken from the address (pins do not move).
UPDATE posts SET street = '22 Tuberose St', city = 'Ladera Ranch', zip = '92694', address = '22 Tuberose St, Ladera Ranch, CA 92694' WHERE id = 'a0c4c19a9cf94ea3';
UPDATE posts SET street = '25982 Dundee Dr', city = 'Lake Forest', zip = '92630', address = '25982 Dundee Dr, Lake Forest, CA 92630' WHERE id = '731756d300fc41f1';
UPDATE posts SET street = '50 San Sebastian', city = 'Rancho Santa Margarita', zip = '92688', address = '50 San Sebastian, Rancho Santa Margarita, CA 92688' WHERE id = '3f50d76639cd44fe';
UPDATE posts SET street = '835 Loma Vista Street', city = 'El Segundo', zip = '90245', address = '835 Loma Vista Street, El Segundo, CA 90245', poster_type = 'installer' WHERE id = '377c55677a574f02';
