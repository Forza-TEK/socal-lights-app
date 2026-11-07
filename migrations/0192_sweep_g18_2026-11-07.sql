-- City sweep group 18 (High Desert & Mountains) 2026-11-07
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g18-barstow-turkey-trot','Barstow Turkey Trot','San Bernardino','Barstow','trot','2026-11-14','2026-11-14','confirmed',0,'Price not listed','7:30-10:30am',34.9048169,-117.0256375,'City of Barstow turkey trot to burn a few calories before Thanksgiving, listed on the county calendar for Nov 14 at the Harvey House.','https://bosd3.sbcounty.gov/event/turkey-trot-barstow/','christmas','Barstow Harvey House','681 N First Ave, Barstow, CA 92311'),
('g18-newberry-pistachio-farm-festival','Pistachio Farm Festival','San Bernardino','Newberry Springs','thanks','2026-11-07','2026-11-08','confirmed',0,'Price not listed','9am-4pm both days',34.8143011,-116.6633596,'28th annual harvest festival celebrating the local pistachio crop with food and family fun at Newberry Springs Community Park.','https://newberryspringschamber.com/pistachio-farm-festival','christmas','Newberry Springs Community Park','30884 Newberry Rd, Newberry Springs, CA 92365')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
