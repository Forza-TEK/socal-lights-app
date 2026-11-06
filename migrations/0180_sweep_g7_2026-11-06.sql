INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g7-jingle-fest-26','Jingle Fest ''26','Los Angeles','Santa Clarita','tree','2026-11-14','2026-11-14','confirmed',1,'Free','Sat 10am–5pm',34.4363759,-118.5190816,'Holiday shopping fair with 275+ artisans and vendors, Santa Claus, all-day live entertainment, food trucks and adult beverages.','https://www.antelopevalley.com/events/jingle-fest-26/','christmas','Central Park','27150 Bouquet Canyon Rd, Santa Clarita, CA 91350')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
