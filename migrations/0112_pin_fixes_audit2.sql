-- Pin audit round 2: geocode of the listed address (house number and ZIP both match) was 120 m - 2 km from the stored pin. Shopping centers, outlets and parks (Santa Anita, Promenade, Camarillo Outlets, Chula Vista Center, Hollenbeck Park) left alone: their stored pin is inside the venue.
UPDATE events SET lat=33.831769, lng=-118.061489, updated_at=datetime('now') WHERE id='hw-forest-lawn-cypress-dia';
UPDATE events SET lat=34.055437, lng=-118.084733, updated_at=datetime('now') WHERE id='hw-rosemead-trunk-or-treat';
UPDATE events SET lat=33.898112, lng=-117.552928, updated_at=datetime('now') WHERE id='ev-kids-markets-halloween-corona';
UPDATE events SET lat=34.202934, lng=-118.159106, updated_at=datetime('now') WHERE id='hw-altadena-trick-or-treat-village';
UPDATE events SET lat=34.099655, lng=-117.373428, updated_at=datetime('now') WHERE id='g17-rialto-halloween-hi-jinks';
UPDATE events SET lat=34.42222, lng=-119.698902, updated_at=datetime('now') WHERE id='g20-presidio-dia-de-los-muertos';
UPDATE events SET lat=33.124329, lng=-117.086945, updated_at=datetime('now') WHERE id='hw-escondido-dia';
UPDATE events SET lat=33.747539, lng=-116.990206, updated_at=datetime('now') WHERE id='g15-warrior-zone-trunk-or-treat';
UPDATE events SET lat=34.148651, lng=-118.00208, updated_at=datetime('now') WHERE id='hw-monrovia-halloween-bash';
