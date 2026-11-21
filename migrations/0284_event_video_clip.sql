-- An event can have a short video clip the organizer uploaded (video_file, an R2 key under ev/<eventId>/), besides the YouTube or Vimeo link it already has (video).
-- Like homes (0281): a clip is public only after Admin approves it (video_ok = 1); a link needs no approval. Setting one clears the other.
ALTER TABLE events ADD COLUMN video_file TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN video_ok INTEGER NOT NULL DEFAULT 0;
