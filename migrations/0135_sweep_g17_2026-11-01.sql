INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g17-chino-hills-boat-parade','Chino Hills Boat Parade','San Bernardino','Chino Hills','parade','2026-12-11','2026-12-11','confirmed',0,'Not listed','7:00 PM',34.0002851,-117.7305419,'The city''s annual boat parade, held with the Kiwanis Club of Chino Hills; decorated boats are towed along City Center Dr and Peyton Dr.','https://www.chinohills.org/boatparade','christmas','City Center Dr at The Shoppes (parade start)','13920 City Center Dr, Chino Hills, CA 91709'),
('g17-chino-hills-breakfast-santa','Breakfast with Santa (Chino Hills)','San Bernardino','Chino Hills','tree','2026-12-19','2026-12-19','confirmed',0,'$21 per person (ages 1 and up)','9:00–11:00 AM',33.9925531,-117.7334414,'Ticketed breakfast with Santa at the Chino Hills Community Center; tickets go on sale Nov 10 at 7:30 AM and all sales are final.','https://www.chinohills.org/1359/Breakfast-with-Santa','christmas','Chino Hills Community Center','14250 Peyton Dr, Chino Hills, CA 91709')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
