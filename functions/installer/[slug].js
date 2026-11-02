// GET /installer/<slug> — a company's profile, styled like the app's details card: a swipeable photo header, tags, facts,
// a sticky "Call for a quote" bar, and every home on the map they installed. Plain, indexable HTML (like /in/<city>).
import { esc, header, hero, page, SHARE } from "../_lib/shell.js";
import { fmtPhone, telHref } from "../../public/norm.js";

export async function onRequestGet({ request, env, params }) {
  const origin = new URL(request.url).origin;
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE slug = ? AND status = 'active'").bind(String(params.slug || "")).first();
  if (!inst) return new Response(page({ title: "Installer not found | SoCal Lights", noindex: true, origin, body: `${header()}<main><div class="note"><h1>We can't find that installer</h1><p class="sub">The link may be mistyped, or the profile may have been removed.</p><p><a class="btn go" href="/">Back to the map</a></p></div></main>` }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  const { results: homes } = await env.DB.prepare("SELECT id, title, biz, city, photos, installer_confirmed, poster_type FROM posts WHERE installer_id = ? AND status = 'approved' ORDER BY approved_at DESC LIMIT 100").bind(inst.id).all();
  const web = /^https?:\/\//i.test(inst.web) ? inst.web : "";
  const telUrl = telHref(inst.phone), phoneShown = fmtPhone(inst.phone);
  const photoOf = (h) => JSON.parse(h.photos || "[]")[0];
  const slides = homes.filter(photoOf).slice(0, 8).map((h) => ({ href: `/#h-${h.id}`, img: `/api/photo/${photoOf(h)}`, cap: `${h.title} · ${h.city}` }));
  const title = `${inst.name}: professional holiday lighting installer | SoCal Lights`;
  const desc = `${inst.name}${inst.area ? ", serving " + inst.area : ""}. ${homes.length} display${homes.length === 1 ? "" : "s"} on the SoCal Lights map.`;
  const ld = { "@context": "https://schema.org", "@type": "LocalBusiness", name: inst.name, url: web || undefined, telephone: inst.phone || undefined, areaServed: inst.area || undefined, description: inst.blurb || undefined };
  const confirmed = homes.filter((h) => h.poster_type === "installer" || h.installer_confirmed).length;
  const cards = homes.map((h) => { const ph = photoOf(h); return `<a class="card" href="/#h-${esc(h.id)}"><div class="ph">${ph ? `<img src="/api/photo/${esc(ph)}" alt="" loading="lazy">` : ""}</div><div class="bd"><h3>${esc(h.title)}</h3><span class="m">${esc(h.city)}</span>${h.poster_type === "installer" || h.installer_confirmed ? '<div class="tags"><span class="tag conf">Confirmed by installer</span></div>' : ""}</div></a>`; }).join("");
  const canQuote = !!(inst.owner_email || inst.email), logoUrl = inst.logo ? `/api/installers/${inst.slug}/logo` : "";
  const heroHtml = slides.length ? hero(slides) : logoUrl ? `<div class="hero"><img class="logoimg" src="${esc(logoUrl)}" alt="${esc(inst.name)} logo"></div>` : hero([], inst.name.slice(0, 1).toUpperCase());
  const body = `${header("Open the map")}<main>
    ${heroHtml}
    <div class="tags"><span class="tag">Professional installer</span><span class="tag ice">${homes.length} display${homes.length === 1 ? "" : "s"} on the map</span>${confirmed ? `<span class="tag conf">${confirmed} confirmed</span>` : ""}</div>
    <div class="idrow">${logoUrl && slides.length ? `<img class="lg" src="${esc(logoUrl)}" alt="">` : ""}<div><h1>${esc(inst.name)}</h1>${inst.area ? `<p class="sub">Serving ${esc(inst.area)}</p>` : ""}</div></div>
    ${inst.blurb ? `<p class="lead">${esc(inst.blurb)}</p>` : ""}
    <dl class="facts">${inst.area ? `<dt>Service area</dt><dd>${esc(inst.area)}</dd>` : ""}${inst.phone ? `<dt>Call for Quotes</dt><dd>${telUrl ? `<a href="${esc(telUrl)}">${esc(phoneShown)}</a>` : esc(phoneShown)}</dd>` : ""}${web ? `<dt>Web</dt><dd><a href="${esc(web)}" target="_blank" rel="noopener nofollow">${esc(web.replace(/^https?:\/\//, "").replace(/\/$/, ""))} ↗</a></dd>` : ""}</dl>
    <div class="bar">${telUrl ? `<a class="btn go" href="${esc(telUrl)}">Call for a quote</a>` : web ? `<a class="btn go" href="${esc(web)}" target="_blank" rel="noopener nofollow">Visit website</a>` : `<span class="btn go" aria-disabled="true">No contact details yet</span>`}${telUrl && web ? `<a class="btn" href="${esc(web)}" target="_blank" rel="noopener nofollow">Website</a>` : ""}${canQuote ? `<button class="btn" type="button" id="quotebtn">Request a quote</button>` : ""}<button class="btn ic" type="button" data-share aria-label="Share this page">${SHARE}</button></div>
    <h2>Displays on the map</h2>${homes.length ? `<div class="grid">${cards}</div>` : `<div class="note"><p class="sub" style="margin:0">No displays are on the map yet.</p></div>`}
    <div class="foot"><a href="/">All of Southern California</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a>${inst.owner_email ? "" : `<button class="linkbtn" type="button" id="claimbtn">Is this your company? Claim this profile</button>`}</div></main>
    <script type="module" src="/norm-ui.js?v=20261102b"></script>
    <script type="module">
    const slug = ${JSON.stringify(inst.slug)}, name = ${JSON.stringify(inst.name)}, $ = (q) => document.querySelector(q);
    try { fetch("/api/installers/" + slug + "/hit", { method: "POST", keepalive: true }); } catch {}
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    async function ready() { const a = await import("/auth.js?v=20261101a"); let i = await a.me(); if (!i.user) { const u = await a.signIn({ title: "Sign in to continue", next: location.pathname }); if (!u) return null; } return a; }
    function dialog(html) { const o = document.createElement("div"); o.className = "scrim"; o.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' + html + '</div>'; o.onclick = (e) => { if (e.target === o || e.target.closest("[data-close]")) o.remove(); }; document.body.appendChild(o); return o; }
    const q = $("#quotebtn"); if (q) q.onclick = async () => {
      if (!(await ready())) return;
      const o = dialog('<h2>Request a quote</h2><p style="color:var(--muted);margin:0">From ' + esc(name) + '. They will email or call you.</p><form id="qf"><label>Your name<input id="qn" maxlength="80" autocomplete="name"></label><label>Phone (optional)<input id="qp" maxlength="30" inputmode="tel" autocomplete="tel"></label><label>What would you like done? (optional)<textarea id="qt" rows="3" maxlength="400"></textarea></label><label class="chk"><input id="qc" type="checkbox"><span>I agree to share my name, email and phone with ' + esc(name) + ' so they can contact me.</span></label><p class="err" id="qe" hidden></p><div class="row"><button class="btn go" type="submit">Send request</button><button class="btn" type="button" id="qx">Cancel</button></div></form>');
      o.querySelector("#qx").onclick = () => o.remove();
      o.querySelector("#qf").onsubmit = async (e) => { e.preventDefault(); const er = o.querySelector("#qe"); er.hidden = true;
        const r = await fetch("/api/installers/" + slug + "/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: o.querySelector("#qn").value, phone: o.querySelector("#qp").value, note: o.querySelector("#qt").value, consent: o.querySelector("#qc").checked }) }), j = await r.json().catch(() => ({}));
        if (!r.ok) { er.textContent = j.error || "That didn't send."; er.hidden = false; return; } o.querySelector(".dlg").innerHTML = '<h2>Sent</h2><p>' + esc(name) + ' will be in touch.</p><div class="row"><button class="btn go" type="button" id="qd">Done</button></div>'; o.querySelector("#qd").onclick = () => o.remove(); };
    };
    const c = $("#claimbtn"); if (c) c.onclick = async () => {
      if (!(await ready())) return;
      const r = await fetch("/api/installers/" + slug + "/claim", { method: "POST" }), j = await r.json().catch(() => ({}));
      if (!r.ok) { dialog('<h2>Claim this profile</h2><p>' + esc(j.error || "That didn't work.") + '</p><div class="row"><button class="btn go" type="button" data-close>OK</button></div>'); return; }
      if (j.claimed) location.href = "/installer/" + slug + "/manage"; else dialog('<h2>Thanks</h2><p>' + esc(j.message) + '</p><div class="row"><button class="btn go" type="button" data-close>OK</button></div>');
    };
    </script>`;
  return new Response(page({ title, desc, canonical: `${origin}/installer/${inst.slug}`, ld, body, origin }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}
