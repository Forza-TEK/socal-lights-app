INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g5-avalon-tree-lighting','Shop Catalina Holiday Kick Off & Tree Lighting','Los Angeles','Avalon','tree','2026-12-05','2026-12-05','confirmed',1,'Free','12pm-8pm',33.3436135,-118.3251103,'Avalon kicks off the holiday season at the pier with shopping and the community tree lighting.','https://allevents.in/avalon/shop-catalina-holiday-kick-off-and-tree-lighting/200030004525741','christmas','Green Pleasure Pier','1 Green Pleasure Pier, Avalon, CA 90704'),
('g5-lomita-tree-lighting','Lomita Tree Lighting Ceremony','Los Angeles','Lomita','tree','2026-12-04','2026-12-04','expected',1,'Free','Evening, check site',33.8047664,-118.3192262,'Downtown Lomita lights its holiday tree with performances, family activities and a visit from Santa; this year''s date is not posted yet.','https://lomitacity.com/celebrating-community-lomitas-fall-winter-2025-events/','christmas','Downtown Lomita (Narbonne Ave)','Narbonne Ave near Lomita Blvd, Lomita, CA 90717'),
('g5-lomita-santa-museum','Santa at the Lomita Railroad Museum','Los Angeles','Lomita','tree','2026-12-06','2026-12-06','expected',1,'Free','11am-3:30pm, check site',33.7984205,-118.3187316,'Meet Santa, take photos and make holiday crafts at the Lomita Railroad Museum; this year''s date is not posted yet.','https://lomitacity.com/events/santa-at-the-museum/','christmas','Lomita Railroad Museum','2137 250th St, Lomita, CA 90717')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
