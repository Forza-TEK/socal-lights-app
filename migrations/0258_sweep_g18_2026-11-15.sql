-- City sweep group 18 (High Desert, Big Bear and Mountains) 2026-11-15
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g18-santa-paws-big-bear-zoo','Santa Paws at Big Bear Zoo','San Bernardino','Big Bear Lake','tree','2026-12-12','2026-12-19','confirmed',0,'Regular zoo admission','11:30am–3pm','34.239526','-116.869223','Meet Santa, take photos against a winter backdrop and see the animals in their snowy habitats; Big Bear High School carolers perform. Dates are Dec 12 and 19.','https://www.bigbear.com/events/santa-paws-at-big-bear-zoo/','christmas','Big Bear Alpine Zoo','42801 Moonridge Rd, Big Bear Lake, CA 92315'),
('g18-mountain-christmas-boutique','Mountain Christmas Boutique','San Bernardino','Big Bear Lake','tree','2026-11-27','2026-11-28','confirmed',0,'$2-$3','11am–6pm','34.2605002','-116.866911','Two-day indoor holiday market of local vendors with handmade gifts, decor and treats, kids crafts and daily Santa visits; locals free Saturday.','https://www.destinationbigbear.com/blog/mountain-christmas-boutique','christmas','Big Bear Convention Center','42900 Big Bear Blvd, Big Bear Lake, CA 92315'),
('g18-big-bear-ghost-story-christmas','A Ghost Story of Christmas (Big Bear Theatre Project)','San Bernardino','Big Bear Lake','show','2026-12-17','2026-12-20','confirmed',0,'Ticketed','Times vary; check site','34.2379196','-116.9354768','Big Bear Theatre Project stages its original ghostly adaptation of Dickens'' A Christmas Carol at the Performing Arts Center.','https://www.bigbear.com/event/?id=3358','christmas','Big Bear Performing Arts Center','39707 Big Bear Blvd, Big Bear Lake, CA 92315')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
