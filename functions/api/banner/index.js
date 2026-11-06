// GET /api/banner — what is on the map banner today: installers (name, where the name links, phone, areas served), the installers with a top-of-the-list card, and events with a banner.
// The page picks which ones to show from what is in the map view, so this list is the same for everyone and can be cached.
// Items: an installer { id, n, u, p, a, bn: 1 when it is in the banner strip, t: 1 (+ s, b, l) when it has a top card } and an event { id: "ev:<event id>", ev: 1, n, c (city), s, e (dates), u: "/e/<id>" } (an event is only ever a strip pill).
// An installer with only the top card (no banner) is in this list for the card and is NOT drawn in the strip (bn is absent).
import { json } from "../../_lib/util.js";
import { ptToday } from "../../_lib/featured.js";

export async function onRequestGet({ env }) {
  const today = ptToday(); // Pacific, like the sale: a placement shows through its last Pacific day
  const { results } = await env.DB.prepare(
    "SELECT id, slug, name, web, phone, area, email, blurb, (logo IS NOT NULL AND logo != '') AS has_logo, (banner_until != '' AND banner_until >= ?1) AS banner, (top_until != '' AND top_until >= ?1) AS top FROM installers WHERE status = 'active' AND ((banner_until != '' AND banner_until >= ?1) OR (top_until != '' AND top_until >= ?1)) ORDER BY lower(name) LIMIT 80"
  ).bind(today).all().catch(() => ({ results: [] }));
  const items = results.map((r) => ({ id: r.id, n: r.name, u: r.web || (r.email ? "mailto:" + r.email : "/installer/" + r.slug), p: r.phone || "", a: r.area || "", ...(r.banner ? { bn: 1 } : {}), ...(r.top ? { t: 1, s: r.slug, b: (r.blurb || "").slice(0, 160), l: r.has_logo ? 1 : 0 } : {}) }));
  // Events with a paid banner that is still running (shown through the last Pacific day). A cancelled or postponed event, or one that has ended, is not shown. Newest purchase last, at most 40.
  const ev = await env.DB.prepare(
    "SELECT id, name, city, start_date, end_date FROM events WHERE banner_until IS NOT NULL AND banner_until >= ?1 AND end_date >= ?1 AND COALESCE(notice, '') NOT IN ('cancelled', 'postponed') ORDER BY start_date, name LIMIT 40"
  ).bind(today).all().catch(() => ({ results: [] }));
  for (const r of ev.results) items.push({ id: "ev:" + r.id, ev: 1, n: r.name, c: r.city || "", s: r.start_date, e: r.end_date, u: "/e/" + r.id });
  return json(items, { headers: { "cache-control": "public, max-age=120, s-maxage=300" } });
}
