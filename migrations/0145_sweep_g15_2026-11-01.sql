-- City sweep group 15 (Southwest Riverside & the Pass) 2026-11-01: pin audit fixes (Nominatim, house number matched)
UPDATE events SET lat=33.5025, lng=-117.1479, updated_at=datetime('now') WHERE id='temecula-tree-lighting';
UPDATE events SET lat=33.9470, lng=-116.9668, updated_at=datetime('now') WHERE id='g15-beaumont-dia-de-los-muertos';
