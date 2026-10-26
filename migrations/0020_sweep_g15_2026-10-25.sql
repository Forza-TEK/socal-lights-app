-- City sweep, group 15 (Southwest Riverside & the Pass), run 2026-10-25 (gap left by earlier group-15 runs today)
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES
('le-outlets-fangtastic-halloween','Fangtastic Halloween at the Outlets at Lake Elsinore','Riverside','Lake Elsinore','family','2026-10-31','2026-10-31','confirmed',1,'Free','4–6:30pm',33.69867,-117.34935,'Free Halloween afternoon at the outlet center: kids trick-or-treat at participating stores, with photo spots around the center.','https://www.outletsatlakeelsinore.com/event/43729-free-fangtastic-halloween-event','halloween','The Outlets at Lake Elsinore','17600 Collier Ave, Lake Elsinore, CA 92530')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
