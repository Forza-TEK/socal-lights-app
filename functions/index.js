// GET / — serves the static map page unchanged, plus a visually hidden list of city pages at the end of <body>, so a crawler (or a
// screen reader) that does not run the map sees real links into the site. Nothing visible changes. If anything fails the plain page is served.
import { esc } from "./_lib/shell.js";
import { summarize } from "./_lib/cityindex.js";
import { applyHomeMeta } from "./_lib/homemeta.js";

// One narrow read (only the columns the list needs; the old version ran two full scans, about 4,600 rows read per visit) builds both the city groups and the top-20 confirmed events.
export async function cityNavHtml(env, today) {
  const { results } = await env.DB.prepare("SELECT id, name, city, county, lat, lng, status, featured, start_date FROM events WHERE end_date >= ?").bind(today).all();
  const cities = summarize(results.filter((r) => r.city).map((r) => ({ city: r.city, c: r.county, lat: r.lat, lng: r.lng, st: r.status === "confirmed" ? "c" : "e" }))).filter((c) => c.indexable);
  const byCounty = new Map();
  for (const c of cities) { const k = c.county || "Other"; (byCounty.get(k) || byCounty.set(k, []).get(k)).push(c); }
  const groups = [...byCounty].sort((a, b) => b[1].length - a[1].length).map(([county, list]) =>
    `<h3>${esc(county)} County</h3><ul>${list.sort((a, b) => b.n - a.n || a.city.localeCompare(b.city)).slice(0, 20).map((c) => `<li><a href="/in/${esc(c.slug)}" tabindex="-1">${esc(c.city)}: ${c.n} upcoming event${c.n === 1 ? "" : "s"}</a></li>`).join("")}</ul>`).join("");
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  const evs = results.filter((r) => r.status === "confirmed").sort((a, b) => (b.featured || 0) - (a.featured || 0) || cmp(a.start_date, b.start_date) || cmp(a.name, b.name)).slice(0, 20);
  const events = evs.length ? `<h2>Confirmed events coming up</h2><ul>${evs.map((e) => `<li><a href="/e/${encodeURIComponent(e.id)}" tabindex="-1">${esc(e.name)}, ${esc(e.city)}</a></li>`).join("")}</ul>` : "";
  return `<nav class="sr" aria-label="Browse by city"><h2>Holiday lights and events by city</h2><p><a href="/in" tabindex="-1">All cities</a> <a href="/pricing" tabindex="-1">Feature your event</a> <a href="/help" tabindex="-1">Help</a></p>${groups}${events}</nav>`;
}

// The list is the same for everyone, so it is kept in the edge cache: fresh for NAV_FRESH_MS, then served stale while one request rebuilds it (kept NAV_KEEP_S in all). A cache or database problem falls back to building it directly, and then to the plain page.
const NAV_FRESH_MS = 300_000, NAV_KEEP_S = 3600, LEASE_MS = 30_000;
const inflight = new Map();
const navCopy = (html, builtAt) => new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": `public, s-maxage=${NAV_KEEP_S}`, "x-built": String(builtAt) } });
const pacificToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

export async function cachedNav(env, origin, waitUntil) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (!cache) return cityNavHtml(env, pacificToday());
  const key = new Request(origin + "/__home-nav", { method: "GET" });
  let hit = null; try { hit = await cache.match(key); } catch {}
  if (hit) {
    const html = await hit.clone().text();
    if (Date.now() - Number(hit.headers.get("x-built") || 0) > NAV_FRESH_MS && !inflight.has(key.url)) {
      const job = (async () => { await cache.put(key, navCopy(html, Date.now() - NAV_FRESH_MS + LEASE_MS)); const fresh = await cityNavHtml(env, pacificToday()); await cache.put(key, navCopy(fresh, Date.now())); })().catch(() => {}).finally(() => inflight.delete(key.url));
      inflight.set(key.url, job); waitUntil(job);
    }
    return html;
  }
  const html = await cityNavHtml(env, pacificToday());
  waitUntil(Promise.resolve().then(() => cache.put(key, navCopy(html, Date.now()))).catch(() => {}));
  return html;
}

export async function onRequestGet(context) {
  const { request, env, next } = context;
  const res = await next(), keep = res.clone();
  try {
    if (res.status !== 200 || !/text\/html/.test(res.headers.get("content-type") || "")) return res;
    const nav = await cachedNav(env, new URL(request.url).origin, (p) => { try { context.waitUntil(p); } catch {} }), src = applyHomeMeta(await res.text(), pacificToday()), i = src.lastIndexOf("</body>"); // title and description for the season it is now
    if (i < 0) return new Response(src, res);
    const h = new Headers(res.headers); h.delete("content-length"); h.delete("etag");
    return new Response(src.slice(0, i) + nav + src.slice(i), { status: 200, headers: h });
  } catch { return keep; }
}
