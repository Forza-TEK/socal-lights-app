-- City sweep group 19 (Ventura County) 2026-11-07
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g19-simi-christmas-creche','Simi Community Christmas Creche Exhibit','Ventura','Simi Valley','show','2026-12-04','2026-12-06','confirmed',1,'Free','5:30-8:30pm nightly',34.24925,-118.78699,'20th annual free exhibit of more than 500 nativity displays from over 50 countries, with music performances.','http://www.simicommunitychristmas.com/','christmas','LDS Sinaloa Stake Center','480 Sinaloa Rd, Simi Valley, CA 93065'),
('g19-night-in-bethlehem-to','Night in Bethlehem','Ventura','Thousand Oaks','show','2026-12-11','2026-12-13','confirmed',1,'Free','Shows every 30 min, 5:45-8pm (reserve tickets)',34.199464,-118.842197,'Free live nativity experience with a recreated village of Bethlehem, a live nativity and an indoor reception with music; reservations required.','https://nightinbethlehemth.wixsite.com/night-in-bethlehem','christmas','LDS Church, Erbes Road','1600 Erbes Rd, Thousand Oaks, CA 91362')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
