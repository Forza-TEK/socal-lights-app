-- Browser pass follow-up 2026-10-30: Santa Monica Chanukah Boutique (santamonica.com listing, Nov 4 2026)
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('santa-monica-chanukah-boutique','Chanukah Boutique','Los Angeles','Santa Monica','tree','2026-11-04','2026-11-04','confirmed',0,'Not listed','3–7pm',34.0318908,-118.4861962,'Holiday shopping boutique for Chanukah at Beth Shir Shalom in Santa Monica, Wednesday afternoon into the evening.','https://www.santamonica.com/event/chanukah-boutique/','christmas','Beth Shir Shalom','1827 California Ave, Santa Monica, CA 90403')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
