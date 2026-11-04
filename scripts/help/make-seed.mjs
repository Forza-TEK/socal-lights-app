// Writes migrations/0153_help_articles.sql from scripts/help/articles.mjs. Each row is INSERT OR IGNORE, so running it again,
// or editing an article in Admin > Help, is never overwritten by this file. Usage: node scripts/help/make-seed.mjs
import { writeFileSync } from "node:fs";
import { ARTICLES } from "./articles.mjs";
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const KEYS = new Set(["find", "enter", "vote", "run", "sponsors", "post", "account"]), KINDS = new Set(["howto", "fix", "answer"]);
const seen = new Set();
const rows = ARTICLES.map((a) => {
  if (!/^[a-z0-9-]+$/.test(a.slug) || seen.has(a.slug)) throw new Error("bad or duplicate slug: " + a.slug); seen.add(a.slug);
  if (!KEYS.has(a.category) || !KINDS.has(a.kind)) throw new Error("bad category or kind: " + a.slug);
  if (!a.title || !a.summary || !a.body) throw new Error("missing text: " + a.slug);
  return `INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES (${[a.slug, a.title, a.category, a.kind, a.summary, a.body, a.keywords || "", a.video || "", a.sort ?? 100, "published", "seed"].map((v, i) => i === 8 ? v : q(v)).join(", ")});`;
});
writeFileSync("migrations/0153_help_articles.sql", `-- The first Help Center articles (see scripts/help/articles.mjs). INSERT OR IGNORE: an article edited in Admin > Help is never overwritten.\n${rows.join("\n")}\n`);
console.log(rows.length, "articles");
