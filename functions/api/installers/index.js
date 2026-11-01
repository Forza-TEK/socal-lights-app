// GET /api/installers?q= — installers already on the site, for the "who installed your lights?" suggestions.
import { json } from "../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 40).replace(/[%_]/g, "");
  if (q.length < 2) return json([], { headers: { "cache-control": "public, max-age=60" } });
  const { results } = await env.DB.prepare("SELECT name, slug, web FROM installers WHERE status = 'active' AND lower(name) LIKE lower(?) ORDER BY name LIMIT 8").bind(`%${q}%`).all();
  return json(results, { headers: { "cache-control": "public, max-age=60" } });
}
