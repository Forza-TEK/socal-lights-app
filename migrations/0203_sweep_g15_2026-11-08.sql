-- City sweep group 15 (Southwest Riverside & the Pass) 2026-11-08
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g15-temecula-holiday-bike-ride','Temecula Holiday Bike Ride (Harveston)','Riverside','Temecula','tour','2026-12-12','2026-12-12','confirmed',0,'Price not listed','6:30 PM - 8:30 PM',33.5377583,-117.1573558,'City of Temecula evening holiday bike ride through the Harveston neighborhood; meet at the park at 6:30 PM, ride starts at 7 PM, registration listed as coming soon.','https://temeculaca.gov/holidays','christmas','Harveston Community Park','28582 Harveston Dr, Temecula, CA 92591')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
