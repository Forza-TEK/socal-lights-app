-- City sweep group 18 (High Desert & Mountains) 2026-11-11.
-- Magic in the Cove: county calendar bosd3.sbcounty.gov/event/magic-in-the-cove-lucerne-valley-2/ (2025 run Dec 6-31); 2026 dates not posted yet, so expected.
-- Geocode: US Census geocoder, 30125 Cherwell St, Lucerne Valley, CA 92356.
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g18-magic-in-the-cove-lucerne-valley','Magic in the Cove','San Bernardino','Lucerne Valley','drive','2026-12-06','2026-12-31','expected',1,'Free','Nightly; check site',34.478675,-117.005789,'Free nightly holiday light show at The Cove: watch from your car with the music on 105.7 FM or stroll through Santa''s Village.','https://bosd3.sbcounty.gov/event/magic-in-the-cove-lucerne-valley-2/','christmas','The Cove','30125 Cherwell St, Lucerne Valley, CA 92356')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
