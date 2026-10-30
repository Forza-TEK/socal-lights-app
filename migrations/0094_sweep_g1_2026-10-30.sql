-- City sweep group 1 (Central LA & Westside) 2026-10-30
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('westchester-st-jerome-craft-faire','St. Jerome Holiday Craft Faire','Los Angeles','Westchester','tree','2026-11-21','2026-11-22','confirmed',1,'Free','Sat 9am-4pm, Sun 8am-2pm',33.9731266,-118.3773002,'Parish holiday craft fair with over 40 vendors, raffles and breakfast and lunch, with free admission and parking.','https://www.westchestermhg.org/','christmas','Saint Jerome''s Hall','5550 Thornburn St, Los Angeles, CA 90045'),
('santa-monica-turkey-day-trot','Turkey Day Trot: Stride for Peace 5K','Los Angeles','Santa Monica','trot','2026-11-26','2026-11-26','confirmed',0,'$31-$43','Check-in 6:30am, 5K 8am, 1-miler 8:15am, kids dash 9am',34.005443,-118.489724,'Thanksgiving morning 5K with a family 1-miler and kids dash at Crescent Bay Park above the beach.','https://runsignup.com/Race/CA/SantaMonica/SantaMonicaTurkeyTrotKKHalfMarathon','christmas','Crescent Bay Park','2000 Ocean Ave, Santa Monica, CA 90405')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
