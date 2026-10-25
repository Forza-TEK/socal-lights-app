-- Pumpkin City at the former Laguna Hills Mall (reported missing by Rey)
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('pumpkincity-lagunahills','Pumpkin City Laguna Hills','Orange','Laguna Hills','pumpkin','2026-10-01','2026-10-31','confirmed',0,
 '$10 kids, $14 adults; free Mon–Fri before 4pm','Mon–Thu 12:30–9pm; Fri–Sun 10am–10pm',33.6100,-117.7045,
 'A big pumpkin patch on the old Laguna Hills Mall lot with kiddie rides, games, a petting zoo, live entertainment and an Oktoberfest beer garden.',
 'https://pumpkincity.com/pumpkin-farm/#pumpkinlocations','halloween','Pumpkin City (behind Trader Joe''s, former Laguna Hills Mall)','24203 Avenida de la Carlota, Laguna Hills, CA 92653')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city, type=excluded.type,
  start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, free=excluded.free, price=excluded.price,
  hours=excluded.hours, lat=excluded.lat, lng=excluded.lng, blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
