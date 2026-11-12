-- City sweep group 4 (Pomona Valley & East SGV) 2026-11-12. Source: raceroster.com/events/2026/141172/holiday-half-marathon-and-5k (loaded 2026-11-12).
-- Pin reuses the Fairplex coordinates already on the map (imaginarium-fairplex). No photo: the page only has a logo.
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g4-fairplex-holiday-half-marathon','Holiday Half Marathon & 5K at Fairplex','Los Angeles','Pomona','trot','2026-12-20','2026-12-20','confirmed',0,'$11.60-$80.50','7am','34.08031','-117.7641','Holiday-themed half marathon, 5K and kids'' 1-mile Penguin Waddle starting and finishing at Fairplex; half at 7am, 5K 7:20am, kids 9:30am.','https://raceroster.com/events/2026/141172/holiday-half-marathon-and-5k','christmas','Fairplex','1101 W McKinley Ave, Pomona, CA 91768')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
