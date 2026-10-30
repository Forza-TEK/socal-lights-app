-- City sweep group 16 (Coachella Valley), 2026-10-30 (explicit "Run GROUP 16" request).
-- Adds Blythe (no events on the map before). Both rows are expected: dates estimated from prior years
-- (2021 Dec 3-4, 2022 Dec 2-3, 2023 Dec 1-2: first weekend of December; 2025 parade held on Hobsonway).
-- Also fixes the Sunnylands pin (2.5 km north of the address).
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES
('g16-blythe-tree-lighting','Blythe City Christmas Tree Lighting','Riverside','Blythe','tree','2026-12-04','2026-12-04','expected',1,'Free','Expected Fri evening (about 5:30–7pm) – check site',33.6103,-114.5984,'The Blythe Chamber of Commerce lights the city tree at Hobsonway and Spring Street with Santa, Lions Club treats and a tree decorating contest.','https://www.pvvt.com/blythe_news/valley-holiday-traditions-return-blythe-chamber-hosting-tree-lighting-christmas-parade-winter-wonderfest/article_b411d1bc-8cc0-11ee-8c7f-c3552075710a.html','christmas','Hobsonway & Spring St','Hobsonway & Spring St, Blythe, CA 92226'),
('g16-blythe-christmas-parade','Blythe Christmas Parade & Winter Wonderfest','Riverside','Blythe','parade','2026-12-05','2026-12-05','expected',1,'Free','Expected Sat afternoon/evening, parade about 5pm – check site',33.6103,-114.5984,'The Chamber of Commerce parade rolls down Hobsonway, with the Winter Wonderfest street fair on Spring Street around it.','https://www.pvvt.com/blythe_news/blythe-s-2025-christmas-parade-winners-blythe-chamber-of-commerce-announces-results/article_1d699cfa-5a4f-4270-a735-3ee47ee350a1.html','christmas','Hobsonway & Spring St','Hobsonway & Spring St, Blythe, CA 92226')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
UPDATE events SET lat=33.7556, lng=-116.4081, updated_at=datetime('now') WHERE id='g16-sunnylands-days-of-los-muertos';
