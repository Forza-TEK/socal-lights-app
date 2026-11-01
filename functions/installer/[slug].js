// GET /installer/<slug> — a company's profile, styled like the app's details card: a swipeable photo header, tags, facts,
// a sticky "Call for a quote" bar, and every home on the map they installed. Plain, indexable HTML (like /in/<city>).
import { esc, header, hero, page, SHARE } from "../_lib/shell.js";

export async function onRequestGet({ request, env, params }) {
  const origin = new URL(request.url).origin;
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE slug = ? AND status = 'active'").bind(String(params.slug || "")).first();
  if (!inst) return new Response(page({ title: "Installer not found | SoCal Lights", noindex: true, origin, body: `${header()}<main><div class="note"><h1>We can't find that installer</h1><p class="sub">The link may be mistyped, or the profile may have been removed.</p><p><a class="btn go" href="/">Back to the map</a></p></div></main>` }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  const { results: homes } = await env.DB.prepare("SELECT id, title, biz, city, photos, installer_confirmed, poster_type FROM posts WHERE installer_id = ? AND status = 'approved' ORDER BY approved_at DESC LIMIT 100").bind(inst.id).all();
  const web = /^https?:\/\//i.test(inst.web) ? inst.web : "";
  const tel = inst.phone ? inst.phone.replace(/[^0-9+]/g, "") : "";
  const photoOf = (h) => JSON.parse(h.photos || "[]")[0];
  const slides = homes.filter(photoOf).slice(0, 8).map((h) => ({ href: `/#h-${h.id}`, img: `/api/photo/${photoOf(h)}`, cap: `${h.title} · ${h.city}` }));
  const title = `${inst.name}: professional holiday lighting installer | SoCal Lights`;
  const desc = `${inst.name}${inst.area ? ", serving " + inst.area : ""}. ${homes.length} display${homes.length === 1 ? "" : "s"} on the SoCal Lights map.`;
  const ld = { "@context": "https://schema.org", "@type": "LocalBusiness", name: inst.name, url: web || undefined, telephone: inst.phone || undefined, areaServed: inst.area || undefined, description: inst.blurb || undefined };
  const confirmed = homes.filter((h) => h.poster_type === "installer" || h.installer_confirmed).length;
  const cards = homes.map((h) => { const ph = photoOf(h); return `<a class="card" href="/#h-${esc(h.id)}"><div class="ph">${ph ? `<img src="/api/photo/${esc(ph)}" alt="" loading="lazy">` : ""}</div><div class="bd"><h3>${esc(h.title)}</h3><span class="m">${esc(h.city)}</span>${h.poster_type === "installer" || h.installer_confirmed ? '<div class="tags"><span class="tag conf">Confirmed by installer</span></div>' : ""}</div></a>`; }).join("");
  const body = `${header("Open the map")}<main>
    ${hero(slides, inst.name.slice(0, 1).toUpperCase())}
    <div class="tags"><span class="tag">Professional installer</span><span class="tag ice">${homes.length} display${homes.length === 1 ? "" : "s"} on the map</span>${confirmed ? `<span class="tag conf">${confirmed} confirmed</span>` : ""}</div>
    <h1>${esc(inst.name)}</h1>${inst.area ? `<p class="sub">Serving ${esc(inst.area)}</p>` : ""}
    ${inst.blurb ? `<p class="lead">${esc(inst.blurb)}</p>` : ""}
    <dl class="facts">${inst.area ? `<dt>Service area</dt><dd>${esc(inst.area)}</dd>` : ""}${inst.phone ? `<dt>Quotes</dt><dd><a href="tel:${esc(tel)}">${esc(inst.phone)}</a></dd>` : ""}${web ? `<dt>Web</dt><dd><a href="${esc(web)}" target="_blank" rel="noopener nofollow">${esc(web.replace(/^https?:\/\//, "").replace(/\/$/, ""))} ↗</a></dd>` : ""}</dl>
    <div class="bar">${tel ? `<a class="btn go" href="tel:${esc(tel)}">Call for a quote</a>` : web ? `<a class="btn go" href="${esc(web)}" target="_blank" rel="noopener nofollow">Visit website</a>` : `<span class="btn go" aria-disabled="true">No contact details yet</span>`}${tel && web ? `<a class="btn" href="${esc(web)}" target="_blank" rel="noopener nofollow">Website</a>` : ""}<button class="btn ic" type="button" data-share aria-label="Share this page">${SHARE}</button></div>
    <h2>Displays on the map</h2>${homes.length ? `<div class="grid">${cards}</div>` : `<div class="note"><p class="sub" style="margin:0">No displays are on the map yet.</p></div>`}
    <div class="foot"><a href="/">All of Southern California</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  return new Response(page({ title, desc, canonical: `${origin}/installer/${inst.slug}`, ld, body, origin }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}
