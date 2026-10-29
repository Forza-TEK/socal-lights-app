INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g5-rpv-breakfast-with-santa','REACH Breakfast with Santa','Los Angeles','Rancho Palos Verdes','show','2026-12-12','2026-12-12','confirmed',0,'See registration for price','Morning seatings (check site)',33.7678934,-118.3908988,'Pancakes, crafts and a visit with Santa at Hesse Park, run by the city''s REACH recreation program; registration required.','https://www.active.com/rancho-palos-verdes-ca/classes/reach-breakfast-with-santa-2026','christmas','Hesse Park','29301 Hawthorne Blvd, Rancho Palos Verdes, CA 90275'),
('g5-catalina-lmu-holiday-concert','Holiday Concert with the LMU Choir','Los Angeles','Avalon','show','2026-12-12','2026-12-12','confirmed',0,'Ticketed; register on site','5:00-7:30pm',33.3433553,-118.3280105,'Loyola Marymount University Choir sings holiday classics on the museum plaza, with a dessert bar included and hot drinks and tamales for sale.','https://www.catalinamuseum.org/calendar/event/6280800','christmas','Catalina Museum for Art & History (Schreiner Family Plaza)','217 Metropole Ave, Avalon, CA 90704')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
