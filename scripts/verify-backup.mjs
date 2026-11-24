#!/usr/bin/env node
// Proves a D1 export can really be restored: loads it into an empty in-memory SQLite database (Node 22.13+, built-in node:sqlite) and checks the shape.
//   node scripts/verify-backup.mjs backup.sql.gz [--min-tables 30] [--min-events 500] [--min-migrations 100]
// Accepts .sql or .sql.gz. Prints ONLY counts (tables, indexes, rows of a few key tables): never a row, an address or a value, because CI logs of this public repository are world-readable.
// Exit 1 when the file does not load, or a count is below its floor. Used by .github/workflows/backup.yml before the file is uploaded, so a bad export never replaces a good one.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectKeys, countByPrefix } from "./lib/photo-keys.mjs";

// Returns { ok, tables, indexes, counts, problems }. Never includes row data.
export function verifyDump(sql, floors = {}) {
  const f = { tables: 30, events: 500, migrations: 100, ...floors };
  const problems = [], counts = {};
  const db = new DatabaseSync(":memory:");
  try { db.exec(sql); } catch (e) { return { ok: false, tables: 0, indexes: 0, counts, problems: ["the export does not load into SQLite: " + String(e.message).replace(/'[^']*'/g, "'...'").slice(0, 160)] }; }
  const n = (q) => Number(db.prepare(q).get().n);
  const tables = n("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"), indexes = n("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'");
  for (const t of ["events", "users", "posts", "contests", "feature_orders", "d1_migrations"]) { try { counts[t] = n(`SELECT COUNT(*) AS n FROM "${t}"`); } catch { counts[t] = null; problems.push(`table ${t} is missing`); } }
  if (tables < f.tables) problems.push(`only ${tables} tables (expected at least ${f.tables})`);
  if (counts.events != null && counts.events < f.events) problems.push(`only ${counts.events} events (expected at least ${f.events})`);
  if (counts.d1_migrations != null && counts.d1_migrations < f.migrations) problems.push(`only ${counts.d1_migrations} applied migrations (expected at least ${f.migrations})`);
  const refs = collectKeys((q) => db.prepare(q).all());
  const photos = { total: refs.keys.size, byPrefix: countByPrefix(refs.keys), skipped: refs.skipped, rejected: refs.bad };
  db.close();
  return { ok: problems.length === 0, tables, indexes, counts, photos, problems };
}

// Every object key the export's rows point at (so a restore rehearsal knows what must exist). Keys are object paths, not personal data, but they are never printed one by one.
export function photoKeysFromDump(sql) {
  const db = new DatabaseSync(":memory:");
  try { db.exec(sql); return collectKeys((q) => db.prepare(q).all()); } finally { db.close(); }
}

// Checks that every photo/video/logo/receipt the database points at exists in the backup bucket.
//   inBackup(key) -> Promise<boolean>; inLive(key) -> Promise<boolean> (optional). A key missing from BOTH is a dangling row (already broken in production), reported apart from a real backup gap.
// Returns { total, present, gaps: [keys missing from the backup but alive in production], dangling: [missing in both], gapsByPrefix, danglingByPrefix }.
export async function checkPhotoCoverage(keys, { inBackup, inLive }) {
  const list = [...keys], gaps = [], dangling = []; let present = 0;
  for (const k of list) {
    if (await inBackup(k)) { present++; continue; }
    if (inLive && !(await inLive(k))) dangling.push(k); else gaps.push(k);
  }
  return { total: list.length, present, gaps, dangling, gapsByPrefix: countByPrefix(gaps), danglingByPrefix: countByPrefix(dangling) };
}

// wrangler based existence check (there is no "head" command, so the object is fetched to a temp file and thrown away). Call .cleanup() when done.
export function r2Exists(bucket, prefix = "") {
  const dir = mkdtempSync(join(tmpdir(), "scl-verify-")), tmp = join(dir, "obj");
  const fn = async (key) => { try { execFileSync("node_modules/.bin/wrangler", ["r2", "object", "get", `${bucket}/${prefix}${key}`, "--remote", "--file", tmp], { stdio: "ignore" }); return true; } catch { return false; } };
  fn.cleanup = () => rmSync(dir, { recursive: true, force: true });
  return fn;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), file = a.find((x) => !x.startsWith("--") && !/^\d+$/.test(x));
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? Number(a[i + 1]) : undefined; };
  if (!file) { console.error("Usage: verify-backup.mjs <file.sql|file.sql.gz> [--min-tables N] [--min-events N] [--min-migrations N]"); process.exit(2); }
  const buf = readFileSync(file), sql = (file.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8");
  const r = verifyDump(sql, { tables: opt("--min-tables"), events: opt("--min-events"), migrations: opt("--min-migrations") });
  console.log(`restore test: ${r.ok ? "PASSED" : "FAILED"}: ${r.tables} tables, ${r.indexes} indexes, rows: ${Object.entries(r.counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`files the rows point at: ${r.photos.total} (${Object.entries(r.photos.byPrefix).map(([k, v]) => `${k}/=${v}`).join(", ") || "none"})`);
  for (const p of r.problems) console.log(`::error::${p}`);
  let ok = r.ok;
  // A real export has every photo column; one that lacks a source would silently skip those files in the backup.
  if (r.photos.skipped.length) { console.log(`::error::photo sources not found in the export: ${r.photos.skipped.join(", ")}`); ok = false; }
  // --photos <backup-bucket> [--live-bucket <live-bucket>]: every file the rows point at must be in the backup bucket (photos/<key>). Counts only, never keys.
  const sv = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : ""; };
  if (sv("--photos")) {
    const inBackup = r2Exists(sv("--photos"), "photos/"), inLive = sv("--live-bucket") ? r2Exists(sv("--live-bucket")) : undefined;
    try {
      const c = await checkPhotoCoverage(photoKeysFromDump(sql).keys, { inBackup, inLive });
      console.log(`photo backup coverage: ${c.present} of ${c.total} files are in the backup bucket; ${c.gaps.length} missing from the backup, ${c.dangling.length} missing everywhere (rows already pointing at nothing)`);
      if (c.gaps.length) { console.log(`::error::${c.gaps.length} files exist in production but not in the backup: ${JSON.stringify(c.gapsByPrefix)}`); ok = false; }
      if (c.dangling.length) console.log(`::warning::${c.dangling.length} rows point at files that are missing in production too: ${JSON.stringify(c.danglingByPrefix)}`);
    } finally { inBackup.cleanup(); if (inLive) inLive.cleanup(); }
  }
  process.exit(ok ? 0 : 1);
}
