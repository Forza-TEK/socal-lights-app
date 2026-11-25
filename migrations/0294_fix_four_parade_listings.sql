-- Four listings Grok could not confirm (missing place, missing time, conflicting date), checked against the cities' own pages on 2026-11-25.
-- Peninsula Holiday Parade of Lights: the City of Rolling Hills Estates page, its parade entry form and the Patch calendar all say Saturday Dec 12, 2026, 6:00 PM (the map had Dec 5).
UPDATE events SET start_date='2026-12-12', end_date='2026-12-12', hours='6pm–7:30pm', status='confirmed',
  blurb='Lighted evening parade with floats, marching bands and Santa along Silver Spur Road and Deep Valley Drive, through the Promenade on the Peninsula.',
  url='https://www.rollinghillsestates.gov/government/community-services/palos-verdes-peninsula-holiday-parade-of-lights', updated_at=datetime('now')
  WHERE id='peninsula-holiday-parade-of-lights';
-- Coachella Enchanted Holiday Parade: the City of Coachella's calendar lists "Game on Coachella, Level Up the Holidays! Parade" Dec 4, 6:00-9:30 PM, and its post says the parade is in downtown Coachella on Friday Dec 4. The exact 2026 route is not published, so the pin stays at downtown.
UPDATE events SET hours='6pm–9:30pm', status='confirmed', venue='Downtown Coachella',
  blurb='The City of Coachella''s "Game on, Coachella!" holiday parade through downtown Coachella on Friday evening, Dec 4.',
  url='https://www.coachella.org/about-us/city-calendar', updated_at=datetime('now')
  WHERE id='coachella-holiday-parade';
-- Irwindale Christmas Spectacular: the City of Irwindale's own post gives Friday Dec 4, 2026, 6 PM-8:30 PM at Irwindale Park Plaza; the city's events page notes pre-registration is required.
UPDATE events SET hours='6pm–8:30pm', status='confirmed', venue='Irwindale Park Plaza',
  blurb='The City of Irwindale''s annual Christmas Spectacular at Irwindale Park, Friday Dec 4, 6 to 8:30 pm. The city says pre-registration is required.',
  url='https://www.facebook.com/CityofIrwindale/videos/be-sure-to-come-and-visit-our-christmas-spectacular-on-december-4th-from-6pm-830/1748494470326386/', updated_at=datetime('now')
  WHERE id='g4-irwindale-christmas-spectacular';
-- Baldwin Park Holiday Parade & Winterfest: the city calendar says Saturday Dec 5, 2026, 9:45 AM-3:00 PM at the Esther Snyder Community Center, 4100 Baldwin Park Blvd; parade 9:45 am, Winterfest 12-4 pm.
UPDATE events SET venue='Baldwin Park Blvd (parade) & Esther Snyder Community Center', address='4100 Baldwin Park Blvd, Baldwin Park, CA 91706',
  blurb='Parade at 9:45 am on Baldwin Park Blvd with Grand Marshal Jaime Jarrín, then free Winterfest 12 to 4 pm: snow play, petting zoo, crafts and photos with Santa.',
  url='https://baldwinpark.com/Calendar.aspx?EID=2272&month=12&year=2026&day=5&calType=0', updated_at=datetime('now')
  WHERE id='baldwin-park-holiday-parade-winterfest';
