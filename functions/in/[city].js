// GET /in/<city> — a plain page of the upcoming holiday and seasonal events in one city, with schema.org Event data,
// so search engines can index "Christmas lights in Whittier". The app itself stays on "/".
import { rowToEvent } from "../_lib/util.js";
import { pairs, approvedPosts } from "../_lib/addrkey.js";
import { esc, header, page, crumbs, subscribeBox, shareBtn } from "../_lib/shell.js";
import { eventLd, secureUrl, clip } from "../_lib/eventld.js";
import { usablePhoto } from "../../public/photoguess.js";
import { SEASONS } from "../../public/seasons.js";
import { slugOf, summarize, nearby, isIndexable } from "../_lib/cityindex.js";
import { hasTrailingSlash, permanent } from "../_lib/redirect.js";

export { slugOf };
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export async function onRequestGet(context) {
  const { request, env, params } = context, origin = new URL(request.url).origin;
  { const want = slugOf(params.city); if (want && (want !== params.city || hasTrailingSlash(request))) return permanent(request, "/in/" + want); }
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const { results } = await env.DB.prepare("SELECT * FROM events WHERE end_date >= ? ORDER BY start_date, name").bind(today).all();
  let hide = new Set();
  try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const upcoming = results.filter((r) => !hide.has(r.id)).map(rowToEvent);
  const evs = upcoming.filter((e) => slugOf(e.city) === params.city);
  if (!evs.length) return new Response(page({ title: "No events found for that city | SoCal Lights", noindex: true, origin, body: `${header()}<main><div class="note"><h1>No upcoming events in that city yet</h1><p class="sub">The city may be spelled differently, or nothing is listed there right now. New events are added every day.</p><p><a class="btn go" href="/in">Browse cities with events</a> <a class="btn" href="/">Open the map</a></p></div></main>` }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  const city = evs[0].city, county = evs[0].c;
  // At most 60 characters (search results cut longer titles): the long wording first, shorter ones for long city names
  const title = [`Holiday lights and events in ${city}, CA | SoCal Lights`, `Lights and events in ${city}, CA | SoCal Lights`, `${city} lights and events | SoCal Lights`, `${city} | SoCal Lights`].find((t) => t.length <= 60) || `${city.slice(0, 40)} | SoCal Lights`;
  // Words for what is coming up here: the season most of the next events belong to (so a city whose list is Halloween in October does not say "Christmas lights")
  const soon = evs.slice(0, 12), tally = {}; for (const e of soon) tally[e.sn] = (tally[e.sn] || 0) + 1;
  const sk = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0], what = sk === "christmas" || !SEASONS[sk] ? "Christmas lights and holiday events" : `${SEASONS[sk].short} events`;
  const count = `${evs.length} upcoming event${evs.length === 1 ? "" : "s"}`;
  // The line under the title (visible) and the search-result description (meta) say different things: the first the general idea, the second names the three best events
  const sub = `${count} in ${city}, ${county} County: ${what}, with dates, places and directions.`;
  const top = [...evs].sort((a, b) => (a.st === "c" ? 0 : 1) - (b.st === "c" ? 0 : 1) || (a.s < b.s ? -1 : a.s > b.s ? 1 : 0)).slice(0, 3).map((e) => e.n);
  const desc = clip(`${count} in ${city}: ${top.join("; ")}${evs.length > top.length ? " and more" : ""}. ${what} with dates, places and directions.`, 155);
  // Structured data only for events whose dates are confirmed. "Expected" events stay in the visible list but get no markup,
  // because the markup would state a firm date and "scheduled" status that the page itself says is only an estimate.
  const ld = evs.filter((e) => e.st === "c").slice(0, 60).map((e) => eventLd(e, `${origin}/e/${encodeURIComponent(e.id)}`));
  const bc = crumbs(origin, [{ name: "SoCal Lights", href: "/" }, { name: "Cities", href: "/in" }, { name: city }]);
  // The city's events as a list (names and links only; the Event markup above carries the details of the confirmed ones)
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", name: `Holiday lights and events in ${city}, CA`, numberOfItems: evs.length, itemListElement: evs.slice(0, 50).map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.n, url: `${origin}/e/${encodeURIComponent(e.id)}` })) };
  const thumb = (u) => { if (!u) return ""; const full = esc(secureUrl(u) || u); const small = /^https?:\/\//.test(u) ? `/cdn-cgi/image/width=240,fit=cover/${esc(u)}` : full; return `<img src="${small}" alt="" loading="lazy" width="120" height="120" onerror="this.onerror=null;this.src='${full}'">`; };
  const li = evs.map((e) => `<article class="ev card-ev"><div class="ph">${thumb(usablePhoto(e))}</div><div><h3><a href="/e/${encodeURIComponent(e.id)}">${esc(e.n)}</a></h3><p>${esc(e.s === e.e ? fmt(e.s) : fmt(e.s) + " to " + fmt(e.e))}${e.h ? " · " + esc(e.h) : ""}</p><p>${esc([e.v, e.a].filter(Boolean).join(", "))}</p><div class="tags">${e.nt ? `<span class="tag cancel">${e.nt === "cancelled" ? "Cancelled" : "Postponed"}</span>` : ""}<span class="tag ${e.free ? "free" : "paid"}">${esc(e.free ? "Free" : e.p || "Price not listed")}</span><span class="tag ${e.st === "c" ? "conf" : "exp"}">${e.st === "c" ? "Confirmed" : "Expected"}</span></div><div class="evact"><a href="/#e-${encodeURIComponent(e.id)}" aria-label="Open ${esc(e.n)} on the map">Open on the map</a></div></div></article>`).join("");
  // Nearest cities that have a page worth visiting, then the rest of the county, then the ways to add or promote an event
  const cities = summarize(upcoming), me = cities.find((c) => c.slug === params.city), near = nearby(cities, params.city, 6), shown = new Set(near.map((c) => c.slug));
  const more = cities.filter((c) => c.county === county && c.slug !== params.city && !shown.has(c.slug) && c.indexable).sort((a, b) => b.n - a.n || a.city.localeCompare(b.city)).slice(0, 12);
  const link = (c, extra = "") => `<a href="/in/${esc(c.slug)}">${esc(c.city)} (${c.n})${extra}</a>`;
  const moreHtml = `${near.length ? `<h2>Near ${esc(city)}</h2><div class="foot">${near.map((c) => link(c, ` · ${Math.max(1, Math.round(c.mi))} mi`)).join("")}</div>` : ""}${more.length ? `<h2>More places in ${esc(county)} County</h2><div class="foot">${more.map((c) => link(c)).join("")}</div>` : ""}<div class="foot"><a href="/in">All cities</a><a href="/add-event">Add an event</a><a href="/pricing">Feature your event</a><a href="/help">Help</a></div>`;
  const conf = evs.filter((e) => e.st === "c").length, first = evs[0].s, last = evs.reduce((m, e) => (e.e > m ? e.e : m), evs[0].e);
  const facts = `${conf ? `${conf} confirmed` : "None confirmed yet"}${evs.length - conf ? `, ${evs.length - conf} with expected dates` : ""}. Listings run from ${fmt(first)} to ${fmt(last)}.`;
  const indexable = isIndexable(me);
  const body = `${header("Open the map", "/#city-" + esc(params.city))}<main>${bc.html}<div class="tags"><span class="tag ice">${evs.length} upcoming event${evs.length === 1 ? "" : "s"}</span><span class="tag">${esc(county)} County</span></div><h1>Holiday lights and seasonal events in ${esc(city)}, CA</h1><p class="sub">${esc(sub)} ${esc(facts)}</p><div class="bar"><a class="btn go" href="/#city-${esc(params.city)}">See them all on the map</a>${shareBtn(`${origin}/in/${params.city}`, "Share this page")}</div>${subscribeBox({ city, src: "city", siteKey: env.TURNSTILE_SITE_KEY || "" })}<h2>What's coming up</h2><div class="list">${li}</div>${moreHtml}<div class="foot"><a href="/">All of Southern California</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  const html = page({ title, desc, canonical: `${origin}/in/${params.city}`, ld: [bc.ld, itemList, ...ld], body, origin, noindex: !indexable, wide: true });
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
