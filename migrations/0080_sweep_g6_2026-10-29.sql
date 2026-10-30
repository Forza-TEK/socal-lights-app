INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g6-ccpa-merry-achi-christmas','A Merry-achi Christmas','Los Angeles','Cerritos','show','2026-12-04','2026-12-06','confirmed',0,'Ticketed; see venue','Dec 4 & 5 at 7pm, Dec 6 at 2pm',33.8676901,-118.0615738,'A mariachi holiday concert with festive songs and dance at the Cerritos Center for the Performing Arts.','https://www.discoverlosangeles.com/event/2026/12/05/a-merry-achi-christmas','christmas','Cerritos Center for the Performing Arts','12700 Center Court Drive, Cerritos, CA 90703')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
