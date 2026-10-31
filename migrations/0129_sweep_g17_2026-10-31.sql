INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES ('tg-upland-turkey-trot','City of Upland Turkey Trot 5K & Kids 1K','San Bernardino','Upland','trot','2026-11-26','2026-11-26','confirmed',0,'Kids 1K $25-$33, 5K $35-$43','Kids 1K 7:30 AM, 5K 8:00 AM',34.1503605,-117.670545,'City recreation division and Upland High cross country run the 19th annual Thanksgiving 5K run/walk and kids 1K.','https://runsignup.com/Race/CA/Upland/CityofUplandTurkeyTrot5K1K','christmas','San Antonio Park','2393 N Mountain Ave, Upland, CA 91784')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
