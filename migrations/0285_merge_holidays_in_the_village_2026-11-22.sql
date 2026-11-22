-- Holidays in the Village (Dec 5-6 2026, The Oaks, Thousand Oaks) was on the map twice: the sweep row thousand-oaks-holidays-in-the-village and the organizer's own
-- submission u-holidays-in-the-village--4afd74. The sweep pin (34.1836, -118.8877) is The Oaks at 350 W Hillcrest Dr and is correct. The submission typed "350 Hillcrest";
-- the Census geocoder found two matches (350 E Hillcrest Dr and 350 W Hillcrest Dr) and the form took the first, so its pin sat 1.6 km east of the mall.
-- Merge: the sweep row stays (right pin, kept fresh by the sweeps). It takes the organizer's four photos and official site; the organizer's submission is pointed at it
-- (so Your profile > Events edits this one) with the full address; the duplicate row is deleted. The photo files stay where they are (their keys work on any event).
-- A row with a paid Featured placement is never touched (neither has one).
-- validate: allow-destructive (removes one duplicate row, guarded by id)
UPDATE events SET owner_photos = (SELECT owner_photos FROM events WHERE id='u-holidays-in-the-village--4afd74'), url='https://holidaysinthevillage.org/', updated_at=datetime('now')
 WHERE id='thousand-oaks-holidays-in-the-village' AND EXISTS (SELECT 1 FROM events WHERE id='u-holidays-in-the-village--4afd74');
UPDATE event_submissions SET event_id='thousand-oaks-holidays-in-the-village', address='350 W Hillcrest Dr', venue='The Oaks', lat=34.1836, lng=-118.8877
 WHERE id='4f64f8e870394fb3' AND event_id='u-holidays-in-the-village--4afd74' AND EXISTS (SELECT 1 FROM events WHERE id='thousand-oaks-holidays-in-the-village');
DELETE FROM events WHERE id='u-holidays-in-the-village--4afd74' AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL)
 AND NOT EXISTS (SELECT 1 FROM event_submissions WHERE event_id='u-holidays-in-the-village--4afd74');
