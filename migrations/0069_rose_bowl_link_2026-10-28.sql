-- Rose Bowl AmericaFest: the event page 404s; point to the stadium's events listing (loads, 2026-10-28). Event kept as expected per the owner.
UPDATE events SET url='https://www.rosebowlstadium.com/events',
  hours=CASE WHEN hours LIKE '%check site' THEN hours ELSE hours || ' — check site' END,
  updated_at=datetime('now') WHERE id='rose-bowl-americafest';
