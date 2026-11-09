-- City sweep group 17 (San Bernardino Valley & West End) 2026-11-09
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g17-grand-terrace-light-up','Light Up Grand Terrace Tree Lighting','San Bernardino','Grand Terrace','tree','2026-12-03','2026-12-03','expected',1,'Free','4-8pm (check site)',34.033948,-117.310504,'Annual city tree lighting with performers, Santa photos, vendors and kids activities; held the first Thursday of December in 2024 and 2025, so 2026 date is estimated.','https://grandterrace.citynewsgroup.com/articles/light-up-grand-terrace-brings-holiday-magic-to-the-community','christmas','Azure Hills Seventh-day Adventist Church','22633 Barton Rd, Grand Terrace, CA 92313'),
('g17-colton-christmas-parade','Colton Christmas Parade','San Bernardino','Colton','parade','2026-12-12','2026-12-12','expected',1,'Free','10am (check site)',34.0708876,-117.3235971,'Chamber of Commerce Christmas parade down La Cadena Drive with a festival at Fleming Park after; the 49th ran Dec 13, 2025, so 2026 date is estimated.','https://colton.citynewsgroup.com/articles/colton-chamber-of-commerce-christmas-parade--1','christmas','Fleming Park','525 N La Cadena Dr, Colton, CA 92324')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
