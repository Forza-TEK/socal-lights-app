-- City sweep group 18 (High Desert & Mountains) 2026-11-09
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g18-big-bear-menorah-lighting','Grand Menorah Lighting & Chanukah Celebration','San Bernardino','Big Bear Lake','tree','2026-12-06','2026-12-06','confirmed',1,'Free','4:30-5:30pm',34.243,-116.91,'Chanukah celebration and grand menorah lighting in the Village at Big Bear Lake, listed by Visit Big Bear for Sunday, Dec 6.','http://www.bigbear.com/events/grand-menorah-lighting-chanukah-celebration/','christmas','The Village at Big Bear Lake','Pine Knot Ave & Village Dr, Big Bear Lake, CA 92315')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
UPDATE events SET image='https://www.bigbear.com/imager/files_idss_com/C347/a581393c-5969-46bb-92f3-7ac1e8ed4180_bc0d2157d501d4729a3d5631708a6b2e.jpg', updated_at=datetime('now') WHERE id='g18-big-bear-menorah-lighting' AND (image IS NULL OR image='');
