-- Photos for homes the organizer added herself (migration 0162 made them with no photo and no account behind them).
-- photo_token is the private link the organizer can hand to the homeowner: anyone with it can add photos to that one home until voting closes
-- (/photos/<token>). Existing organizer-added homes get one here; new ones get theirs when they are added.
-- validate: allow-destructive (only fills the new, empty photo_token column on homes an organizer added; no existing data is changed or removed)
ALTER TABLE posts ADD COLUMN photo_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS posts_photo_token ON posts(photo_token) WHERE photo_token IS NOT NULL;
UPDATE posts SET photo_token = lower(hex(randomblob(16))) WHERE contest_id IS NOT NULL AND user_id = '' AND photo_token IS NULL;
