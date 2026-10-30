-- Profile pictures: an uploaded photo (R2 key) and the picture Google gave us, used until a photo is uploaded.
ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN picture TEXT NOT NULL DEFAULT '';
