-- City sweep group 5 (South Bay) 2026-11-05
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('g5-torrance-holiday-lights-train','Holiday Lights Train at Wilson Park','Los Angeles','Torrance','tour','2026-12-18','2026-12-19','confirmed',0,'$10','5:15–8:15pm; riders must be at least 32 inches tall',33.82549,-118.32142,'Train rides through an illuminated, holiday-decorated area of Wilson Park, run by Southern California Live Steamers.','https://discovertorrance.com/events/holiday-lights-train/','christmas','Wilson Park','2290 Washington Ave, Torrance, CA 90501')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
UPDATE events SET status='confirmed', start_date='2026-11-21', end_date='2026-11-22', hours='Sat–Sun; pop-up market and Santa 10am–4pm, Ferris wheel 12–9pm, tree lighting Sun ~6pm', url='https://hbchamber.net/holidays', updated_at=datetime('now') WHERE id='hermosa-for-the-holidays';
