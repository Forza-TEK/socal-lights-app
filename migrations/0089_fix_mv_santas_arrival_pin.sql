-- Santa's Arrival & Lighting Ceremony: pin was ~1.4 km from Mission Viejo City Hall (200 Civic Center); move it onto the address
UPDATE events SET lat=33.5967421, lng=-117.6597714, updated_at=datetime('now') WHERE id='mission-viejo-santas-arrival';
