// DELETE /api/admin/help/<slug> — remove an article (its votes go with it).
import { json, err } from "../../../_lib/util.js";

export async function onRequestDelete({ env, params }) {
  const slug = String(params.slug || "").toLowerCase();
  const r = await env.DB.prepare("DELETE FROM help_articles WHERE slug = ?").bind(slug).run();
  if (!r.meta || !r.meta.changes) return err(404, "That article was not found.");
  await env.DB.prepare("DELETE FROM help_votes WHERE slug = ?").bind(slug).run().catch(() => {});
  return json({ ok: true });
}
