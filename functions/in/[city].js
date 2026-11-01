// GET /in/<city> — a plain page of the upcoming holiday and seasonal events in one city, with schema.org Event data,
// so search engines can index "Christmas lights in Whittier". The app itself stays on "/".
import { rowToEvent } from "../_lib/util.js";
import { pairs, approvedPosts } from "../_lib/addrkey.js";

export const slugOf = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export async function onRequestGet(context) {
  const { request, env, params } = context, origin = new URL(request.url).origin;
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const { results } = await env.DB.prepare("SELECT * FROM events WHERE end_date >= ? ORDER BY start_date, name").bind(today).all();
  let hide = new Set();
  try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const evs = results.filter((r) => !hide.has(r.id)).map(rowToEvent).filter((e) => slugOf(e.city) === params.city);
  if (!evs.length) return new Response("No upcoming events found for that city.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const city = evs[0].city, county = evs[0].c;
  const title = `Holiday lights and seasonal events in ${city}, CA | SoCal Lights`;
  const desc = `${evs.length} upcoming event${evs.length === 1 ? "" : "s"} in ${city}, ${county} County: Christmas lights, tree lightings, parades, Halloween and more, with dates, places and directions.`;
  const ld = evs.slice(0, 60).map((e) => ({
    "@context": "https://schema.org", "@type": "Event", name: e.n, startDate: e.s, endDate: e.e,
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: e.b || undefined, url: `${origin}/#e-${e.id}`, isAccessibleForFree: !!e.free,
    location: { "@type": "Place", name: e.v || e.city, address: { "@type": "PostalAddress", streetAddress: e.a || undefined, addressLocality: e.city, addressRegion: "CA", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng } },
  }));
  const li = evs.map((e) => `<li><a href="/#e-${esc(e.id)}"><b>${esc(e.n)}</b></a><br><span>${esc(e.s === e.e ? fmt(e.s) : fmt(e.s) + " to " + fmt(e.e))}${e.h ? " · " + esc(e.h) : ""} · ${esc(e.free ? "Free" : e.p || "Price not listed")}</span><br><span>${esc([e.v, e.a].filter(Boolean).join(", "))}</span>${e.b ? `<p>${esc(e.b)}</p>` : ""}${e.st === "e" ? "<em>Date expected from past years: check the event site.</em>" : ""}</li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${origin}/in/${esc(params.city)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${origin}/img/share.png"><link rel="icon" href="/img/icon-192.png"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><style>:root{color-scheme:light dark;--bg:#fff;--ink:#14161a;--mut:#5b6270;--line:#e6e8ec;--acc:#d1343f}@media(prefers-color-scheme:dark){:root{--bg:#101216;--ink:#f1f3f6;--mut:#a3aab6;--line:#2a2e36;--acc:#ff6b6b}}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:720px;margin:0 auto;padding:20px 16px 48px}h1{font-size:1.7rem;font-weight:500;line-height:1.2}a{color:var(--acc)}ul{list-style:none;padding:0}li{padding:14px 0;border-top:1px solid var(--line)}li span,p{color:var(--mut)}li p{margin:6px 0 0}.cta{display:inline-block;margin:6px 0 14px;padding:12px 18px;border-radius:999px;background:var(--ink);color:var(--bg);text-decoration:none;font-weight:500}</style></head><body><main><a href="/" aria-label="SoCal Lights home"><img src="/img/badge-160.webp" width="48" height="48" alt="SoCal Lights" style="border-radius:50%"></a><h1>Holiday lights and seasonal events in ${esc(city)}, CA</h1><p>${esc(desc)}</p><a class="cta" href="/">Open the map</a><ul>${li}</ul><p><a href="/">See every event on the SoCal Lights map</a> · <a href="/privacy">Privacy</a></p></main></body></html>`;
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
