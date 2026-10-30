-- Accounts, contests and votes. Purely additive: new tables plus new columns on posts with safe defaults,
-- so the existing events, houses and forms keep working unchanged.

-- One account per verified email address (the email is normalized: lowercase, no +tag, no dots for Gmail).
-- People sign in with Google or an emailed code; both prove the same email, so they land on the same account.
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  google_sub  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_login  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_google ON users(google_sub) WHERE google_sub IS NOT NULL;

-- Login sessions. Only a hash of the cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- One-time email codes (stored hashed, expire after 10 minutes, limited tries).
CREATE TABLE IF NOT EXISTS login_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  ip          TEXT NOT NULL DEFAULT '',
  tries       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS login_codes_email ON login_codes(email, created_at);

-- Home decorating contests. status: pending (waiting for the site owner) | live | closed | declined.
CREATE TABLE IF NOT EXISTS contests (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL,
  owner_id      TEXT NOT NULL,
  name          TEXT NOT NULL,
  org           TEXT NOT NULL,
  city          TEXT NOT NULL,
  county        TEXT NOT NULL DEFAULT '',
  descr         TEXT NOT NULL DEFAULT '',
  site          TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  season        TEXT NOT NULL DEFAULT 'christmas',
  status        TEXT NOT NULL DEFAULT 'pending',
  entries_close TEXT NOT NULL,          -- YYYY-MM-DD, last day to enter
  vote_start    TEXT NOT NULL,
  vote_end      TEXT NOT NULL,
  categories    TEXT NOT NULL DEFAULT '[]',   -- JSON array of names
  vote_rule     TEXT NOT NULL DEFAULT 'contest',  -- contest = one vote total | cat = one vote per category
  approval      TEXT NOT NULL DEFAULT 'manual',   -- manual = organizer approves each entry | auto
  show_counts   INTEGER NOT NULL DEFAULT 1,       -- show running totals to the public
  entries_open  INTEGER NOT NULL DEFAULT 1,       -- organizer override, ANDed with the dates
  voting_open   INTEGER NOT NULL DEFAULT 1,
  announced     INTEGER NOT NULL DEFAULT 0,       -- winners announced: voting over, counts public
  event_id      TEXT,                              -- the event row that lists the contest on the map
  note          TEXT NOT NULL DEFAULT '',          -- why it needs review / admin note
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS contests_slug ON contests(slug);
CREATE INDEX IF NOT EXISTS contests_owner ON contests(owner_id);
CREATE INDEX IF NOT EXISTS contests_status ON contests(status);

-- Houses entered into a contest (standalone houses leave these empty).
ALTER TABLE posts ADD COLUMN contest_id TEXT;
ALTER TABLE posts ADD COLUMN category TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN user_id TEXT;
ALTER TABLE posts ADD COLUMN entry_no INTEGER;
CREATE INDEX IF NOT EXISTS posts_contest ON posts(contest_id, status);

-- Votes. The unique key is what guarantees one vote per person: per contest, or per category when the contest
-- uses "one vote in each category" (category is '' otherwise). Changing a vote updates the row.
CREATE TABLE IF NOT EXISTS votes (
  id          TEXT PRIMARY KEY,
  contest_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  post_id     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (contest_id, user_id, category)
);
CREATE INDEX IF NOT EXISTS votes_post ON votes(post_id);
