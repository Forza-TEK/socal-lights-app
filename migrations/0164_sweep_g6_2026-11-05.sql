-- City sweep group 6 (Long Beach & Gateway Cities) 2026-11-05
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g6-bell-holiday-village','Bell Holiday Village','Los Angeles','Bell','tree','2026-12-05','2026-12-05','confirmed',1,'Free','5–8pm',33.9801292,-118.1886779,'City of Bell holiday village event at the Bell Community Center.','https://www.cityofbell.gov/Events-directory/Holiday-Village','christmas','Bell Community Center','6250 Pine Ave, Bell, CA 90201'),
('g6-lb-winter-runderland-run','Winter Runderland 5K, 10K & Half Marathon','Los Angeles','Long Beach','trot','2026-12-13','2026-12-13','confirmed',0,'$46-$64','Half 7am, 5K/10K 8am, kids dash 9am',33.753372,-118.132271,'Festive all-paces holiday race on the Long Beach beach path; jingle bells, costumes and strollers welcome.','https://runsignup.com/Race/CA/LongBeach/CaliVibeRunsWinterRunderlandKKHalfMarathon','christmas','Start/finish on E Ocean Blvd','5400 E Ocean Blvd, Long Beach, CA 90803')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
