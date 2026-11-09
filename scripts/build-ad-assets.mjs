#!/usr/bin/env node
// Copies the FINAL approved ad creative into public/ad-assets/<asset-id>/ and writes public/ad-assets/manifest.json (sha256, bytes, type, size).
// GET /api/ads/assets and /api/ads/brief read that manifest. Usage:
//   node scripts/build-ad-assets.mjs --from docs/marketing/ad-assets [--out public/ad-assets]
// Source layout: <from>/<asset-id>/<file>.png|jpg|mp4 (folders starting with "_" are build files and are skipped).
// Limits: Cloudflare Pages allows 25 MiB per file; this script refuses anything over 20 MiB. Only png, jpg, webp, mp4 and mov files are accepted.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const from = opt("--from"), out = opt("--out", "public/ad-assets");
if (!from) { console.error("Usage: build-ad-assets.mjs --from <dir with <asset-id>/ folders> [--out public/ad-assets]"); process.exit(2); }
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime" };
const MAX = 20 * 1024 * 1024;
const files = [];
for (const id of readdirSync(from).sort()) {
  if (id.startsWith("_") || !statSync(path.join(from, id)).isDirectory()) continue;
  if (!/^[a-z0-9-]{3,60}$/.test(id)) { console.error("Bad asset id (lowercase letters, digits, hyphens): " + id); process.exit(1); }
  for (const f of readdirSync(path.join(from, id)).sort()) {
    const ext = path.extname(f).toLowerCase(), src = path.join(from, id, f);
    if (!TYPES[ext]) { console.error("Skipped (type not allowed): " + src); continue; }
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(f)) { console.error("Bad file name: " + src); process.exit(1); }
    const size = statSync(src).size;
    if (size > MAX) { console.error(`Too big (${size} bytes, limit ${MAX}): ${src}`); process.exit(1); }
    const buf = readFileSync(src), dest = path.join(out, id, f);
    mkdirSync(path.dirname(dest), { recursive: true }); copyFileSync(src, dest);
    const m = /(\d{3,4})x(\d{3,4})/.exec(f), ratio = /4x5/.test(f) ? "4:5" : /9x16/.test(f) ? "9:16" : "";
    files.push({ asset_id: id, path: `${id}/${f}`, content_type: TYPES[ext], bytes: size, sha256: createHash("sha256").update(buf).digest("hex"), width: m ? +m[1] : null, height: m ? +m[2] : null, ratio });
  }
}
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ version: 1, files }, null, 1) + "\n");
console.log(`${files.length} files, ${files.reduce((s, f) => s + f.bytes, 0)} bytes, manifest written to ${path.join(out, "manifest.json")}`);
