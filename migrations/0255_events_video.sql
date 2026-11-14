-- An event can carry one video (YouTube or Vimeo link), shown on its card as a "Watch the video" button that loads the player only when tapped.
-- Stored as the clean watch address (public/video.js parseVideo). Empty = no video. Set by the organizer (Your events > Edit), by Admin, or by a sweep that finds an embedded video on the event's own page.
ALTER TABLE events ADD COLUMN video TEXT NOT NULL DEFAULT '';
