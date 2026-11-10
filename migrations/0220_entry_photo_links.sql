-- Photos and sign-in links for homes the organizer added herself (migration 0162 made them with no photo and no account behind them).
--   photo_token : the private link the organizer hands to the homeowner (/photos/<token>). Opening it asks the homeowner to sign in and link the home to their account.
--                 It also marks a home as "added by the organizer" for good (user_id changes when the homeowner links it).
--   claimed_at  : when a homeowner linked the home to their account (posts.user_id and contact_email are set then).
--   photos_org  : file names of the photos the organizer uploaded. The homeowner can hide these but not delete them.
--   photos_hidden : file names of photos the homeowner hid; those files are kept at h/<id>/<name>, off the public photo route. posts.photos holds only the visible ones.
-- validate: allow-destructive (adds empty columns and fills the new photo_token column on homes an organizer added; no existing data is changed or removed)
ALTER TABLE posts ADD COLUMN photo_token TEXT;
ALTER TABLE posts ADD COLUMN claimed_at TEXT;
ALTER TABLE posts ADD COLUMN photos_org TEXT NOT NULL DEFAULT '[]';
ALTER TABLE posts ADD COLUMN photos_hidden TEXT NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX IF NOT EXISTS posts_photo_token ON posts(photo_token) WHERE photo_token IS NOT NULL;
UPDATE posts SET photo_token = lower(hex(randomblob(16))) WHERE contest_id IS NOT NULL AND user_id = '' AND photo_token IS NULL;
