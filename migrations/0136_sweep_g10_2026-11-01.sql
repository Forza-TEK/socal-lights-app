-- City sweep group 10 (North OC) 2026-11-01: photo for a Yorba Linda contest home.
-- Source: City of Yorba Linda Holiday Decorating Contest story map (item resource; photo shows the 4201 house number).
UPDATE events SET image='https://www.arcgis.com/sharing/rest/content/items/8cca452b6f2d474b8426a8c1882278df/resources/MG3OizoRetOvGvlVEkftz.jpg', updated_at=datetime('now') WHERE id='contest-4201-sand-rock-circle-yorba' AND (image IS NULL OR image='');
