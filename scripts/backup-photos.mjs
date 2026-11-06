// Copies every photo the database points at from the live R2 bucket to the private backup bucket (add-only: nothing is ever deleted there).
// Usage (in CI, after `wrangler` is logged in through CLOUDFLARE_API_TOKEN):  node scripts/backup-photos.mjs <live-bucket> <backup-bucket>
// Keys come from the database (posts.photos, users.avatar, installers.logo, contest_sponsors.logo), so only photos still in use are copied.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [live, backup] = process.argv.slice(2);
if (!live || !backup) { console.error("usage: backup-photos.mjs <live-bucket> <backup-bucket>"); process.exit(2); }
const W = ["node_modules/.bin/wrangler"];
const run = (args, o = {}) => execFileSync(W[0], args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20, ...o });
const q = (sql) => JSON.parse(run(["d1", "execute", "socal-lights", "--remote", "--json", "--command", sql]))[0].results;

const keys = new Set();
for (const r of q("SELECT photos AS v FROM posts WHERE photos != '[]'")) { try { for (const k of JSON.parse(r.v)) keys.add(k); } catch {} }
for (const sql of ["SELECT avatar AS v FROM users WHERE avatar != ''", "SELECT logo AS v FROM installers WHERE logo != ''", "SELECT logo AS v FROM contest_sponsors WHERE logo != ''"]) {
  try { for (const r of q(sql)) keys.add(r.v); } catch (e) { console.log("skipped a source: " + String(e.message).split("\n")[0]); }
}
console.log(`${keys.size} photo keys in the database`);
const dir = mkdtempSync(join(tmpdir(), "scl-photos-")), tmp = join(dir, "obj");
let copied = 0, had = 0, missing = 0;
try {
  for (const k of keys) {
    if (/[\r\n]|\.\./.test(k)) { console.log("skipping odd key"); continue; }
    try { run(["r2", "object", "get", `${backup}/photos/${k}`, "--remote", "--file", tmp]); had++; continue; } catch {} // already backed up
    try { run(["r2", "object", "get", `${live}/${k}`, "--remote", "--file", tmp]); } catch { missing++; console.log("not in the live bucket (row points at a missing photo): " + k); continue; }
    run(["r2", "object", "put", `${backup}/photos/${k}`, "--remote", "--file", tmp]);
    copied++;
    if (existsSync(tmp)) rmSync(tmp);
  }
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log(`photos: ${copied} copied, ${had} already backed up, ${missing} missing in the live bucket`);
