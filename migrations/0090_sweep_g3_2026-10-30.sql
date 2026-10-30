-- City sweep group 3 (West San Gabriel Valley) 2026-10-30
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('san-gabriel-turkey-trot-2026','San Gabriel Turkey Trot','Los Angeles','San Gabriel','trot','2026-11-14','2026-11-14','confirmed',0,'$15–$50','Check-in 6am; 5K and 2.5K at 7am, kids races to 8:30am',34.0967264,-118.1068683,'The city''s 49th annual Thanksgiving-season fun run at Plaza Park with 5K, 2.5K, kids 1K and a toddler dash.','https://www.sangabrielcity.com/TurkeyTrot','christmas','Plaza Park','428 S Mission Dr, San Gabriel, CA 91776')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
