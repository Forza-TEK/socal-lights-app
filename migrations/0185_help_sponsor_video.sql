-- Attach the new "Sponsor your installer company" tutorial video to its Help article. The Video field is the file name without extension
-- (public/tutorials/sponsors-sponsor.mp4, .jpg, .vtt and sponsors-sponsor-mobile.*). Only an article still unedited in Admin (updated_by = 'seed') with no video is touched.
-- feature-an-event-or-home keeps post-feature (the video was re-recorded in place under the same file name).
UPDATE help_articles SET video = 'sponsors-sponsor' WHERE slug = 'sponsor-your-installer-company' AND updated_by = 'seed' AND COALESCE(video, '') = '';
