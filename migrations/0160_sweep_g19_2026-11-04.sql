-- City sweep group 19 (Ventura County) 2026-11-04
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g19-reagan-american-christmas','An American Christmas at the Reagan Library','Ventura','Simi Valley','tree','2026-11-14','2027-01-03','confirmed',0,'Check listing','Daily 10am–5pm (closed Thanksgiving, Christmas, New Year''s Day); Santa on select days',34.2596,-118.8201,'Annual exhibit of Christmas trees that each reflect an era of American history, with Santa visits on select days, included with museum admission.','https://www.reaganfoundation.org/library-museum/special-exhibits/an-american-christmas','christmas','Ronald Reagan Presidential Library & Museum','40 Presidential Dr, Simi Valley, CA 93065')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
UPDATE events SET image='https://visitoxnard.com/imager/cmsimages/main-images/1359465/Tree-Lighting-The-Collection-4_91852798b59be8b28fc00edfe4aec23a.jpeg', updated_at=datetime('now') WHERE id='oxnard-plaza-park-tree-lighting' AND (image IS NULL OR image='');
