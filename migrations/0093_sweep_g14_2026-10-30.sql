INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g14-riverside-storybook-lane','Storybook Lane (Chapman Place) Christmas Display','Riverside','Riverside','drive','2026-12-01','2026-12-31','expected',1,'Free','Evenings; check site',33.9697164,-117.3884257,'A Wood Streets block of Christmas displays with character cutouts, recommended in a local photographer''s guide to Riverside holiday lights.','https://www.raincrossgazette.com/photographers-guide-to-riversides-best-holiday-light-displays/','christmas','Chapman Place','Chapman Pl, Riverside, CA 92506'),
('g14-riverside-glenhaven-ave','Glenhaven Avenue Christmas Lights (Victoria Woods)','Riverside','Riverside','drive','2026-12-01','2026-12-31','expected',1,'Free','Evenings; check site',33.9564824,-117.3573012,'A residential street in Victoria Woods with holiday displays, picked in a local guide as a good spot for blue-hour viewing under the palms.','https://www.raincrossgazette.com/photographers-guide-to-riversides-best-holiday-light-displays/','christmas','Glenhaven Avenue','Glenhaven Ave near Fairview Ave, Riverside, CA 92506')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
