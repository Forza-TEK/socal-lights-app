-- City sweep group 19 (Ventura County) 2026-11-15
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g19-rubicon-christmas-carol','A Christmas Carol: A Ghost Story (Rubicon Theatre)','Ventura','Ventura','show','2026-12-02','2026-12-24','confirmed',0,'Ticketed','Times vary; check site','34.2806151','-119.285263','Tony winner Jefferson Mays plays more than 50 roles in this one-man retelling of the Dickens classic at the Rubicon.','https://rubicontheatre.org/events/a-christmas-carol-a-ghost-story/','christmas','Rubicon Theatre Company','1006 E Main St, Ventura, CA 93001'),
('g19-gingerbread-exhibit-oxnard','Gingerbread House Exhibit & Tours (Heritage Square)','Ventura','Oxnard','tour','2026-12-06','2027-01-10','confirmed',1,'Free; weekend home tours $5','11am–2pm; select dates','34.1947531','-119.1786867','Gingerbread houses on display at Heritage Square, then at Centennial Plaza from Dec 18, with paid weekend tours of the Victorian homes.','https://visitoxnard.com/events/oxnard-holidays/gingerbread-house-exhibit-tours/','christmas','Heritage Square','715 S A St, Oxnard, CA 93030'),
('g19-santa-paws-riverpark','Santa Paws Pet Photo Nights at The Collection','Ventura','Oxnard','tree','2026-11-24','2026-12-15','confirmed',0,'Reservations required','Tuesdays 5pm–8pm','34.23977','-119.17844','Bring the dog for photos with Santa on four Tuesday evenings at The Collection at RiverPark.','https://visitoxnard.com/blog/holiday-events-oxnard/','christmas','The Collection at RiverPark','600 Town Center Dr, Oxnard, CA 93036')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
