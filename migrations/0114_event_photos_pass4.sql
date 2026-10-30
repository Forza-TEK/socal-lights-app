-- Photo pass 4 (scripts/photo_pass.py over 492 pages): 14 of 15 candidates were logos, a black frame, a landscape or a photo shared by unrelated homes, so only the Chino parade photo was kept.
UPDATE events SET image='https://www.cityofchino.org/ImageRepository/Document?documentID=5187', updated_at=datetime('now') WHERE id='pv-chino-youth-christmas-parade' AND (image IS NULL OR image='');
