-- City sweep group 20 (Santa Barbara County) 2026-11-03: two Lompoc events from explorelompoc.com
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g20-lompoc-turkey-trot-2026','Lompoc Turkey Trot','Santa Barbara','Lompoc','trot','2026-11-22','2026-11-22','confirmed',0,'Price not listed','9 am (check-in 8 am)',34.6526530,-120.4354932,'A 3-mile fun run for all ages and a 1-mile turkey dash for ages 5-12 on the River Park fitness trail.','https://explorelompoc.com/event/turkey-trot-2026/','christmas','River Park','River Park, CA-246 & Sweeney Rd, Lompoc, CA 93436'),
('g20-lompoc-victorian-holiday-open-house','Victorian 1875 Holiday Open House (Lompoc)','Santa Barbara','Lompoc','tour','2026-11-27','2026-12-12','confirmed',1,'Free','10 am-1 pm on Nov 27, Nov 28, Dec 5 and Dec 12',34.6408858,-120.4630606,'The Lompoc Valley Historical Society opens the Fabing McKay Spanne House, lavishly decorated for the holidays; donations appreciated.','https://explorelompoc.com/event/victorian-1875-holiday-open-house-2/','christmas','Fabing McKay Spanne House','207 N L St, Lompoc, CA 93436')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
UPDATE events SET image='https://explorelompoc.com/wp-content/uploads/2026/09/7FCD2E0D-75D6-465F-BB14-584B4FC5E40A.jpeg', updated_at=datetime('now') WHERE id='g20-lompoc-victorian-holiday-open-house' AND (image IS NULL OR image='');
