-- City sweep group 11 (City of San Diego & Coronado) 2026-10-30
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g11-forward-house-lights','Forward House Holiday Lights','San Diego','Bankers Hill','drive','2026-11-26','2026-12-31','expected',1,'Free','Evenings, check site',32.728464,-117.163626,'Historic 1905 Bankers Hill mansion decked out for the holidays each year, with Santa and his reindeer on the roof.','https://www.10news.com/lifestyle/exploring-san-diego/forward-house-lights-up-the-holidays-in-san-diegos-bankers-hill','christmas','The Forward House','108 Ivy St, San Diego, CA 92101'),
('g11-south-park-luminaria','South Park Luminaria & Winter Walkabout','San Diego','South Park','tree','2026-12-05','2026-12-05','expected',1,'Free','5-9 PM, check site',32.7264456,-117.1299717,'South Park neighborhood stroll with holiday lights, music, a sign lighting and shop and restaurant specials.','https://www.kpbs.org/events/2025/12/06/luminaria-and-winter-walkabout','christmas','Grape Street Square','3007 Grape St, San Diego, CA 92102')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
