#!/usr/bin/env node
// Restore rehearsal: rebuilds a backup in a SCRATCH folder (never touches production) and checks it.
//   node scripts/rehearse-restore.mjs --dump latest.sql.gz --from-bucket socal-lights-backups [--scratch ./restore-scratch] [--sample 20] [--live-bucket socal-lights-photos]
//   node scripts/rehearse-restore.mjs --dump latest.sql.gz --from-dir ./downloaded-backup   (a folder that holds photos/<key>, for a backup you already downloaded)
// 1. loads the D1 export into a fresh SQLite file in the scratch folder and prints table and row counts (events, users, posts, orders, ...);
// 2. lists every file the rows point at (home photos, hidden/organizer photos, clips, event photos, avatars, logos, sponsor receipts) and restores each from the backup into the scratch folder;
// 3. reports restored / missing per key prefix and checks a sample of objects: not empty, the first bytes look like the file type, and (with --live-bucket) identical to the live copy.
// Reads only: --from-bucket and --live-bucket use `wrangler r2 object get --remote`, nothing is written to R2 or D1. Exit 1 when the export does not load, any file is missing from the backup, or a sampled object is bad.
// Run it on your own computer (the scratch folder holds private data: emails, sponsor receipts). Delete the folder afterwards. Do not run it in GitHub Actions: its logs are public.
import { readFileSync, mkdirSync, copyFileSync, existsSync, statSync, rmSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { collectKeys, countByPrefix, prefixOf } from "./lib/photo-keys.mjs";

const TABLES = ["events", "users", "posts", "contests", "contest_sponsors", "installers", "feature_orders", "event_submissions", "d1_migrations"];

// Does the file's first bytes match what its name says? (Same idea as the sniffers the app uses on upload.)
export function looksLikeFile(key, head) {
  const b = head, ext = String(key).split(".").pop().toLowerCase();
  if (!b.length) return false;
  if (ext === "jpg" || ext === "jpeg") return b[0] === 0xff && b[1] === 0xd8;
  if (ext === "png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (ext === "webp") return b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP";
  if (ext === "mp4" || ext === "mov") return b.slice(4, 8).toString() === "ftyp";
  if (ext === "webm") return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  return true; // avatars/<id>-<ts> has no extension, receipts may be PDF: non-empty is all that can be said
}

// A sample that always includes at least one object of every prefix that exists, then evenly spaced picks up to n.
export function pickSample(keys, n) {
  const all = [...keys].sort(), picked = new Set(), seen = new Set();
  for (const k of all) if (!seen.has(prefixOf(k))) { seen.add(prefixOf(k)); picked.add(k); }
  const step = Math.max(1, Math.floor(all.length / Math.max(1, n)));
  for (let i = 0; i < all.length && picked.size < Math.max(n, seen.size); i += step) picked.add(all[i]);
  return [...picked];
}

const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

// fetchBackup(key, destFile) -> boolean; fetchLive(key, destFile) -> boolean (optional).
export async function rehearse({ sql, scratch, fetchBackup, fetchLive, sample = 20 }) {
  const out = { ok: true, problems: [], counts: {}, tables: 0, files: { total: 0, restored: 0, missing: [], byPrefix: {}, missingByPrefix: {} }, sample: { checked: 0, bad: [], comparedToLive: 0 } };
  mkdirSync(scratch, { recursive: true });
  const dbFile = join(scratch, "restore.sqlite");
  if (existsSync(dbFile)) rmSync(dbFile);
  const db = new DatabaseSync(dbFile);
  try { db.exec(sql); } catch (e) { out.ok = false; out.problems.push("the export does not load into SQLite: " + String(e.message).slice(0, 160)); db.close(); return out; }
  out.tables = Number(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().n);
  for (const t of TABLES) { try { out.counts[t] = Number(db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n); } catch { out.counts[t] = null; } }
  if (out.counts.events == null || out.counts.users == null || out.counts.posts == null) { out.ok = false; out.problems.push("the export has no events, users or posts table"); }
  const refs = collectKeys((q) => db.prepare(q).all());
  db.close();
  if (refs.skipped.length) { out.ok = false; out.problems.push(`photo columns missing from the export: ${refs.skipped.join(", ")}`); }
  out.files.total = refs.keys.size; out.files.byPrefix = countByPrefix(refs.keys);

  const root = join(scratch, "files");
  for (const k of refs.keys) {
    const dest = join(root, k);
    mkdirSync(dirname(dest), { recursive: true });
    let ok = false; try { ok = await fetchBackup(k, dest); } catch { ok = false; }
    if (ok && existsSync(dest)) out.files.restored++; else out.files.missing.push(k);
  }
  out.files.missingByPrefix = countByPrefix(out.files.missing);
  if (out.files.missing.length) { out.ok = false; out.problems.push(`${out.files.missing.length} files the database points at are not in the backup: ${JSON.stringify(out.files.missingByPrefix)}`); }

  const gone = new Set(out.files.missing);
  for (const k of pickSample([...refs.keys].filter((x) => !gone.has(x)), sample)) {
    const dest = join(root, k), size = statSync(dest).size, head = readFileSync(dest).subarray(0, 12);
    out.sample.checked++;
    if (!size || !looksLikeFile(k, head)) { out.sample.bad.push(k); continue; }
    if (fetchLive) {
      const tmp = dest + ".live"; let have = false; try { have = await fetchLive(k, tmp); } catch {}
      if (have) { out.sample.comparedToLive++; if (sha(tmp) !== sha(dest)) out.sample.bad.push(k); rmSync(tmp, { force: true }); }
    }
  }
  if (out.sample.bad.length) { out.ok = false; out.problems.push(`${out.sample.bad.length} sampled files are empty, the wrong type, or differ from the live copy`); }
  return out;
}

export const readDump = (file) => { const buf = readFileSync(file); return (file.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8"); };
export const dirFetcher = (dir) => { const base = existsSync(join(dir, "photos")) ? join(dir, "photos") : dir; return (key, dest) => { const src = join(base, key); if (!existsSync(src)) return false; copyFileSync(src, dest); return true; }; };
export const bucketFetcher = (bucket, prefix = "") => (key, dest) => { try { execFileSync("node_modules/.bin/wrangler", ["r2", "object", "get", `${bucket}/${prefix}${key}`, "--remote", "--file", dest], { stdio: "ignore" }); return true; } catch { return false; } };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), val = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : ""; };
  const dump = val("--dump"), dir = val("--from-dir"), bucket = val("--from-bucket"), live = val("--live-bucket");
  const scratch = resolve(val("--scratch") || "restore-scratch"), n = Number(val("--sample")) || 20;
  if (!dump || (!dir && !bucket)) { console.error("Usage: rehearse-restore.mjs --dump <file.sql|.sql.gz> (--from-bucket <backup-bucket> | --from-dir <folder with photos/>) [--scratch <folder>] [--sample N] [--live-bucket <bucket>]"); process.exit(2); }
  const r = await rehearse({ sql: readDump(dump), scratch, sample: n, fetchBackup: dir ? dirFetcher(dir) : bucketFetcher(bucket, "photos/"), fetchLive: live ? bucketFetcher(live) : undefined });
  console.log(`restore rehearsal: ${r.ok ? "PASSED" : "FAILED"} (scratch folder: ${scratch})`);
  console.log(`database: ${r.tables} tables; rows: ${Object.entries(r.counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`files: ${r.files.restored} of ${r.files.total} restored ${JSON.stringify(r.files.byPrefix)}; missing ${r.files.missing.length} ${JSON.stringify(r.files.missingByPrefix)}`);
  for (const k of r.files.missing.slice(0, 10)) console.log("  missing: " + k);
  console.log(`sample: ${r.sample.checked} objects checked${live ? `, ${r.sample.comparedToLive} compared byte for byte with the live bucket` : ""}, ${r.sample.bad.length} bad`);
  for (const k of r.sample.bad.slice(0, 10)) console.log("  bad: " + k);
  for (const p of r.problems) console.log("PROBLEM: " + p);
  console.log("Record the date and the counts above in docs/runbooks/backup-restore.md, then delete the scratch folder.");
  process.exit(r.ok ? 0 : 1);
}
