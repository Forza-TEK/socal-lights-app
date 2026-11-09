-- Link existing tutorial videos to two Help articles added by 0201 that have no video yet. The Video field is the file name without extension
-- (public/tutorials/<name>.mp4, .jpg, .vtt and <name>-mobile.*). Only an article still unedited in Admin (updated_by = 'seed') with no video is touched.
-- No article text changes here. (Tutorial audit 2026-11-08, docs/audit/2026-11-08-tutorial-videos.md)
UPDATE help_articles SET video = 'post-house' WHERE slug = 'add-a-home-without-a-contest' AND updated_by = 'seed' AND COALESCE(video, '') = '';
UPDATE help_articles SET video = 'sponsors-invite' WHERE slug = 'sponsor-a-contest-with-an-invite-link' AND updated_by = 'seed' AND COALESCE(video, '') = '';
