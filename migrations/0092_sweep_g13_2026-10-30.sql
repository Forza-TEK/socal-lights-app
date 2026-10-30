INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g13-mt-helix-turkey-trot-walk','Mt. Helix Turkey Trot Community Walk','San Diego','La Mesa','trot','2026-11-27','2026-11-27','confirmed',1,'Free','10 AM; coffee and donuts at the top',32.7701830,-116.9794250,'Free one-mile community walk to the summit of Mt. Helix Park the day after Thanksgiving, with coffee and donuts in the amphitheater.','https://mthelixpark.org/','christmas','Mt. Helix Park (start at Fire Station lot)','10105 Vivera Dr, La Mesa, CA 91941'),
('g13-christmas-on-mt-helix','Christmas on Mt. Helix','San Diego','La Mesa','tree','2026-12-05','2026-12-05','confirmed',1,'Free','3-8 PM',32.7670756,-116.9826932,'Free hilltop Christmas market with Santa photos, hot chocolate, kids'' crafts, food trucks, live music and caroling; shuttles run from Grossmont High School.','https://mthelixpark.org/christmas','christmas','Mt. Helix Park','4901 Mt Helix Dr, La Mesa, CA 91941')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
