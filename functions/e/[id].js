// GET /e/<event id> — one page per event: its own title, preview card (Open Graph) for texts and social posts, schema.org Event data
// when the dates are confirmed, a plain-words summary built from the event's own fields, links to other events in the same city and nearby
// cities, a share button and a weekly-list sign-up. The app itself stays on "/"; the "Open on the map" button opens the event there ("/#e-<id>").
import { rowToEvent } from "../_lib/util.js";
import { esc, header, hero, page, crumbs, subscribeBox, shareBtn } from "../_lib/shell.js";
import { contestHomes } from "../_lib/contesthomes.js";
import { slugOf, nearby } from "../_lib/cityindex.js";
import { upcomingEvents, relatedTo } from "../_lib/upcoming.js";
import { eventLd, eventTitle, eventDesc, secureUrl, http, fmtDate, whenText, usefulHours, whereText, typeLabel } from "../_lib/eventld.js";

const notFound = (origin) => new Response(page({ title: "Event not found | SoCal Lights", noindex: true, origin, body: `${header()}<main><div class="note"><h1>We can't find that event</h1><p class="sub">The link may be mistyped, or the event may have been removed.</p><p><a class="btn go" href="/">Open the map</a></p></div></main>` }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

// A few plain sentences from the event's own fields (nothing invented): what, where, when, what it costs, how sure the dates are
export function summary(e, ended) {
  const t = typeLabel(e), hrs = usefulHours(e), s = [];
  s.push(`${e.n} takes place in ${e.city}, ${e.c} County${t ? ` (${t.toLowerCase()})` : ""}.`);
  if (e.nt) s.push(`Update: this event is ${e.nt === "cancelled" ? "cancelled" : "postponed"}.`);
  else if (ended) s.push(`It ran ${whenText(e)} and has ended.`);
  else if (e.st === "c") s.push(`${e.s === e.e ? "It is on" : "It runs"} ${whenText(e)}${hrs ? `, ${hrs}` : ""}.`);
  else s.push(`The dates (${whenText(e)}) are estimated from past years: check the event's site before you go.`);
  if (e.free) s.push("Admission is free.");
  else if (e.p && !/^check/i.test(e.p)) s.push(`Price: ${e.p}.`);
  else s.push("Check the event's site for ticket prices.");
  return s.join(" ");
}

export async function onRequestGet(context) {
  const { request, env, params } = context, origin = new URL(request.url).origin;
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const row = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(params.id).first();
  if (!row) return notFound(origin);
  const e = rowToEvent(row), today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const ended = e.e < today, confirmed = e.st === "c", when = whenText(e);
  const where = whereText(e), hrs = usefulHours(e), t = typeLabel(e);
  const title = eventTitle(e), desc = eventDesc(e);
  const img = secureUrl(e.img), canonical = `${origin}/e/${encodeURIComponent(e.id)}`;
  // Structured data only for confirmed events that have not ended: expected dates are estimates, and markup would state them as firm
  const ld = confirmed && !ended ? eventLd(e, canonical) : null;
  const map = `/#e-${encodeURIComponent(e.id)}`, citySlug = slugOf(e.city);
  const bc = crumbs(origin, [{ name: "SoCal Lights", href: "/" }, { name: "Cities", href: "/in" }, { name: e.city, href: `/in/${citySlug}` }, { name: e.n }]);
  const fact = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : "");
  const dest = encodeURIComponent([e.a || e.v, e.city].filter(Boolean).join(", ") || `${e.lat},${e.lng}`);
  const directions = where || (e.lat && e.lng) ? ` · <a href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener">Directions</a>` : "";
  const heroImg = img ? [{ img: `/cdn-cgi/image/width=960,quality=75,format=auto/${img}`, orig: img, cap: "" }] : [];

  // More in the same city and the nearest cities, from the shared upcoming list (one scan of the table for all event pages)
  let related = "";
  try {
    const list = await upcomingEvents(env, origin, (p) => { try { context.waitUntil(p); } catch {} });
    const { sibs, total, cities } = relatedTo(list, e, slugOf, 6), near = nearby(cities, citySlug, 6);
    const card = (x) => `<a class="ev" href="/e/${encodeURIComponent(x.id)}"><div class="ph">${x.img ? `<img src="${/^https?:/.test(x.img) ? "/cdn-cgi/image/width=240,fit=cover/" : ""}${esc(x.img)}" alt="" loading="lazy" width="120" height="120" onerror="this.onerror=null;this.src='${esc(secureUrl(x.img).replace(/'/g, "%27"))}'">` : ""}</div><div><h3>${esc(x.n)}</h3><p>${esc(whenText(x))}</p><div class="tags"><span class="tag ${x.free ? "free" : "paid"}">${esc(x.free ? "Free" : x.p || "Price not listed")}</span><span class="tag ${x.st === "c" ? "conf" : "exp"}">${x.st === "c" ? "Confirmed" : "Expected"}</span></div></div></a>`;
    related = `${sibs.length ? `<h2>More events in ${esc(e.city)}</h2><div class="list">${sibs.map(card).join("")}</div>${total > sibs.length ? `<div class="foot"><a href="/in/${esc(citySlug)}">See all ${total + 1} events in ${esc(e.city)}</a></div>` : ""}` : ""}${near.length ? `<h2>Near ${esc(e.city)}</h2><div class="foot">${near.map((c) => `<a href="/in/${esc(c.slug)}">${esc(c.city)} (${c.n})</a>`).join("")}</div>` : ""}`;
  } catch {}

  // A contest lists the homes entered in it (first 12 and a link to see all)
  let homes = "";
  try {
    const h = await contestHomes(env, row.id);
    if (h) {
      const gm = (x) => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(x.address || `${x.lat},${x.lng}`);
      const tile = (x) => `<div class="hm"><a class="hml" href="/c/${esc(h.slug)}">${x.photo ? `<img src="/api/photo/${esc(x.photo)}" alt="${esc(x.name)} lights" loading="lazy" width="320" height="240" onerror="this.onerror=null;this.src='/img/badge-160.webp';this.className='fb'">` : '<span class="hmn"><img src="/img/badge-160.webp" alt="" width="64" height="64" loading="lazy"></span>'}<b>${esc(x.name)}</b><span>${esc(x.address)}</span></a><span class="hmb"><a href="${esc(gm(x))}" target="_blank" rel="noopener" aria-label="Directions to ${esc(x.name)}">Directions</a><a href="/#h-${esc(x.id)}" aria-label="Show ${esc(x.name)} on the map">On map</a></span></div>`;
      homes = `<h2>Homes entered${h.total ? ` (${h.total})` : ""}</h2>${h.homes.length ? `<div class="hgrid">${h.homes.map(tile).join("")}</div><p class="foot">${h.total > h.homes.length ? `<a href="/c/${esc(h.slug)}">See all ${h.total} homes</a>` : ""}<a href="/c/${esc(h.slug)}#tour">Route all ${h.total} homes</a></p>` : `<p class="sub">No homes entered yet. <a href="/c/${esc(h.slug)}">Be the first to enter</a>.</p>`}`;
    }
  } catch {}
  const body = `${header("Open on the map", map)}<main>${bc.html}<div class="duo"><div class="duo-l">${hero(heroImg, e.n.slice(0, 1).toUpperCase())}</div><div class="duo-r"><div class="tags">${e.nt ? `<span class="tag cancel">${e.nt === "cancelled" ? "Cancelled" : "Postponed"}</span>` : ""}${ended ? '<span class="tag">Ended</span>' : ""}<span class="tag ${e.free ? "free" : "paid"}">${esc(e.free ? "Free" : e.p || "Price not listed")}</span><span class="tag ${confirmed ? "conf" : "exp"}">${confirmed ? "Confirmed" : "Expected"}</span></div><h1>${esc(e.n)}</h1><p class="sub">${esc(e.city)}, ${esc(e.c)} County</p><p class="lead">${esc(summary(e, ended))}</p>${e.b ? `<p class="lead">${esc(e.b)}</p>` : ""}<h2>Details</h2><dl class="facts">${fact("When", esc(when) + (confirmed ? "" : " (date estimated, check the event's site)"))}${fact("Hours", esc(hrs))}${fact("Where", esc(where) + directions)}${fact("Type", esc(t))}${fact("Price", esc(e.free ? "Free" : e.p))}${fact("More info", http(e.u) ? `<a href="${esc(e.u)}" target="_blank" rel="noopener">${esc(new URL(e.u).hostname.replace(/^www\./, ""))}</a>` : "")}${fact("Updated", e.lc ? esc(fmtDate(e.lc)) : "")}</dl><div class="bar"><a class="btn go" href="${map}">Open on the map</a>${shareBtn(canonical, "Share this event")}</div></div></div>${homes}${subscribeBox({ city: e.city, src: "event", siteKey: env.TURNSTILE_SITE_KEY || "" })}${related}<div class="foot"><a href="/in/${esc(citySlug)}">More in ${esc(e.city)}</a><a href="/in">All cities</a><a href="/add-event">Add an event</a>${/view from the street/i.test(e.v || "") && !String(row.id).startsWith("c-") ? `<a href="/remove-home?ref=${encodeURIComponent(row.id)}&name=${encodeURIComponent(String(e.n).slice(0, 80))}">Not your listing? Remove my home</a>` : ""}<a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  const html = page({ title, desc, canonical, ld: ld ? [bc.ld, ld] : bc.ld, body, origin, image: img, noindex: ended || !confirmed, ogType: "article", wide: true });
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
