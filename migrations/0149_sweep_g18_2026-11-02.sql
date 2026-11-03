-- City sweep group 18 (High Desert & Mountains) 2026-11-02: two county library Winter Luau branches not yet on the map
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('hd-yv-library-winter-luau','Library Winter Luau (Yucca Valley)','San Bernardino','Yucca Valley','tree','2026-12-05','2026-12-05','confirmed',0,'Price not listed','10:00 AM–12:00 PM',34.1223867,-116.4172351,'Hawaiian-themed library holiday party with crafts, games, prizes and a visit from Santa Claus.','https://library.sbcounty.gov/event/library-winter-luau-yucca-valley/','christmas','Yucca Valley Branch Library','57271 29 Palms Hwy, Yucca Valley, CA 92284'),
('hd-la-library-winter-luau','Library Winter Luau (Lake Arrowhead)','San Bernardino','Lake Arrowhead','tree','2026-12-22','2026-12-22','confirmed',0,'Price not listed','4:00–5:30 PM',34.2466844,-117.2092094,'Library holiday event with a warm-December luau theme: games, crafts and a chance to win a grand prize by checking out 10 items.','https://library.sbcounty.gov/event/library-winter-luau-2-lakearrowhead/','christmas','Lake Arrowhead Branch Library','27235 Hwy 189, Blue Jay, CA 92317')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
