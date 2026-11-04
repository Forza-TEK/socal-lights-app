// A quick check of the written articles: every internal link goes to a real article, every video file exists, no empty parts.
// Usage: node scripts/help/check.mjs
import { existsSync } from "node:fs";
import { ARTICLES } from "./articles.mjs";
const slugs = new Set(ARTICLES.map((a) => a.slug)); let bad = 0;
const fail = (m) => { console.log("PROBLEM:", m); bad++; };
for (const a of ARTICLES) {
  for (const [, u] of a.body.matchAll(/\]\((\/[^)\s]*)\)/g)) { const m = u.match(/^\/help\/([a-z0-9-]+)$/); if (m && !slugs.has(m[1])) fail(`${a.slug} links to missing article ${u}`); }
  if (a.video && !existsSync(`public/tutorials/${a.video}.mp4`)) fail(`${a.slug}: no video file ${a.video}.mp4`);
  if (a.summary.length > 300) fail(`${a.slug}: summary too long`);
  if (a.body.split(/\s+/).length < 25) fail(`${a.slug}: very short`);
}
console.log(ARTICLES.length, "articles checked,", bad, "problems");
