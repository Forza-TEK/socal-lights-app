-- City sweep group 18 (High Desert & Mountains), 2026-10-28
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g18-big-bear-apres-in-the-pines','Après in the Pines Holiday Market','San Bernardino','Big Bear Lake','tree','2026-11-27','2026-11-28','confirmed',0,'Price not listed','4:00-8:00 PM both days',34.2451472,-116.8878603,'An après-ski-themed holiday market with local vendors, food and drink, live DJ music and festive photo spots at the Masonic Lodge.','https://www.bigbear.com/events/apres-in-the-pines/','christmas','Big Bear Masonic Lodge','385 W Summit Blvd, Big Bear Lake, CA 92315'),
('g18-big-bear-sunnybrook-harvest','Harvest Festival at Sunnybrook Estate','San Bernardino','Big Bear Lake','thanks','2026-11-07','2026-11-08','confirmed',0,'Price not listed','10:00 AM-4:00 PM',34.2415154,-116.8752956,'A fall village of pumpkins, scarecrows and music with family-versus-family challenges and food at Sunnybrook Estate.','https://www.bigbear.com/events/harvest-festival-at-sunnybrook-estate/','christmas','Sunnybrook Estate','42488 Moonridge Rd, Big Bear Lake, CA 92315')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
