// GET /e/<event id> — one plain page per event: its own title, preview card (Open Graph) for texts and social posts, and schema.org Event
// data when the dates are confirmed. The app itself stays on "/"; this page's button opens the event on the map ("/#e-<id>").
import { rowToEvent } from "../_lib/util.js";
import { esc, header, hero, page, crumbs } from "../_lib/shell.js";
import { slugOf } from "../_lib/cityindex.js";

const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
const http = (u) => { try { return /^https?:$/.test(new URL(u).protocol) ? u : ""; } catch { return ""; } };
const notFound = (origin) => new Response(page({ title: "Event not found | SoCal Lights", noindex: true, origin, body: `${header()}<main><div class="note"><h1>We can't find that event</h1><p class="sub">The link may be mistyped, or the event may have been removed.</p><p><a class="btn go" href="/">Open the map</a></p></div></main>` }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

export async function onRequestGet(context) {
  const { request, env, params } = context, origin = new URL(request.url).origin;
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const row = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(params.id).first();
  if (!row) return notFound(origin);
  const e = rowToEvent(row), today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const ended = e.e < today, confirmed = e.st === "c", when = e.s === e.e ? fmt(e.s) : `${fmt(e.s)} to ${fmt(e.e)}`;
  const where = [e.v, e.a, e.city].filter(Boolean).join(", ");
  const title = clip(`${e.n} in ${e.city}, CA`, 52) + " | SoCal Lights";
  const desc = clip(`${e.n}: ${when}${e.h ? ", " + e.h : ""}${where ? ". " + where : ""}${e.b ? ". " + e.b : ""}`, 200);
  const img = http(e.img), canonical = `${origin}/e/${encodeURIComponent(e.id)}`;
  // Structured data only for confirmed events that have not ended: expected dates are estimates, and markup would state them as firm
  const status = e.nt === "cancelled" ? "EventCancelled" : e.nt ? "EventPostponed" : "EventScheduled";
  const price = e.free ? 0 : (String(e.p).match(/\$\s*(\d+(?:\.\d+)?)/) || [])[1];
  const ld = confirmed && !ended ? {
    "@context": "https://schema.org", "@type": "Event", name: e.n, startDate: e.s, endDate: e.e, eventStatus: "https://schema.org/" + status,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", description: e.b || undefined, url: canonical, image: img ? [img] : undefined, isAccessibleForFree: !!e.free,
    offers: price !== undefined && http(e.u) ? { "@type": "Offer", price: String(price), priceCurrency: "USD", url: e.u } : undefined,
    location: { "@type": "Place", name: e.v || e.city, address: { "@type": "PostalAddress", streetAddress: e.a || undefined, addressLocality: e.city, addressRegion: "CA", addressCountry: "US" }, geo: e.lat && e.lng ? { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng } : undefined },
  } : null;
  const map = `/#e-${encodeURIComponent(e.id)}`, citySlug = slugOf(e.city);
  const bc = crumbs(origin, [{ name: "SoCal Lights", href: "/" }, { name: "Cities", href: "/in" }, { name: e.city, href: `/in/${citySlug}` }, { name: e.n }]);
  const fact = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : "");
  const body = `${header("Open on the map", map)}<main>${bc.html}${hero(img ? [{ img, cap: "" }] : [], e.n.slice(0, 1).toUpperCase())}<div class="tags">${e.nt ? `<span class="tag cancel">${e.nt === "cancelled" ? "Cancelled" : "Postponed"}</span>` : ""}${ended ? '<span class="tag">Ended</span>' : ""}<span class="tag ${e.free ? "free" : "paid"}">${esc(e.free ? "Free" : e.p || "Price not listed")}</span><span class="tag ${confirmed ? "conf" : "exp"}">${confirmed ? "Confirmed" : "Expected"}</span></div><h1>${esc(e.n)}</h1><p class="sub">${esc(e.city)}, ${esc(e.c)} County</p>${e.b ? `<p class="lead">${esc(e.b)}</p>` : ""}<dl class="facts">${fact("When", esc(when) + (confirmed ? "" : " (date estimated, check the event's site)"))}${fact("Hours", esc(e.h))}${fact("Where", esc(where))}${fact("More info", http(e.u) ? `<a href="${esc(e.u)}" target="_blank" rel="noopener">${esc(new URL(e.u).hostname.replace(/^www\./, ""))}</a>` : "")}</dl><div class="bar"><a class="btn go" href="${map}">Open on the map</a></div><div class="foot"><a href="/in/${esc(citySlug)}">More in ${esc(e.city)}</a><a href="/in">All cities</a><a href="/add-event">Add an event</a>${/view from the street/i.test(e.v || "") && !String(row.id).startsWith("c-") ? `<a href="/remove-home?ref=${encodeURIComponent(row.id)}&name=${encodeURIComponent(String(e.n).slice(0, 80))}">Not your listing? Remove my home</a>` : ""}<a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  const html = page({ title, desc, canonical, ld: ld ? [bc.ld, ld] : bc.ld, body, origin, image: img, noindex: ended || !confirmed, ogType: "article" });
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
