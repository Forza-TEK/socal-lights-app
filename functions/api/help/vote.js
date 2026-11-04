// POST /api/help/vote { slug, helpful, note } — "Was this helpful?". One vote per person per article per day (a later vote replaces the earlier one).
import { json, err, clean } from "../../_lib/util.js";
import { normText } from "../../_lib/fields.js";
import { fingerprint } from "../../_lib/help.js";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be read.");
  const slug = clean(b.slug, 80).toLowerCase(), helpful = b.helpful ? 1 : 0, note = helpful ? "" : normText(clean(b.note, 300));
  if (!/^[a-z0-9-]+$/.test(slug)) return err(400, "Which article is this about?");
  const ok = await env.DB.prepare("SELECT 1 AS x FROM help_articles WHERE slug = ?").bind(slug).first().catch(() => null);
  if (!ok) return err(404, "That article was not found.");
  const who = await fingerprint(request, slug);
  const prev = await env.DB.prepare("SELECT id, note FROM help_votes WHERE slug = ? AND who = ? AND created_at > datetime('now','-1 day') ORDER BY id DESC LIMIT 1").bind(slug, who).first();
  if (prev) await env.DB.prepare("UPDATE help_votes SET helpful = ?, note = ? WHERE id = ?").bind(helpful, note || prev.note || "", prev.id).run();
  else {
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM help_votes WHERE slug = ? AND created_at > datetime('now','-1 hour')").bind(slug).first();
    if (n >= 200) return json({ ok: true }); // a flood on one article is quietly ignored
    await env.DB.prepare("INSERT INTO help_votes (slug, helpful, note, who) VALUES (?,?,?,?)").bind(slug, helpful, note, who).run();
  }
  return json({ ok: true });
}
