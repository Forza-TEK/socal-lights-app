INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g6-sfs-floating-pumpkin-patch','Floating Pumpkin Patch','Los Angeles','Santa Fe Springs','family','2026-10-31','2026-10-31','confirmed',0,'Not listed','10:30 AM – 5:30 PM',33.9447522,-118.0808755,'Santa Fe Springs city event listed for Halloween day at the Paul T. Nakamura Regional Aquatic Center.','https://www.santafesprings.gov/466/Special-Events','halloween','Paul T. Nakamura Regional Aquatic Center','10145 Pioneer Blvd, Santa Fe Springs, CA 90670')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
