INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g4-claremont-turkey-trot','Claremont Turkey Trot','Los Angeles','Claremont','trot','2026-11-26','2026-11-26','confirmed',0,'1K fun run $27.50, 5K $48.70','7:30am kids 1K, 8:30am 5K (approx.)',34.1021185,-117.7183345,'Thanksgiving-morning 5K and kids'' 1K through tree-lined streets near the Claremont Colleges, benefiting Claremont Sunrise Rotary.','https://runsignup.com/Race/CA/CLAREMONT/ClaremontSunriseRotaryTurkeyTrot','christmas','Memorial Park','850 N Yale Ave, Claremont, CA 91711'),
('g4-irwindale-christmas-spectacular','Irwindale Christmas Spectacular','Los Angeles','Irwindale','show','2026-12-04','2026-12-04','expected',1,'Free','Evening (check site)',34.1218089,-117.9339063,'The city of Irwindale''s annual holiday celebration at Irwindale Park; the city lists the date as tentative.','https://irwindaleca.gov/168/Special-Events','christmas','Irwindale Park','5050 N Irwindale Ave, Irwindale, CA 91706'),
('g4-wc-childrens-christmas-parade','Children''s Christmas Parade & Santa''s Village','Los Angeles','West Covina','parade','2026-12-12','2026-12-12','confirmed',1,'Free','9am-2pm',34.0716940,-117.9201960,'Kids'' Christmas parade and Santa''s Village in historic downtown West Covina, run with the West Covina Kiwanis Club.','https://westcovina.gov/474/Special-Events','christmas','Historic Downtown West Covina','S Glendora Ave & W Garvey Ave S, West Covina, CA 91790')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
