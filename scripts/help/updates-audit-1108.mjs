// Help Center audit of 2026-11-08: corrected text for 43 articles (text in updates-audit-1108.json, one entry per slug: title, summary, keywords, body).
// `node scripts/help/updates-audit-1108.mjs` writes migrations/<NUM>_help_audit_2026-11-08.sql and appends the paste-ready text to docs/help-updates.md.
// Same safe pattern as 0167/0168/0184/0188: UPDATE ... WHERE updated_by = 'seed' only touches articles nobody edited in Admin > Help Center (an Admin save sets updated_by to the
// admin's email). An article edited in Admin is skipped; its new text is in docs/help-updates.md to paste. Slugs never change. No prices in articles (they live in code and on /pricing).
// Word rule (owner): "home", not "house" or "display", for a lit home (button and tab names in quotes are what the screen says).
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
export const NUM = process.env.MIGRATION_NUM || "0199";
const U = JSON.parse(readFileSync(new URL("./updates-audit-1108.json", import.meta.url), "utf8"));
const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";
if (process.argv[1] && process.argv[1].endsWith("updates-audit-1108.mjs")) {
  const slugs = Object.keys(U);
  const sql = slugs.map((s) => { const a = U[s]; return `UPDATE help_articles SET title = ${q(a.title)}, summary = ${q(a.summary)}, body = ${q(a.body)}, keywords = ${q(a.keywords)}, updated_at = datetime('now') WHERE slug = ${q(s)} AND updated_by = 'seed';`; }).join("\n");
  writeFileSync(`migrations/${NUM}_help_audit_2026-11-08.sql`, `-- Help Center audit 2026-11-08 (see scripts/help/updates-audit-1108.mjs): corrected text for ${slugs.length} articles. Only articles nobody edited in Admin are changed (updated_by = 'seed').\n${sql}\n`);
  const doc = `\n\n# Help Center audit, 2026-11-08: paste-ready text\n\nMigration \`${NUM}_help_audit_2026-11-08.sql\` applies this text to every article nobody edited in Admin. For an article you edited in Admin: Admin > Help Center > click the article > replace Title, One-sentence answer, Search words and Text with the blocks below > Save.\n\n` +
    slugs.map((s) => { const a = U[s]; const ind = (t) => String(t).split("\n").map((l) => "    " + l).join("\n"); return `## ${s}\n\nTitle:\n\n${ind(a.title)}\n\nOne-sentence answer:\n\n${ind(a.summary)}\n\nSearch words:\n\n${ind(a.keywords)}\n\nText:\n\n${ind(a.body)}\n`; }).join("\n");
  appendFileSync("docs/help-updates.md", doc);
  console.log("wrote", slugs.length, "updates");
}
