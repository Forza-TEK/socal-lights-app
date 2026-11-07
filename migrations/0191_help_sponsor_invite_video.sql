-- Attach the new "Invite a sponsor to your contest" tutorial video to the Help article about organizer-collected sponsors. The Video field is the file name
-- without extension (public/tutorials/sponsors-invite.mp4, .jpg, .vtt and sponsors-invite-mobile.*). Only an article still unedited in Admin (updated_by = 'seed')
-- with no video is touched. The quick start, customize and sponsors videos were re-recorded in place under the same file names, so their articles keep their links.
UPDATE help_articles SET video = 'sponsors-invite' WHERE slug = 'add-sponsors-to-your-contest' AND updated_by = 'seed' AND COALESCE(video, '') = '';
