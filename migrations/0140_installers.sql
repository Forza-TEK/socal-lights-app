-- Installer profiles: a company that installs displays, linked from the homes it installed.
-- Additive only: a new table and new columns on posts with safe defaults.
CREATE TABLE IF NOT EXISTS installers (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  web        TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  area       TEXT NOT NULL DEFAULT '',
  blurb      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS installers_name ON installers(lower(name));
ALTER TABLE posts ADD COLUMN installer_id TEXT;
ALTER TABLE posts ADD COLUMN installer_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN installer_token TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS posts_installer ON posts(installer_id);

-- Give every installer who already posted a profile, and link their homes (they posted them, so they are confirmed)
INSERT INTO installers (id, slug, name, web, phone, area, email)
SELECT lower(hex(randomblob(8))),
       trim(replace(replace(replace(replace(replace(replace(lower(biz), ' ', '-'), '&', 'and'), '''', ''), '.', ''), ',', ''), '--', '-'), '-'),
       biz, COALESCE(web, ''), COALESCE(phone, ''), COALESCE(service_area, ''), COALESCE(contact_email, '')
FROM posts WHERE poster_type = 'installer' GROUP BY lower(biz);
UPDATE posts SET installer_id = (SELECT i.id FROM installers i WHERE lower(i.name) = lower(posts.biz)), installer_confirmed = 1
WHERE poster_type = 'installer';
