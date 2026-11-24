-- Old Town Trolley's Holiday Sights tour (San Diego, Nov 28 2026 to Jan 3 2027, 4010 Twiggs St) was on the map twice: the sweep row `trolley` ("Holiday Sights Trolley Tour")
-- and the organizer's own submission `u-old-town-trolley-s-holid-dd720a`. Same place (the pins are 30 m apart), same dates.
-- Merge, keeping the sweep id (the same rule as the add-event "update an existing event" choice): the organizer's details win (name, city, price, hours, description, web page, venue, street, pin
-- and their photo); the sweep's picture stays as the linked image, and the full address keeps the ZIP the sweep had. The organizer's submission is pointed at the surviving row, so Your profile >
-- Events edits it, and the duplicate row is deleted. Nothing else referenced the duplicate (no orders, claims or removal requests); its photo file keeps working under its old key.
-- A row with a paid Featured placement is never touched (neither has one).
-- validate: allow-destructive (updates and deletes single rows guarded by id)
UPDATE events SET
  name=(SELECT name FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  city=(SELECT city FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  county=(SELECT county FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  free=(SELECT free FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  price=(SELECT price FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  hours=(SELECT hours FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  lat=(SELECT lat FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  lng=(SELECT lng FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  blurb=(SELECT blurb FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  url=(SELECT url FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  venue=(SELECT venue FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  address='4010 Twiggs Street, San Diego, CA 92110',
  owner_photos=(SELECT owner_photos FROM events WHERE id='u-old-town-trolley-s-holid-dd720a'),
  updated_at=datetime('now')
 WHERE id='trolley' AND EXISTS (SELECT 1 FROM events WHERE id='u-old-town-trolley-s-holid-dd720a');
UPDATE event_submissions SET event_id='trolley', address='4010 Twiggs Street, San Diego, CA 92110'
 WHERE id='87e325f57ab44c28' AND event_id='u-old-town-trolley-s-holid-dd720a' AND EXISTS (SELECT 1 FROM events WHERE id='trolley');
DELETE FROM events WHERE id='u-old-town-trolley-s-holid-dd720a' AND id NOT IN (SELECT event_id FROM feature_orders WHERE event_id IS NOT NULL)
 AND NOT EXISTS (SELECT 1 FROM event_submissions WHERE event_id='u-old-town-trolley-s-holid-dd720a');
