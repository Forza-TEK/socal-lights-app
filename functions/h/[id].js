// GET /h/<post id> — one page per approved "Showcase a House" home (and approved contest entry): its own title, a preview card (Open Graph) for texts and
// social posts, the photos and video, and the same facts the public map card shows, a share button and nearby lights. The app itself stays on "/": the
// "Open on the map" button opens the home there ("/#h-<id>", which keeps working as before).
// PRIVACY: this page shows only what GET /api/posts (functions/api/posts.js, rowToPost) already shows on the map for a home. It never reads or prints photos_hidden,
// contact_email, user_id, tokens, review notes, consent fields, or exact coordinates (a home with no street address is pinned loosely on the map, so no coordinates are printed here).
// Only status = 'approved' rows render; pending, declined, paused and unknown ids (a removed home's row is deleted) answer the same 404 page the events use.
import { parseVideo } from "../../public/video.js";
import { fmtPhone, telHref } from "../../public/norm.js";
import { rowToPost } from "../_lib/util.js";
import { esc, header, hero, page, crumbs, shareBtn } from "../_lib/shell.js";
import { hasTrailingSlash, permanent } from "../_lib/redirect.js";
import { slugOf } from "../_lib/cityindex.js";
import { upcomingEvents, relatedTo } from "../_lib/upcoming.js";
import { usablePhoto } from "../../public/photoguess.js";
import { http, secureUrl, shareImage, whenText } from "../_lib/eventld.js";
import { winnerBadges, parsePrefs, shown, emailKey } from "../_lib/badges.js";
import { winsFor } from "../_lib/wins.js";
import { pairs } from "../_lib/addrkey.js";
import { logOp } from "../_lib/oplog.js";
import { publicPhotoKeys, photoPath, homeIndexable, sweepHidden } from "../_lib/homepage.js";

const notFound = (origin) => new Response(page({ title: "Home not found | SoCal Lights", noindex: true, origin, body: `${header()}<main><div class="note"><h1>We can't find that home</h1><p class="sub">The link may be mistyped, or the home may have been removed.</p><p><a class="btn go" href="/">Open the map</a></p></div></main>` }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

const ICO = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const DIR = ICO('<path d="M3 11l18-8-8 18-2-8z"/>');
const CROWN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FBBF24" stroke="#A16207" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px;flex:none"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14" fill="none"/></svg>`;
const VISIT = { drive: "Drive by", walk: "Walk by", both: "Drive or walk" }, PARK = { free: "Free parking nearby", street: "Street parking", none: "Hard to park" };

// The winner lines the owner chose to show on the details page (same sources and same choices as /api/posts: contest wins, and wins carried over from a sweep record)
async function detailBadges(env, row) {
  let out = [];
  try {
    const byUser = await winnerBadges(env);
    if (byUser.size) {
      const key = emailKey(row.contact_email);
      const us = (await env.DB.prepare("SELECT id, email, badges FROM users WHERE id = ?1 OR (?2 != '' AND email = ?2)").bind(row.user_id || "", key).all()).results;
      const u = us.find((x) => x.id === row.user_id && byUser.has(x.id)) || us.find((x) => byUser.has(x.id));
      if (u) out = byUser.get(u.id).map((b) => shown(b, parsePrefs(u.badges))).filter((b) => b.d);
    }
  } catch (e) { await logOp(env, "home-page", "winner badges lookup failed: " + (e && e.message)); }
  if (!row.contest_id) { try { const w = (await winsFor(env, [row], pairs)).get(row.id); if (w) out = [...out, ...w]; } catch {} }
  return out.filter((b) => b.d);
}

const badgeLine = (b) => b.t
  ? `<div class="bline">${CROWN}<div><b>${esc(b.t)}</b>${http(b.u) ? `<span class="m"><a href="${esc(b.u)}" target="_blank" rel="noopener">Source</a></span>` : ""}</div></div>`
  : `<div class="bline">${CROWN}<div><b>${esc(b.a)} · ${esc(b.k)}</b><span class="m">${esc(b.s)} · ${esc(b.c)}</span></div></div>`;

const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

export async function onRequestGet(context) {
  const { request, env, params } = context, origin = new URL(request.url).origin;
  if (hasTrailingSlash(request)) return permanent(request, "/h/" + encodeURIComponent(params.id));
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const id = String(params.id || "");
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return notFound(origin);
  // Same list shape as the map (installer joined only while its profile is active); approved rows only
  const row = await env.DB.prepare("SELECT p.*, i.slug AS inst_slug, i.name AS inst_name FROM posts p LEFT JOIN installers i ON i.id = p.installer_id AND i.status = 'active' WHERE p.id = ? AND p.status = 'approved'").bind(id).first();
  if (!row || (await sweepHidden(env, [row])).has(row.id)) return notFound(origin);

  const p = rowToPost(row); // the public shape: no photos_hidden, no contact fields
  const keys = publicPhotoKeys(row.photos), photoUrls = keys.map(photoPath);
  const city = p.city || "", canonical = `${origin}/h/${encodeURIComponent(row.id)}`, map = `/#h-${encodeURIComponent(row.id)}`, citySlug = slugOf(city);
  const title = `${p.title} - holiday lights in ${city}`.replace(/ in $/, "") + " | SoCal Lights";
  const desc = cut(p.desc, 155) || `${p.title} is a holiday lights display in ${city}${p.county ? `, ${p.county} County` : ""}, shared on SoCal Lights.`;
  const share = photoUrls[0] ? shareImage({ img: origin + photoUrls[0] }, origin) : null;
  const badges = await detailBadges(env, row);

  // Cover: the video first when there is one (tap-to-play link, or the approved clip), then every public photo; the first photo doubles as the video's poster
  const poster = photoUrls[0] ? `/cdn-cgi/image/width=960,quality=75,format=auto/${origin}${photoUrls[0]}` : "";
  const vlink = p.vid ? parseVideo(p.vid) : null;
  const slides = [...(vlink ? [{ embed: vlink.embed, img: poster }] : p.vf ? [{ clip: p.vf, img: poster }] : []), ...photoUrls.map((u, i) => ({ img: `/cdn-cgi/image/width=960,quality=75,format=auto/${origin}${u}`, orig: u, cap: "" }))];

  const bc = crumbs(origin, [{ name: "SoCal Lights", href: "/" }, { name: "Cities", href: "/in" }, ...(city ? [{ name: city, href: `/in/${citySlug}` }] : []), { name: p.title }]);
  const fact = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : "");
  const web = http(p.web), tel = telHref(p.phone), isPro = p.kind === "installer";
  const instLink = p.inst ? `<a href="/installer/${esc(p.inst.slug)}">${esc(p.inst.name)}</a>` : "";
  const visit = VISIT[p.visit] ? VISIT[p.visit] + (PARK[p.parking] ? " · " + PARK[p.parking] : "") + (p.acc ? " · Stroller and wheelchair friendly" : "") : [PARK[p.parking], p.acc && "Stroller and wheelchair friendly"].filter(Boolean).join(" · ");
  const dest = p.address ? encodeURIComponent([p.address, city].filter(Boolean).join(", ")) : "";

  // More lights near you: other approved showcase homes in the same city (contest entries are not listed here) and upcoming events there
  let related = "";
  try {
    const { results } = await env.DB.prepare("SELECT id, title, city, photos, street, address FROM posts WHERE status = 'approved' AND contest_id IS NULL AND city = ? AND id != ? ORDER BY approved_at DESC LIMIT 12").bind(row.city, row.id).all();
    const hid = await sweepHidden(env, results), homes = results.filter((r) => !hid.has(r.id)).slice(0, 4);
    let evs = [];
    try { const list = await upcomingEvents(env, origin, (pr) => { try { context.waitUntil(pr); } catch {} }); evs = relatedTo(list, { id: "", city }, slugOf, 3).sibs; } catch {}
    const homeCard = (r) => { const ph = publicPhotoKeys(r.photos)[0]; return `<a class="ev" href="/h/${encodeURIComponent(r.id)}"><div class="ph">${ph ? `<img src="/cdn-cgi/image/width=240,fit=cover/${esc(origin + photoPath(ph))}" alt="" loading="lazy" width="120" height="120" onerror="this.onerror=null;this.src='${esc(photoPath(ph))}'">` : `<span class="ph0" aria-hidden="true">${esc(String(r.title).slice(0, 1).toUpperCase())}</span>`}</div><div><h3>${esc(r.title)}</h3><p>${esc(r.city)}</p><div class="tags"><span class="tag ice">Home</span></div></div></a>`; };
    const evCard = (x) => `<a class="ev" href="/e/${encodeURIComponent(x.id)}"><div class="ph">${usablePhoto(x) ? `<img src="${/^https?:/.test(x.img) ? "/cdn-cgi/image/width=240,fit=cover/" : ""}${esc(x.img)}" alt="" loading="lazy" width="120" height="120" onerror="this.onerror=null;this.src='${esc(secureUrl(x.img).replace(/'/g, "%27"))}'">` : `<span class="ph0" aria-hidden="true">${esc(String(x.n).slice(0, 1).toUpperCase())}</span>`}</div><div><h3>${esc(x.n)}</h3><p>${esc(whenText(x))}</p><div class="tags"><span class="tag ${x.free ? "free" : "paid"}">${esc(x.free ? "Free" : x.p || "Price not listed")}</span><span class="tag ${x.st === "c" ? "conf" : "exp"}">${x.st === "c" ? "Confirmed" : "Expected"}</span></div></div></a>`;
    if (homes.length || evs.length) related = `<h2>More lights near you</h2><div class="list">${homes.map(homeCard).join("")}${evs.map(evCard).join("")}</div>${citySlug ? `<div class="foot"><a href="/in/${esc(citySlug)}">See everything in ${esc(city)}</a></div>` : ""}`;
  } catch {}

  const mailSubject = encodeURIComponent("Correction: " + p.title), mailBody = encodeURIComponent("About: " + p.title + "\nPage: " + canonical + "\n\nWhat is wrong:\n");
  const body = `${header("Open on the map", map)}<main>${bc.html}<div class="duo"><div class="duo-l">${hero(slides, String(p.title).slice(0, 1).toUpperCase())}</div><div class="duo-r"><div class="tags">${p.f ? '<span class="tag exp">Featured</span>' : ""}<span class="tag ice">Home</span>${isPro ? '<span class="tag">Professional installer</span>' : ""}${row.contest_id ? '<span class="tag">Contest entry</span>' : ""}</div><h1>${esc(p.title)}</h1><p class="sub">${isPro ? "" : "Posted by "}${isPro && p.inst ? instLink : `<b>${esc(p.biz)}</b>`}${city ? ` · ${esc(city)}${p.county ? ", " + esc(p.county) + " County" : ""}` : ""}</p>${!isPro && p.inst ? `<p class="sub">Installed by ${instLink}${p.inst.ok ? ' <span title="Confirmed by the installer" aria-label="Confirmed by the installer">&#10003;</span>' : ""}</p>` : ""}${badges.map(badgeLine).join("")}${p.desc ? `<p class="lead">${esc(p.desc)}</p>` : ""}<h2>Details</h2><dl class="facts">${fact("Address", esc(p.address))}${fact("Lights on", esc(p.lon))}${fact("Visit", esc(visit))}${fact("Tune in", esc(p.radio))}${fact("See it", esc(p.where))}${isPro ? fact("Service area", esc(p.area)) : ""}${fact("Call for quotes", tel ? `<a href="${esc(tel)}">${esc(fmtPhone(p.phone))}</a>` : esc(p.phone))}${fact("Web", web ? `<a href="${esc(web)}" target="_blank" rel="noopener nofollow">${esc(web.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : "")}</dl><div class="bar"><a class="btn go" href="${map}">Open on the map</a>${dest ? `<a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener">${DIR}<span>Directions</span></a>` : ""}${shareBtn(canonical, "Share this home")}</div></div></div>${related}<div class="foot"><a href="${citySlug ? "/in/" + esc(citySlug) : "/in"}">${city ? "More in " + esc(city) : "All cities"}</a><a href="/in">All cities</a><a href="/add-house">Add your home</a><a href="mailto:info@socallights.app?subject=${mailSubject}&amp;body=${mailBody}" rel="nofollow">Something wrong? Tell us</a><a href="/remove-home?ref=h-${encodeURIComponent(row.id)}&amp;name=${encodeURIComponent(String(p.title).slice(0, 80))}" rel="nofollow">Not your listing? Remove my home</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  const html = page({ title, desc, canonical, ld: bc.ld, body, origin, noindex: !homeIndexable(row), image: share ? share.url : "", imageW: share ? share.w : 0, imageH: share ? share.h : 0, ogType: "article", wide: true });
  // Short cache: an unpublished or removed home should stop showing within a couple of minutes (the map's own list is cached for 60 s)
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=120" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
