// GET /api/banner — the installers on the map banner today: name, where the name links, phone, and the areas they serve.
// The page picks which ones to show from what is in the map view, so this list is the same for everyone and can be cached.
import { json } from "../../_lib/util.js";

export async function onRequestGet({ env }) {
  const today = new Date().toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(
    "SELECT id, slug, name, web, phone, area, email, blurb, (logo IS NOT NULL AND logo != '') AS has_logo, (top_until != '' AND top_until >= ?1) AS top FROM installers WHERE status = 'active' AND ((banner_until != '' AND banner_until >= ?1) OR (top_until != '' AND top_until >= ?1)) ORDER BY lower(name) LIMIT 80"
  ).bind(today).all().catch(() => ({ results: [] }));
  const items = results.map((r) => ({ id: r.id, n: r.name, u: r.web || (r.email ? "mailto:" + r.email : "/installer/" + r.slug), p: r.phone || "", a: r.area || "", ...(r.top ? { t: 1, s: r.slug, b: (r.blurb || "").slice(0, 160), l: r.has_logo ? 1 : 0 } : {}) }));
  return json(items, { headers: { "cache-control": "public, max-age=120, s-maxage=300" } });
}
