-- Attach the four new tutorial videos to their Help articles. The Video field is the file name without extension
-- (public/tutorials/<name>.mp4, .jpg, .vtt and <name>-mobile.*). Only articles still unedited in Admin (updated_by = 'seed') with no video are touched.
UPDATE help_articles SET video = 'run-add-homes' WHERE slug = 'add-your-citys-homes-yourself' AND updated_by = 'seed' AND COALESCE(video, '') = '';
UPDATE help_articles SET video = 'post-claim' WHERE slug = 'claim-your-home' AND updated_by = 'seed' AND COALESCE(video, '') = '';
UPDATE help_articles SET video = 'run-unpublish' WHERE slug = 'unpublish-and-publish-again' AND updated_by = 'seed' AND COALESCE(video, '') = '';
UPDATE help_articles SET video = 'post-feature' WHERE slug = 'feature-an-event-or-home' AND updated_by = 'seed' AND COALESCE(video, '') = '';
