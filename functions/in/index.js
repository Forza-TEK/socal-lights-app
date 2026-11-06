// GET /in — every city that has upcoming events, grouped by county. The crawlable front door to the city pages.
import { esc, header, page } from "../_lib/shell.js";
import { loadCities } from "../_lib/cityindex.js";

export async function onRequestGet(context) {
  const { request, env } = context, origin = new URL(request.url).origin;
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const cities = await loadCities(env, today);
  const byCounty = new Map();
  for (const c of cities) { const k = c.county || "Other"; (byCounty.get(k) || byCounty.set(k, []).get(k)).push(c); }
  const total = cities.reduce((n, c) => n + c.n, 0);
  const groups = [...byCounty].sort((a, b) => b[1].reduce((n, c) => n + c.n, 0) - a[1].reduce((n, c) => n + c.n, 0)).map(([county, list]) =>
    `<h2>${esc(county)} County</h2><div class="foot" style="margin-top:0">${list.sort((a, b) => a.city.localeCompare(b.city)).map((c) => `<a href="/in/${esc(c.slug)}">${esc(c.city)} (${c.n})</a>`).join("")}</div>`).join("");
  const desc = `${total} upcoming holiday lights, tree lightings, parades and seasonal events in ${cities.length} Southern California cities, by county.`;
  const body = `${header("Open the map", "/")}<main><h1>Holiday lights and events by city</h1><p class="sub">${esc(desc)}</p>${groups}<div class="foot"><a href="/">Open the map</a><a href="/add-event">Add an event</a><a href="/pricing">Feature your event</a><a href="/help">Help</a></div></main>`;
  const html = page({ title: "Holiday lights and events by city | SoCal Lights", desc, canonical: `${origin}/in`, body, origin });
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
