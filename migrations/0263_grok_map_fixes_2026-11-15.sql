-- Fixes from Grok's handoff request (docs/handoff/to-claude/2026-11-15-map-fixes-from-update-call.md), checked against the official pages on 2026-11-15.
-- The Grove (https://www.thegrovela.com/events, 2026 listing): tree lighting on Nov 16; nightly snowfall Nov 17 to Dec 31 at 6pm. The map had one event Nov 16 to Jan 3, so it is split in two.
UPDATE events SET name='Christmas at The Grove: Tree Lighting', start_date='2026-11-16', end_date='2026-11-16', hours='Evening; check site',
  blurb='The 25th annual tree lighting celebration at The Grove. Nightly snowfall starts the next evening.', updated_at=datetime('now') WHERE id='grove';
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES
('grove-snowfall','Nightly Snowfall at The Grove','Los Angeles','Fairfax','show','2026-11-17','2026-12-31','expected',1,'Free','6pm; check site',34.07308,-118.35841,'Snow falls over The Grove each evening through Dec 31. Free; check the official page for show times.','https://www.thegrovela.com/events','christmas','The Grove','189 The Grove Dr, Los Angeles, CA 90036')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, start_date=excluded.start_date, end_date=excluded.end_date, hours=excluded.hours, blurb=excluded.blurb, url=excluded.url, updated_at=datetime('now');
-- Old Pasadena Holidays (https://www.oldpasadena.org/visit/events/category/9/holiday-and-seasonal, 2026 listing): Nov 4, 2026 to Jan 6, 2027, no times. The map started Nov 13. The hours stay an estimate, so it stays expected.
UPDATE events SET start_date='2026-11-04', updated_at=datetime('now') WHERE id='pasadena';
