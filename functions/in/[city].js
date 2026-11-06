// GET /in/<city> — a plain page of the upcoming holiday and seasonal events in one city, with schema.org Event data,
// so search engines can index "Christmas lights in Whittier". The app itself stays on "/".
import { rowToEvent } from "../_lib/util.js";
import { pairs, approvedPosts } from "../_lib/addrkey.js";
import { esc, header, page, crumbs } from "../_lib/shell.js";
import { slugOf, summarize, nearby, isIndexable } from "../_lib/cityindex.js";

export { slugOf };
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export async function onRequestGet(context) {
  const { request, env, params } = context, origin = new URL(request.url).origin;
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const { results } = await env.DB.prepare("SELECT * FROM events WHERE end_date >= ? ORDER BY start_date, name").bind(today).all();
  let hide = new Set();
  try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const upcoming = results.filter((r) => !hide.has(r.id)).map(rowToEvent);
  const evs = upcoming.filter((e) => slugOf(e.city) === params.city);
  if (!evs.length) return new Response("No upcoming events found for that city.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const city = evs[0].city, county = evs[0].c;
  // At most 60 characters (search results cut longer titles): the long wording first, shorter ones for long city names
  const title = [`Holiday lights and events in ${city}, CA | SoCal Lights`, `Lights and events in ${city}, CA | SoCal Lights`, `${city} lights and events | SoCal Lights`, `${city} | SoCal Lights`].find((t) => t.length <= 60) || `${city.slice(0, 40)} | SoCal Lights`;
  const desc = `${evs.length} upcoming event${evs.length === 1 ? "" : "s"} in ${city}, ${county} County: Christmas lights, tree lightings, parades, Halloween and more, with dates, places and directions.`;
  // Structured data only for events whose dates are confirmed. "Expected" events stay in the visible list but get no markup,
  // because the markup would state a firm date and "scheduled" status that the page itself says is only an estimate.
  const ld = evs.filter((e) => e.st === "c").slice(0, 60).map((e) => ({
    "@context": "https://schema.org", "@type": "Event", name: e.n, startDate: e.s, endDate: e.e,
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: e.b || undefined, url: `${origin}/#e-${e.id}`, isAccessibleForFree: !!e.free,
    location: { "@type": "Place", name: e.v || e.city, address: { "@type": "PostalAddress", streetAddress: e.a || undefined, addressLocality: e.city, addressRegion: "CA", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng } },
  }));
  const bc = crumbs(origin, [{ name: "SoCal Lights", href: "/" }, { name: "Cities", href: "/in" }, { name: city }]);
  const thumb = (u) => { if (!u) return ""; const full = esc(u); const small = /^https?:\/\//.test(u) ? `/cdn-cgi/image/width=240,fit=cover/${esc(u)}` : full; return `<img src="${small}" alt="" loading="lazy" width="120" height="120" onerror="this.onerror=null;this.src='${full}'">`; };
  const li = evs.map((e) => `<a class="ev" href="/#e-${esc(e.id)}"><div class="ph">${thumb(e.img)}</div><div><h3>${esc(e.n)}</h3><p>${esc(e.s === e.e ? fmt(e.s) : fmt(e.s) + " to " + fmt(e.e))}${e.h ? " · " + esc(e.h) : ""}</p><p>${esc([e.v, e.a].filter(Boolean).join(", "))}</p><div class="tags">${e.nt ? `<span class="tag cancel">${e.nt === "cancelled" ? "Cancelled" : "Postponed"}</span>` : ""}<span class="tag ${e.free ? "free" : "paid"}">${esc(e.free ? "Free" : e.p || "Price not listed")}</span><span class="tag ${e.st === "c" ? "conf" : "exp"}">${e.st === "c" ? "Confirmed" : "Expected"}</span></div></div></a>`).join("");
  // Nearest cities that have a page worth visiting, then the rest of the county, then the ways to add or promote an event
  const cities = summarize(upcoming), me = cities.find((c) => c.slug === params.city), near = nearby(cities, params.city, 6), shown = new Set(near.map((c) => c.slug));
  const more = cities.filter((c) => c.county === county && c.slug !== params.city && !shown.has(c.slug) && c.indexable).sort((a, b) => b.n - a.n || a.city.localeCompare(b.city)).slice(0, 12);
  const link = (c, extra = "") => `<a href="/in/${esc(c.slug)}">${esc(c.city)} (${c.n})${extra}</a>`;
  const moreHtml = `${near.length ? `<h2>Near ${esc(city)}</h2><div class="foot">${near.map((c) => link(c, ` · ${Math.max(1, Math.round(c.mi))} mi`)).join("")}</div>` : ""}${more.length ? `<h2>More places in ${esc(county)} County</h2><div class="foot">${more.map((c) => link(c)).join("")}</div>` : ""}<div class="foot"><a href="/in">All cities</a><a href="/add-event">Add an event</a><a href="/pricing">Feature your event</a><a href="/help">Help</a></div>`;
  const conf = evs.filter((e) => e.st === "c").length, first = evs[0].s, last = evs.reduce((m, e) => (e.e > m ? e.e : m), evs[0].e);
  const facts = `${conf ? `${conf} confirmed` : "None confirmed yet"}${evs.length - conf ? `, ${evs.length - conf} with expected dates` : ""}. Listings run from ${fmt(first)} to ${fmt(last)}.`;
  const indexable = isIndexable(me);
  const body = `${header("Open the map", "/#city-" + esc(params.city))}<main>${bc.html}<div class="tags"><span class="tag ice">${evs.length} upcoming event${evs.length === 1 ? "" : "s"}</span><span class="tag">${esc(county)} County</span></div><h1>Holiday lights and seasonal events in ${esc(city)}, CA</h1><p class="sub">${esc(desc)} ${esc(facts)}</p><div class="bar"><a class="btn go" href="/#city-${esc(params.city)}">See them all on the map</a></div><h2>What's coming up</h2><div class="list">${li}</div>${moreHtml}<div class="foot"><a href="/">All of Southern California</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  const html = page({ title, desc, canonical: `${origin}/in/${params.city}`, ld: [bc.ld, ...ld], body, origin, noindex: !indexable });
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
