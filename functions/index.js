// GET / — serves the static map page unchanged, plus a visually hidden list of city pages at the end of <body>, so a crawler (or a
// screen reader) that does not run the map sees real links into the site. Nothing visible changes. If anything fails the plain page is served.
import { esc } from "./_lib/shell.js";
import { loadCities } from "./_lib/cityindex.js";

export async function cityNavHtml(env, today) {
  const cities = (await loadCities(env, today)).filter((c) => c.indexable);
  const byCounty = new Map();
  for (const c of cities) { const k = c.county || "Other"; (byCounty.get(k) || byCounty.set(k, []).get(k)).push(c); }
  const groups = [...byCounty].sort((a, b) => b[1].length - a[1].length).map(([county, list]) =>
    `<h3>${esc(county)} County</h3><ul>${list.sort((a, b) => b.n - a.n || a.city.localeCompare(b.city)).slice(0, 20).map((c) => `<li><a href="/in/${esc(c.slug)}" tabindex="-1">${esc(c.city)}: ${c.n} upcoming event${c.n === 1 ? "" : "s"}</a></li>`).join("")}</ul>`).join("");
  let evs = []; try { evs = (await env.DB.prepare("SELECT id, name, city FROM events WHERE end_date >= ? AND status = 'confirmed' ORDER BY featured DESC, start_date, name LIMIT 20").bind(today).all()).results; } catch {}
  const events = evs.length ? `<h2>Confirmed events coming up</h2><ul>${evs.map((e) => `<li><a href="/e/${encodeURIComponent(e.id)}" tabindex="-1">${esc(e.name)}, ${esc(e.city)}</a></li>`).join("")}</ul>` : "";
  return `<nav class="sr" aria-label="Browse by city"><h2>Holiday lights and events by city</h2><p><a href="/in" tabindex="-1">All cities</a> <a href="/pricing" tabindex="-1">Feature your event</a> <a href="/help" tabindex="-1">Help</a></p>${groups}${events}</nav>`;
}

export async function onRequestGet({ env, next }) {
  const res = await next(), keep = res.clone();
  try {
    if (res.status !== 200 || !/text\/html/.test(res.headers.get("content-type") || "")) return res;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    const nav = await cityNavHtml(env, today), src = await res.text(), i = src.lastIndexOf("</body>");
    if (i < 0) return new Response(src, res);
    const h = new Headers(res.headers); h.delete("content-length"); h.delete("etag");
    return new Response(src.slice(0, i) + nav + src.slice(i), { status: 200, headers: h });
  } catch { return keep; }
}
