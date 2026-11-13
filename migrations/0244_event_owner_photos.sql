-- Owners can add up to 4 photos to an event they added (Your events > Edit). The keys of those photos (R2 objects e/<event id>/<name>) are kept here, apart from events.image
-- and events.images (the picture found on the event's own web page), so removing the owner's photos brings the old picture back and a sweep never overwrites them. Add-only.
ALTER TABLE events ADD COLUMN owner_photos TEXT;
