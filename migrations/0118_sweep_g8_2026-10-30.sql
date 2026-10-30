-- City sweep group 8 (South OC) 2026-10-30. Sources: danapointharbor.com/holidays-at-the-harbor/ and lagunahillsca.gov/535/Holiday-Events (both loaded this run).
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('dp-santa-paws-pet-photos','Santa Paws Pet Photos at Dana Point Harbor','Orange','Dana Point','tree','2026-12-12','2026-12-13','confirmed',0,'$15 donation','10 am-3 pm',33.46137,-117.69897,'Holiday photos of your dog or cat with Santa and the harbor VW bus, benefiting the Pet Project Foundation.','https://danapointharbor.com/holidays-at-the-harbor/','christmas','Dana Point Harbor Island','Island Way near Richard Henry Dana statue, Dana Point, CA 92629'),
('dp-holiday-wine-cruise','Dana Point Holiday Wine Cruise (21+)','Orange','Dana Point','tour','2026-12-20','2026-12-27','confirmed',0,'Ticketed','Dec 20 & 27, 5:30-7 pm',33.46,-117.69201,'A 90-minute holiday harbor cruise on the Dana Pride with four wine tastings, paired snacks and live music.','https://danapointharbor.com/holidays-at-the-harbor/','christmas','Dana Wharf Sportfishing & Whale Watching','34675 Golden Lantern, Dana Point, CA 92629'),
('laguna-hills-breakfast-with-santa','Laguna Hills Breakfast with Santa','Orange','Laguna Hills','tree','2026-12-12','2026-12-12','confirmed',0,'$10 per person (ages 2+), pre-registration','Seatings 9 am and 10:30 am',33.604,-117.713,'City breakfast with Santa at the Community Center; pre-registration required.','https://lagunahillsca.gov/535/Holiday-Events','christmas','Laguna Hills Community Center & Sports Complex','25555 Alicia Pkwy, Laguna Hills, CA 92653')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
