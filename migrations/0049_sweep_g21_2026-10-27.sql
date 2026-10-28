INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('fairmont-grand-del-mar-tree-lighting','Tree Lighting at Fairmont Grand Del Mar','San Diego','San Diego','tree','2026-11-30','2026-11-30','confirmed',0,'$25 per person; ages 3 and under free','Grand Social 5–10pm; lighting 6:30pm',32.9382468,-117.1971517,'The resort lights its holiday tree with Santa, dancers and optional Glice skating at Grand Social.','https://www.fairmont.com/en/hotels/san-diego/fairmont-grand-del-mar/special-events/tree-lighting.html','christmas','Fairmont Grand Del Mar','5300 Grand Del Mar Ct, San Diego, CA 92130')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
