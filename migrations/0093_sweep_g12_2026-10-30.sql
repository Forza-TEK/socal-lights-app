INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g12-christmas-in-valley-center','Christmas in Valley Center at Bates Nut Farm','San Diego','Valley Center','tree','2026-12-11','2026-12-12','confirmed',1,'Free (free hayrides, Santa and kids activities)','Fri Dec 11 4-8pm; Sat Dec 12 9:30am-2:30pm',33.2084534,-116.982001,'Santa arrives by fire truck on Friday and by Polar Express hayride on Saturday, with carols, the Grinch, free hayrides and kids crafts at the farm.','https://batesnutfarm.biz/blogs/events/christmas-in-valley-center','christmas','Bates Nut Farm','15954 Woods Valley Rd, Valley Center, CA 92082')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
