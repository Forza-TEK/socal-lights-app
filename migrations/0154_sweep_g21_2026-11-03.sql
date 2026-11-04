-- City sweep group 21 (region-wide sources) 2026-11-03: one gap found (Ocean Institute Parade of Lights premier viewing)
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g21-ocean-institute-parade-viewing','Parade of Lights Premier Viewing at the Ocean Institute','Orange','Dana Point','parade','2026-12-11','2026-12-11','confirmed',0,'$45','6-9 pm',33.4612065,-117.7067044,'Ticketed viewing of the Dana Point Boat Parade of Lights from the Ocean Institute historical wharf, with food and drinks for sale.','https://oceaninstitute.org/event/parade-of-lights-premier-viewing-2026/2026-12-11/','christmas','Ocean Institute','24200 Dana Point Harbor Dr, Dana Point, CA 92629')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
