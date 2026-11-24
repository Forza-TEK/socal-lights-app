// Copies every file the database points at from the live R2 bucket to the private backup bucket (add-only: nothing is ever deleted there).
// Usage (in CI, after `wrangler` is logged in through CLOUDFLARE_API_TOKEN):  node scripts/backup-photos.mjs <live-bucket> <backup-bucket>
// Keys come from the database, so only files still in use are copied. The sources (home photos, hidden and organizer photos, home and event clips, event owner photos,
// avatars, installer logos, contest logos, sponsor logos and receipts) are listed in scripts/lib/photo-keys.mjs; every key prefix the app writes must be there (tests/photo-backup.test.mjs).
// Exit 1 when a source could not be read (a gap in the backup must never be silent) or a copy failed.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { collectKeys, countByPrefix } from "./lib/photo-keys.mjs";

// Pure copy loop. io = { hasBackup(key), fetchLive(key) -> bool (false = missing live), putBackup(key) }. Returns the counts.
export function copyMissing(keys, io) {
  const r = { copied: 0, had: 0, missing: [], failed: [] };
  for (const k of keys) {
    if (io.hasBackup(k)) { r.had++; continue; }
    if (!io.fetchLive(k)) { r.missing.push(k); continue; }
    try { io.putBackup(k); r.copied++; } catch { r.failed.push(k); }
  }
  return r;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [live, backup] = process.argv.slice(2);
  if (!live || !backup) { console.error("usage: backup-photos.mjs <live-bucket> <backup-bucket>"); process.exit(2); }
  const W = "node_modules/.bin/wrangler";
  const run = (args) => execFileSync(W, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 });
  const q = (sql) => JSON.parse(run(["d1", "execute", "socal-lights", "--remote", "--json", "--command", sql]))[0].results;

  const { keys, skipped, bad } = collectKeys(q);
  console.log(`${keys.size} files in the database: ${JSON.stringify(countByPrefix(keys))}${bad ? `, ${bad} odd keys skipped` : ""}`);
  const dir = mkdtempSync(join(tmpdir(), "scl-photos-")), tmp = join(dir, "obj");
  let r;
  try {
    r = copyMissing(keys, {
      hasBackup: (k) => { try { run(["r2", "object", "get", `${backup}/photos/${k}`, "--remote", "--file", tmp]); return true; } catch { return false; } },
      fetchLive: (k) => { try { run(["r2", "object", "get", `${live}/${k}`, "--remote", "--file", tmp]); return true; } catch { return false; } },
      putBackup: (k) => { try { run(["r2", "object", "put", `${backup}/photos/${k}`, "--remote", "--file", tmp]); } finally { if (existsSync(tmp)) rmSync(tmp); } },
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  for (const k of r.missing) console.log("not in the live bucket (row points at a missing file): " + k);
  console.log(`files: ${r.copied} copied, ${r.had} already backed up, ${r.missing.length} missing in the live bucket, ${r.failed.length} copy failures`);
  let fail = false;
  if (skipped.length) { console.log(`::error::could not read these sources, so their files are NOT backed up: ${skipped.join(", ")}`); fail = true; }
  if (r.failed.length) { console.log(`::error::${r.failed.length} files failed to copy`); fail = true; }
  process.exit(fail ? 1 : 0);
}
