-- Weekly upkeep 2026-11-02
UPDATE events SET end_date='2027-01-03', updated_at=datetime('now') WHERE id='missioninn';
UPDATE events SET status='confirmed', hours='5-7pm', updated_at=datetime('now') WHERE id='g1-pershing-square-tree-lighting';
UPDATE events SET status='confirmed', updated_at=datetime('now') WHERE id='hollywood-christmas-parade';
UPDATE events SET start_date='2026-11-06', end_date='2027-01-10', status='confirmed', hours='Check site for hours', updated_at=datetime('now') WHERE id='wsg-kidspace-winter-frolic';
UPDATE events SET start_date='2026-11-07', end_date='2027-01-10', status='confirmed', price='$69-$89', hours='Thu-Sun; check site', updated_at=datetime('now') WHERE id='g18-skypark-christmas';
