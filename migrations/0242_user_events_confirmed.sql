-- Events people add themselves are "confirmed": the organizer gave the dates from a signed-in, verified account. ("Expected" is for dates estimated from past years.)
-- From now on the add form and the owner's edit do this; this brings the events already added up to the same rule. Events found by our own sweeps are not touched.
UPDATE events SET status = 'confirmed', updated_at = datetime('now')
 WHERE status = 'expected' AND id IN (SELECT event_id FROM event_submissions WHERE status = 'published' AND event_id IS NOT NULL);
