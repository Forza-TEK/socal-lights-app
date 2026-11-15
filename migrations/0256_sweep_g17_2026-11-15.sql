-- City sweep group 17 (San Bernardino Valley & West End) 2026-11-15
INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address)
VALUES
('g17-loma-linda-holiday-classic','Lopers Club Holiday Classic (Loma Linda)','San Bernardino','Loma Linda','trot','2026-12-06','2026-12-06','confirmed',0,'Check listing','7am','34.0482388','-117.2479135','The 37th annual half marathon, 10K and 5K starts in front of the Loma Linda Fire Station, with an Elves Trot fun run for ages 3 to 6.','https://runsignup.com/Race/CA/LomaLinda/LopersClubHolidayClassic','christmas','Loma Linda Fire Station','11325 Loma Linda Dr, Loma Linda, CA 92354'),
('vp-luchador-nightmare-grinchmas','Nightmare Before Grinchmas Paint & Sip at Luchador Brewing','San Bernardino','Chino Hills','show','2026-12-20','2026-12-20','confirmed',0,'$46','11:30am','33.9636428','-117.6876061','A ticketed Grinch-themed paint-and-sip brunch class held at the Luchador Brewing taproom.','https://www.paintnite.com/us/ca/chino-hills/events/merry-grinchmas-tickets-10369896','christmas','Luchador Brewing Company','15941 Pomona Rincon Rd, Chino Hills, CA 91709')
ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city,
  type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng,
  blurb=excluded.blurb, url=excluded.url, season=excluded.season,
  venue=excluded.venue, address=excluded.address, updated_at=datetime('now');
