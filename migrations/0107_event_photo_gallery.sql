-- Extra photos for an event: a JSON array of image URLs (the main photo stays in image)
ALTER TABLE events ADD COLUMN images TEXT;
