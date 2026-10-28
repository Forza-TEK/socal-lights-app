-- City sweep group 17 (San Bernardino Valley & West End), 2026-10-28
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g17-ymca-holiday-home-tour','YMCA Holiday Home Tour (Redlands)','San Bernardino','Redlands','tour','2026-12-06','2026-12-06','confirmed',0,'$45 early bird, $50 from Dec 1','10am–4pm; patron brunch seatings from 8am',34.0551540,-117.1765641,'Annual fundraiser tour of six historic and modern Redlands homes, many dressed for the holidays; no children under 12.','https://ymcahometour.org/about-home-tour','christmas','YMCA of the East Valley','500 E Citrus Ave, Redlands, CA 92373'),
('g17-rc-breakfast-with-santa','Breakfast with Santa (Rancho Cucamonga)','San Bernardino','Rancho Cucamonga','tree','2026-12-05','2026-12-05','confirmed',0,'$25 per person, ages 3+','Seatings 8:30–10:30am and 10:30am–12:30pm',34.1215590,-117.5615745,'City-hosted holiday breakfast with crafts, letters to Santa and photos with Santa; tickets were not yet on sale when checked.','https://www.cityofrc.us/events/breakfast-santa','christmas','Central Park','11200 Base Line Rd, Rancho Cucamonga, CA 91730'),
('g17-redlands-made-with-love-market','Made with Love in Redlands Holiday Market','San Bernardino','Redlands','tree','2026-11-29','2026-11-29','confirmed',1,'Free admission and parking','10am–3pm',34.0572584,-117.2095923,'Local-vendor holiday market with 50+ makers, held the Sunday after Thanksgiving.','https://aboutredlands.com/redlands-events/made','christmas','JAM Sportswear','325 Alabama St, Redlands, CA 92374')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');

UPDATE events SET start_date='2026-11-19', end_date='2026-11-19', status='confirmed', hours='5–8pm; lighting at 6pm', url='https://aboutredlands.com/redlands-events/christmas-tree-lighting', updated_at=datetime('now') WHERE id='g17-redlands-tree-lighting';
