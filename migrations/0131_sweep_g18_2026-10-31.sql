INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('hd-jt-library-winter-luau','Library Winter Luau (Joshua Tree)','San Bernardino','Joshua Tree','tree','2026-12-12','2026-12-12','confirmed',0,'Not listed','1:00–2:00 PM',34.1356218,-116.3149626,'Hawaiian-themed Christmas party at the library with a craft, holiday songs with a tropical twist and games; ukuleles welcome.','https://library.sbcounty.gov/event/library-winter-luau-2-joshuatree/','christmas','Joshua Tree Branch Library','6465 Park Blvd, Joshua Tree, CA 92252')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
