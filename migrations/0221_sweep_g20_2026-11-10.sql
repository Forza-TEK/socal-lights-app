-- City sweep group 20 (Santa Barbara County) 2026-11-10
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g20-stow-house-holiday-at-the-ranch','Holiday at the Ranch at Stow House','Santa Barbara','Goleta','tree','2026-12-05','2026-12-05','confirmed',0,'Price not listed','10am-4pm',34.4430407,-119.8517941,'Holiday open house at the historic Rancho La Patera & Stow House with Santa and his rein-goats, tractor rides, craft vendors, kids crafts and food trucks.','https://goletahistory.org/holiday-at-the-ranch','christmas','Rancho La Patera & Stow House','304 N Los Carneros Rd, Goleta, CA 93117'),
('g20-chabad-chanukah-state-street','Chanukah on State Street (Santa Barbara)','Santa Barbara','Santa Barbara','tree','2026-12-06','2026-12-06','confirmed',1,'Free','4:30pm',34.4206511,-119.7013429,'Free Chanukah celebration on State Street with a giant menorah, latkes, doughnuts, crafts, entertainment and a life-size Chanukah snow globe; reservations requested.','https://www.sbchabad.org/menorah','christmas','State Street (900 block)','913 State St, Santa Barbara, CA 93101')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
UPDATE events SET image='https://www.independent.com/wp-content/uploads/2026/11/state-st-chanukah-crowd-photo.jpg', updated_at=datetime('now') WHERE id='g20-chabad-chanukah-state-street' AND (image IS NULL OR image='');
