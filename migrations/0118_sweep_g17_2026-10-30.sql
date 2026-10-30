-- City sweep group 17 (San Bernardino Valley & West End) 2026-10-30
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g17-samhains-lot-rancho','Samhain''s Lot Witch House Yard Haunt','San Bernardino','Rancho Cucamonga','haunt','2026-10-30','2026-10-31','confirmed',0,'See listing','7-10pm',34.14037,-117.56929,'All-ages yard haunt built around a Witch House, open the last two nights of the Halloween run.','https://socalhauntlist.com/events/samhains-lot','halloween','Samhain''s Lot home haunt','6351 Semillon Pl, Rancho Cucamonga, CA 91737')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');

UPDATE events SET image='https://arv3-288041544.imgix.net/media/7a730c06-4a73-486e-9738-1e07ba66dd3f.jpg?w=1200&h=630&fit=crop&crop=faces%2Centropy&q=75&auto=compress%2Cformat', updated_at=datetime('now') WHERE id='g17-redlands-tree-lighting' AND (image IS NULL OR image='');
