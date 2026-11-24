// Photo backup coverage (audit F-22/F-23): every R2 key prefix the app writes is backed up, verified, and restorable in a rehearsal.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { KEY_PREFIXES, PHOTO_SOURCES, collectKeys, keyProblem, countByPrefix } from "../scripts/lib/photo-keys.mjs";
import { copyMissing } from "../scripts/backup-photos.mjs";
import { verifyDump, photoKeysFromDump, checkPhotoCoverage } from "../scripts/verify-backup.mjs";
import { rehearse, dirFetcher, looksLikeFile, pickSample } from "../scripts/rehearse-restore.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : []; });

test("every key prefix the functions write to PHOTOS is in the backup list (and the list has no stale prefix)", () => {
  const found = new Set(); // prefixes written
  for (const f of walk(join(ROOT, "functions"))) {
    const src = readFileSync(f, "utf8");
    if (!/PHOTOS\.put/.test(src)) continue; // only files that write to R2
    for (const m of src.matchAll(/[`"']([a-z][a-z-]*)\/\$\{/g)) found.add(m[1]); // `prefix/${id}...`
    if (src.includes('"p" : "pending"')) found.add("pending"); // submit.js: `${autoApprove ? "p" : "pending"}/${id}/...`
  }
  for (const p of found) assert.ok(KEY_PREFIXES.includes(p), `functions/ write keys starting "${p}/" but scripts/lib/photo-keys.mjs does not back them up`);
  for (const p of KEY_PREFIXES) assert.ok(found.has(p), `"${p}/" is listed for backup but no PHOTOS.put in functions/ writes it (remove it, or fix this scan)`);
});

test("the exact write sites named in the audit are covered by a source column", () => {
  const cols = PHOTO_SOURCES.map((s) => s.name);
  for (const c of ["posts.photos", "posts.photos_hidden", "posts.video_file", "events.owner_photos", "events.video_file", "users.avatar", "installers.logo", "contests.logo", "contest_sponsors.logo", "contest_sponsors.receipt"]) assert.ok(cols.includes(c), c);
  assert.equal(readFileSync(join(ROOT, "functions/_lib/eventphotos.js"), "utf8").includes("`e/${ev.id}/${name}`"), true);
  assert.equal(readFileSync(join(ROOT, "functions/_lib/eventvideo.js"), "utf8").includes("`ev/${ev.id}/"), true);
  assert.equal(readFileSync(join(ROOT, "functions/_lib/postvideo.js"), "utf8").includes("`v/${row.id}/"), true);
  assert.equal(readFileSync(join(ROOT, "functions/_lib/entryphotos.js"), "utf8").includes("`h/${id}/${name}`"), true);
  assert.equal(readFileSync(join(ROOT, "functions/api/contests/[slug]/logo.js"), "utf8").includes("`contestlogo/${c.id}/"), true);
  assert.equal(readFileSync(join(ROOT, "functions/api/contests/[slug]/sponsors.js"), "utf8").includes("`sponsor-receipt/${c.id}/"), true);
});

// A D1-style export with just the columns the backup reads.
const DUMP = `
CREATE TABLE events(id TEXT, owner_photos TEXT, video_file TEXT NOT NULL DEFAULT '');
CREATE TABLE users(id TEXT, avatar TEXT NOT NULL DEFAULT '');
CREATE TABLE posts(id TEXT, photos TEXT NOT NULL DEFAULT '[]', photos_hidden TEXT NOT NULL DEFAULT '[]', video_file TEXT NOT NULL DEFAULT '');
CREATE TABLE installers(id TEXT, logo TEXT NOT NULL DEFAULT '');
CREATE TABLE contests(id TEXT, logo TEXT NOT NULL DEFAULT '');
CREATE TABLE contest_sponsors(id TEXT, logo TEXT NOT NULL DEFAULT '', receipt TEXT NOT NULL DEFAULT '');
INSERT INTO events VALUES('ev1','["e/ev1/1700000000001.jpg","e/ev1/1700000000002.png"]','ev/ev1/1700000000003.mp4');
INSERT INTO events VALUES('ev2',NULL,'');
INSERT INTO users VALUES('u1','avatars/u1-abc');
INSERT INTO posts VALUES('abcdefgh1','["p/abcdefgh1/1.jpg","pending/abcdefgh1/2.webp"]','["5.jpg"]','v/abcdefgh1/1700000000004.webm');
INSERT INTO installers VALUES('i1','installer/i1/logo-x.png');
INSERT INTO contests VALUES('c1','contestlogo/c1/1700000000005.png');
INSERT INTO contest_sponsors VALUES('s1','sponsor/c1/s1.png','sponsor-receipt/c1/s1.jpg');
INSERT INTO posts VALUES('bad','["../etc/passwd","nothing/x.jpg"]','[]','');
`;

test("collectKeys finds every prefix, builds h/ keys from names, and rejects odd or unknown keys", () => {
  const r = photoKeysFromDump(DUMP);
  assert.equal(r.keys.size, 12);
  assert.deepEqual(countByPrefix(r.keys), { e: 2, ev: 1, avatars: 1, p: 1, pending: 1, h: 1, v: 1, installer: 1, contestlogo: 1, sponsor: 1, "sponsor-receipt": 1 });
  assert.ok(r.keys.has("h/abcdefgh1/5.jpg"));
  assert.equal(r.bad, 2); assert.deepEqual(r.skipped, []);
  assert.equal(keyProblem("a/../b"), "odd"); assert.equal(keyProblem("zzz/x"), "unknown prefix"); assert.equal(keyProblem("e/x/1.jpg"), "");
  // a missing table or column is reported, never silently ignored
  assert.ok(collectKeys(() => { throw new Error("no such column"); }).skipped.length === PHOTO_SOURCES.length);
});

test("verifyDump reports counts of referenced files by prefix and never lists a key", () => {
  const r = verifyDump(DUMP, { tables: 1, events: 1, migrations: 0 });
  assert.equal(r.photos.total, 12); assert.equal(r.photos.byPrefix.ev, 1);
  assert.doesNotMatch(JSON.stringify(r), /1700000000003|abcdefgh1|passwd/);
});

test("checkPhotoCoverage separates a real backup gap from a row that already points at nothing", async () => {
  const keys = new Set(["e/a/1.jpg", "ev/a/2.mp4", "v/b/3.mp4", "h/b/4.jpg"]);
  const backup = new Set(["e/a/1.jpg", "h/b/4.jpg"]), live = new Set(["e/a/1.jpg", "ev/a/2.mp4", "h/b/4.jpg"]);
  const c = await checkPhotoCoverage(keys, { inBackup: async (k) => backup.has(k), inLive: async (k) => live.has(k) });
  assert.equal(c.present, 2); assert.deepEqual(c.gaps, ["ev/a/2.mp4"]); assert.deepEqual(c.dangling, ["v/b/3.mp4"]);
  assert.deepEqual(c.gapsByPrefix, { ev: 1 });
  const noLive = await checkPhotoCoverage(keys, { inBackup: async (k) => backup.has(k) });
  assert.equal(noLive.gaps.length, 2, "without a live check every missing file is a gap");
});

test("copyMissing copies only what is not yet backed up, counts missing-live files and failures", () => {
  const backup = new Set(["e/a/1.jpg"]), live = new Set(["e/a/1.jpg", "ev/a/2.mp4", "v/b/3.mp4"]), put = [];
  const r = copyMissing(["e/a/1.jpg", "ev/a/2.mp4", "v/b/3.mp4", "h/x/9.jpg"], { hasBackup: (k) => backup.has(k), fetchLive: (k) => live.has(k), putBackup: (k) => { if (k === "v/b/3.mp4") throw new Error("boom"); put.push(k); } });
  assert.deepEqual(put, ["ev/a/2.mp4"]); assert.equal(r.had, 1); assert.equal(r.copied, 1); assert.deepEqual(r.missing, ["h/x/9.jpg"]); assert.deepEqual(r.failed, ["v/b/3.mp4"]);
});

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBP")]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom")]);
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);
const BODY = (k) => (k.endsWith(".jpg") ? JPG : k.endsWith(".png") ? PNG : k.endsWith(".webp") ? WEBP : k.endsWith(".mp4") ? MP4 : k.endsWith(".webm") ? WEBM : Buffer.from("avatar-bytes"));
const GOOD = [...photoKeysFromDump(DUMP).keys];

function makeBackupDir(omit = []) {
  const dir = mkdtempSync(join(tmpdir(), "scl-backup-test-"));
  for (const k of GOOD) { if (omit.includes(k)) continue; const f = join(dir, "photos", k); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, BODY(k)); }
  return dir;
}

test("restore rehearsal: a complete backup restores into the scratch folder, counts match, the sample passes", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "scl-scratch-"));
  const r = await rehearse({ sql: DUMP, scratch, fetchBackup: dirFetcher(makeBackupDir()), sample: 5 });
  assert.equal(r.ok, true, r.problems.join("; "));
  assert.equal(r.counts.events, 2); assert.equal(r.counts.users, 1); assert.equal(r.counts.posts, 2);
  assert.equal(r.files.total, 12); assert.equal(r.files.restored, 12); assert.equal(r.files.missing.length, 0);
  assert.ok(r.sample.checked >= 11, "at least one object per prefix is sampled");
  assert.ok(existsSync(join(scratch, "restore.sqlite")) && existsSync(join(scratch, "files/ev/ev1/1700000000003.mp4")));
});

test("restore rehearsal fails when a clip is missing from the backup, or a sampled file is the wrong type, or differs from live", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "scl-scratch-"));
  const miss = await rehearse({ sql: DUMP, scratch, fetchBackup: dirFetcher(makeBackupDir(["ev/ev1/1700000000003.mp4"])) });
  assert.equal(miss.ok, false); assert.deepEqual(miss.files.missingByPrefix, { ev: 1 }); assert.match(miss.problems.join(), /not in the backup/);
  const dir = makeBackupDir(); writeFileSync(join(dir, "photos/e/ev1/1700000000001.jpg"), Buffer.from("not a jpeg at all"));
  const wrong = await rehearse({ sql: DUMP, scratch, fetchBackup: dirFetcher(dir), sample: 50 });
  assert.equal(wrong.ok, false); assert.deepEqual(wrong.sample.bad, ["e/ev1/1700000000001.jpg"]);
  const liveFetch = (k, dest) => { writeFileSync(dest, k === "p/abcdefgh1/1.jpg" ? Buffer.concat([JPG, Buffer.from("changed")]) : BODY(k)); return true; };
  const diff = await rehearse({ sql: DUMP, scratch, fetchBackup: dirFetcher(makeBackupDir()), fetchLive: liveFetch, sample: 50 });
  assert.equal(diff.ok, false); assert.deepEqual(diff.sample.bad, ["p/abcdefgh1/1.jpg"]); assert.ok(diff.sample.comparedToLive >= 11);
  const broken = await rehearse({ sql: "CREATE TABLE x(", scratch, fetchBackup: () => false });
  assert.equal(broken.ok, false); assert.match(broken.problems[0], /does not load/);
});

test("looksLikeFile and pickSample", () => {
  assert.equal(looksLikeFile("a/1.jpg", JPG), true); assert.equal(looksLikeFile("a/1.jpg", PNG), false); assert.equal(looksLikeFile("a/1.mp4", MP4), true);
  assert.equal(looksLikeFile("a/1.webm", WEBM), true); assert.equal(looksLikeFile("a/1.png", Buffer.alloc(0)), false); assert.equal(looksLikeFile("avatars/u-1", Buffer.from("x")), true);
  const s = pickSample(GOOD, 3); assert.ok(new Set(s.map((k) => k.split("/")[0])).size === 11);
});

test("the nightly workflow runs the photo verify and the runbook documents the rehearsal", () => {
  const wf = readFileSync(join(ROOT, ".github/workflows/backup.yml"), "utf8");
  assert.match(wf, /verify-backup\.mjs backup\.sql\.gz --photos "\$BACKUP_BUCKET" --live-bucket "\$PHOTO_BUCKET"/);
  assert.match(readFileSync(join(ROOT, "docs/runbooks/backup-restore.md"), "utf8"), /rehearse-restore\.mjs/);
  assert.ok(existsSync(join(ROOT, "docs/restore-rehearsal.md")));
});
