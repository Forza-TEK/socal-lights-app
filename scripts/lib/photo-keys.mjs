// Every PHOTOS (R2) object the app can write, and the database column that points at it. Shared by backup-photos.mjs, verify-backup.mjs and rehearse-restore.mjs.
// Keep in step with functions/: tests/photo-backup.test.mjs greps functions/ for the key prefixes it writes and fails when one is missing here.
//   p/<post>/<n>.<ext>            posts.photos (live home photos; also the visible organizer photos)
//   pending/<post>/<n>.<ext>      posts.photos (a home waiting for approval)
//   h/<post>/<name>               posts.photos_hidden holds NAMES only (photos a homeowner hid); the key is h/<post id>/<name>
//   v/<post>/<ts>.<ext>           posts.video_file (home video clip)
//   e/<event>/<name>              events.owner_photos (JSON array of keys)
//   ev/<event>/<ts>.<ext>         events.video_file (event video clip)
//   avatars/<user>-<ts>           users.avatar
//   installer/<id>/logo-<ts>.<ext>  installers.logo
//   contestlogo/<id>/<ts>.<ext>   contests.logo
//   sponsor/<contest>/<id>.<ext>  contest_sponsors.logo
//   sponsor-receipt/<contest>/<id>.<ext>  contest_sponsors.receipt (PRIVATE: payment records; the backup bucket is private too)
export const KEY_PREFIXES = ["p", "pending", "h", "v", "e", "ev", "avatars", "installer", "contestlogo", "sponsor", "sponsor-receipt"];

const jsonArray = (v) => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []; } catch { return []; } };
const plain = (v) => (v ? [String(v)] : []);

// Each source: SQL that returns the column as `v` (and `id` where the key is built from the row id), and how to turn a row into object keys.
export const PHOTO_SOURCES = [
  { name: "posts.photos", sql: "SELECT photos AS v FROM posts WHERE photos != '[]'", keys: (r) => jsonArray(r.v) },
  { name: "posts.photos_hidden", sql: "SELECT id, photos_hidden AS v FROM posts WHERE photos_hidden != '[]'", keys: (r) => jsonArray(r.v).map((n) => `h/${r.id}/${n}`) },
  { name: "posts.video_file", sql: "SELECT video_file AS v FROM posts WHERE video_file != ''", keys: (r) => plain(r.v) },
  { name: "events.owner_photos", sql: "SELECT owner_photos AS v FROM events WHERE owner_photos IS NOT NULL AND owner_photos != '' AND owner_photos != '[]'", keys: (r) => jsonArray(r.v) },
  { name: "events.video_file", sql: "SELECT video_file AS v FROM events WHERE video_file != ''", keys: (r) => plain(r.v) },
  { name: "users.avatar", sql: "SELECT avatar AS v FROM users WHERE avatar != ''", keys: (r) => plain(r.v) },
  { name: "installers.logo", sql: "SELECT logo AS v FROM installers WHERE logo != ''", keys: (r) => plain(r.v) },
  { name: "contests.logo", sql: "SELECT logo AS v FROM contests WHERE logo != ''", keys: (r) => plain(r.v) },
  { name: "contest_sponsors.logo", sql: "SELECT logo AS v FROM contest_sponsors WHERE logo != ''", keys: (r) => plain(r.v) },
  { name: "contest_sponsors.receipt", sql: "SELECT receipt AS v FROM contest_sponsors WHERE receipt != ''", keys: (r) => plain(r.v) },
];

// A key is safe to use as a file path and starts with a prefix the app writes. Returns "" when fine, else the reason.
export function keyProblem(k) {
  if (typeof k !== "string" || !k) return "empty";
  if (/[\r\n\0\\]|\.\.|^\/|\/\//.test(k)) return "odd";
  if (!KEY_PREFIXES.includes(k.split("/")[0])) return "unknown prefix";
  return "";
}
export const prefixOf = (k) => String(k).split("/")[0];
export const countByPrefix = (keys) => { const o = {}; for (const k of keys) o[prefixOf(k)] = (o[prefixOf(k)] || 0) + 1; return o; };

// query(sql) -> rows (array). A source whose table or column is missing is reported in `skipped`, never silently dropped.
// Returns { keys: Set, skipped: [source names], bad: number of rejected keys }.
export function collectKeys(query) {
  const keys = new Set(), skipped = []; let bad = 0;
  for (const s of PHOTO_SOURCES) {
    let rows;
    try { rows = query(s.sql); } catch { skipped.push(s.name); continue; }
    for (const r of rows) for (const k of s.keys(r)) { if (keyProblem(k)) bad++; else keys.add(k); }
  }
  return { keys, skipped, bad };
}
