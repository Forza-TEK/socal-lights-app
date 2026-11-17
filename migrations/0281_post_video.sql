-- A home or a contest entry can have one video: a YouTube or Vimeo link (video, shown at once) or a short clip the person uploaded (video_file, an R2 key under v/<postId>/).
-- An uploaded clip is public only after Admin approves it (video_ok = 1); a link needs no approval. Setting one clears the other.
ALTER TABLE posts ADD COLUMN video TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN video_file TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN video_ok INTEGER NOT NULL DEFAULT 0;
