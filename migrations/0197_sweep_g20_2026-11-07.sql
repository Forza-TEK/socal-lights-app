-- City sweep group 20 (Santa Barbara County) 2026-11-07
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g20-bacara-festive-market','Festive Marketplace at Bacara','Santa Barbara','Goleta','tree','2026-12-06','2026-12-06','confirmed',1,'Free','2 PM - 6 PM',34.4334764,-119.9184596,'European-style holiday market at the Bacara resort with local artisans, food, snowfall displays, live entertainment and a kids'' craft corner.','https://santabarbaraca.com/?p=1099478','christmas','The Ritz-Carlton Bacara, Santa Barbara','8301 Hollister Ave, Goleta, CA 93117'),
('g20-montecito-hathaway-tree','Hathaway Tree Tradition (Montecito)','Santa Barbara','Montecito','tree','2026-12-02','2026-12-02','confirmed',0,'Price not listed','3 PM',34.43471,-119.63337,'Montecito''s annual community tree decorating tradition at Manning Park, listed by the Montecito Association for Dec 2.','https://www.montecitoassociation.org/events/winter-holidays','christmas','Manning Park','449 San Ysidro Rd, Montecito, CA 93108'),
('g20-montecito-holiday-magic','Holiday Magic in Montecito','Santa Barbara','Montecito','tree','2026-12-12','2026-12-12','confirmed',0,'Price not listed','3 PM - 6 PM',34.4370178,-119.63219,'Montecito Association holiday celebration on the Middle Green in the Upper Village, 3 to 6 PM.','https://www.montecitoassociation.org/events/winter-holidays','christmas','Upper Village Middle Green','San Ysidro Rd & E Valley Rd, Montecito, CA 93108')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
