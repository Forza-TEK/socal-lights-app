// SoCal Lights admin: review houses, manage published posts, edit events.
import { CITY } from "/cities.js";
import { SEASONS, defaultSeason } from "/seasons.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
let evSeason = defaultSeason(TODAY);
const photo = (k) => "/api/admin/photo/" + k.split("/").map(encodeURIComponent).join("/");
let tab = "pending", EVENTS = [];

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error("You're not signed in as the admin. Open this page through your Cloudflare Access login.");
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}

function setTab(t) { tab = t; ["pending", "approved", "events"].forEach((k) => $("#tab-" + k).setAttribute("aria-selected", k === t)); render(); }
["pending", "approved", "events"].forEach((k) => ($("#tab-" + k).onclick = () => setTab(k)));

async function render() {
  const main = $("#main");
  try {
    if (tab === "events") return renderEvents();
    const posts = await api("/api/admin/posts?status=" + tab);
    if (tab === "pending") $("#nPending").textContent = posts.length;
    if (!posts.length) { main.innerHTML = `<div class="empty">${tab === "pending" ? "Nothing waiting for review." : "No published houses yet."}</div>`; return; }
    main.innerHTML = `<div class="cards">${posts.map(postCard).join("")}</div>`;
  } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function postCard(p) {
  const web = p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(p.web)}</a>` : "—";
  return `<article class="acard" data-id="${esc(p.id)}">
    <div class="row" style="justify-content:space-between"><h3>${esc(p.title)}</h3><span class="meta">${esc((p.created || "").slice(0, 16))} UTC</span></div>
    ${p.photos.length ? `<div class="pics">${p.photos.map((k) => `<a href="${photo(k)}" target="_blank" rel="noopener"><img src="${photo(k)}" alt="" loading="lazy"></a>`).join("")}</div>` : `<div class="meta">No photos</div>`}
    <dl class="facts"><dt>Name / business</dt><dd>${esc(p.biz)}</dd><dt>City</dt><dd>${esc(p.city)} · ${esc(p.county || "")}</dd>
    <dt>Contact</dt><dd><span style="user-select:all">${esc(p.contact_email || "—")}</span></dd><dt>Website</dt><dd>${web}</dd>
    <dt>Public phone</dt><dd>${esc(p.phone || "—")}</dd><dt>Where</dt><dd>${esc(p.where || "—")}</dd><dt>About</dt><dd style="white-space:pre-line">${esc(p.desc)}</dd></dl>
    <div class="row">${tab === "pending" ? `<button class="btn ice" type="button" data-act="approve">Approve and publish</button><button class="btn ghost" type="button" data-act="decline">Decline</button>` : `<button class="btn ghost" type="button" data-act="delete">Remove from site</button>`}<span class="msg"></span></div>
  </article>`;
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const card = b.closest("[data-id]"), id = card.dataset.id, act = b.dataset.act, msg = card.querySelector(".msg");
  if ((act === "decline" || act === "delete") && b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = act === "decline" ? "Click again to decline" : "Click again to remove"; return; }
  b.disabled = true; msg.className = "msg"; msg.textContent = act === "approve" ? "Publishing…" : "Working…";
  try {
    if (act === "delete") await api("/api/admin/posts/" + id, { method: "DELETE" });
    else await api("/api/admin/posts/" + id, { method: "POST", body: JSON.stringify({ action: act }) });
    card.remove(); if (!document.querySelector(".acard")) render();
    if (tab === "pending") $("#nPending").textContent = document.querySelectorAll(".acard").length;
  } catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

/* ---------- events ---------- */
async function renderEvents() {
  EVENTS = await (await fetch("/api/events", { cache: "no-store" })).json();
  const list = EVENTS.filter((e) => (e.sn || "christmas") === evSeason);
  $("#main").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="row"><select id="evSeason" aria-label="Season" style="border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface)">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === evSeason ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select><span class="meta">${list.length} events</span></div><button class="btn" type="button" id="addEv">Add an event</button></div>
  <div class="tablewrap"><table><thead><tr><th>Event</th><th>City</th><th>Dates</th><th>Status</th><th></th></tr></thead><tbody>${list.map((e) => `<tr${e.e < TODAY ? ' style="opacity:.55"' : ""}><td><b>${esc(e.n)}</b><div class="meta">${esc(e.p)}${e.e < TODAY ? " · ended" : ""}</div></td><td>${esc(e.city)}<div class="meta">${esc(e.c)}</div></td><td class="dates">${esc(e.s)}<br>${esc(e.e)}</td><td><span class="tag ${e.st === "c" ? "conf" : "exp"}">${e.st === "c" ? "Confirmed" : "Expected"}</span></td><td><button class="btn ghost" type="button" data-edit="${esc(e.id)}">Edit</button></td></tr>`).join("")}</tbody></table></div>`;
  $("#evSeason").onchange = (x) => { evSeason = x.target.value; renderEvents(); };
  $("#addEv").onclick = () => editEvent(null);
  document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editEvent(EVENTS.find((x) => x.id === b.dataset.edit))));
}
function editEvent(ev) {
  const e = ev || { id: "", n: "", c: "Orange", city: "", t: Object.keys(SEASONS[evSeason].types)[0], s: TODAY, e: TODAY, st: "expected", free: true, p: "Free", h: "", lat: 33.68, lng: -117.83, b: "", u: "", sn: evSeason };
  const typeOpts = (sn, cur) => Object.entries(SEASONS[sn].types).map(([v, l]) => `<option value="${v}" ${v === cur ? "selected" : ""}>${l}</option>`).join("");
  const m = $("#modal");
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between"><h2>${ev ? "Edit event" : "Add an event"}</h2><button class="btn ghost" type="button" id="mClose">Close</button></div>
  <form class="f" id="evForm" novalidate>
    <label for="eN">Name<input id="eN" value="${esc(e.n)}" maxlength="120" required></label>
    <div class="two"><label for="eCity">City or area<input id="eCity" value="${esc(e.city)}" maxlength="60" required></label><label for="eC">County<select id="eC">${COUNTIES.map((c) => `<option ${c === e.c ? "selected" : ""}>${c}</option>`).join("")}</select></label></div>
    <label for="eSn">Season<select id="eSn">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === (e.sn || "christmas") ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></label>
    <div class="two"><label for="eT">Type<select id="eT">${typeOpts(e.sn || "christmas", e.t)}</select></label><label for="eSt">Dates are<select id="eSt"><option value="confirmed" ${e.st === "c" ? "selected" : ""}>Confirmed for this season</option><option value="expected" ${e.st !== "c" ? "selected" : ""}>Expected (based on last year)</option></select></label></div>
    <div class="two"><label for="eS">Starts<input id="eS" type="date" value="${esc(e.s)}"></label><label for="eE">Ends<input id="eE" type="date" value="${esc(e.e)}"></label></div>
    <div class="two"><label for="eP">Price shown<input id="eP" value="${esc(e.p)}" maxlength="80" placeholder="Free, From $19…"></label><label class="opt" style="display:flex;gap:8px;align-items:center;padding-top:20px"><input type="checkbox" id="eF" style="width:auto" ${e.free ? "checked" : ""}> Free event</label></div>
    <label for="eH">Hours<input id="eH" value="${esc(e.h)}" maxlength="200"></label>
    <label for="eB">Description<textarea id="eB" maxlength="600">${esc(e.b)}</textarea></label>
    <label for="eU">Event website<input id="eU" type="url" value="${esc(e.u)}" maxlength="300"></label>
    <div class="two"><label for="eV">Venue<input id="eV" value="${esc(e.v || "")}" maxlength="120" placeholder="Crown Valley Community Park"></label><label for="eA">Street address<input id="eA" value="${esc(e.a || "")}" maxlength="200" placeholder="29751 Crown Valley Pkwy, Laguna Niguel, CA 92677"></label></div>
    <div><div class="row" style="margin-bottom:6px"><button class="btn ghost" type="button" id="eGeo">Place pin from address</button><span class="meta" id="geoMsg">Or click the map / drag the pin. Directions use the street address.</span></div><div id="pick"></div><div class="meta dates" id="ll" style="margin-top:4px"></div></div>
    <div class="row"><button class="btn" type="submit">Save event</button>${ev ? `<button class="btn ghost" type="button" id="eDel">Delete event</button>` : ""}<span class="msg" id="eMsg"></span></div>
  </form></div>`;
  m.hidden = false;
  let lat = e.lat, lng = e.lng;
  const show = () => ($("#ll").textContent = lat.toFixed(5) + ", " + lng.toFixed(5));
  const pm = new maplibregl.Map({ container: "pick", style: "https://tiles.openfreemap.org/styles/liberty", center: [lng, lat], zoom: ev ? 13 : 8 });
  const marker = new maplibregl.Marker({ color: "#c9361f", draggable: true }).setLngLat([lng, lat]).addTo(pm);
  pm.on("click", (x) => { lat = x.lngLat.lat; lng = x.lngLat.lng; marker.setLngLat(x.lngLat); show(); });
  marker.on("dragend", () => { const p = marker.getLngLat(); lat = p.lat; lng = p.lng; show(); });
  show();
  $("#eSn").onchange = (x) => { $("#eT").innerHTML = typeOpts(x.target.value, ""); };
  $("#eGeo").onclick = async () => {
    const gm = $("#geoMsg"), q = $("#eA").value.trim() || ($("#eV").value.trim() + ", " + $("#eCity").value.trim() + ", CA");
    gm.textContent = "Looking up…";
    try {
      const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&viewbox=-121.5,35.8,-114,32&bounded=1&q=" + encodeURIComponent(q.replace(/&/g, " and ")));
      const j = await r.json();
      if (!j.length) { gm.textContent = "Address not found. Click the map to place the pin."; return; }
      lat = +j[0].lat; lng = +j[0].lon; marker.setLngLat([lng, lat]); pm.easeTo({ center: [lng, lat], zoom: 16 }); show();
      gm.textContent = "Found: " + j[0].display_name.split(",").slice(0, 3).join(",") + ". Drag the pin if it needs a nudge.";
    } catch { gm.textContent = "Lookup failed. Click the map to place the pin."; }
  };
  const close = () => { pm.remove(); m.hidden = true; m.innerHTML = ""; };
  $("#mClose").onclick = close;
  if (ev) $("#eDel").onclick = async (x) => { const b = x.target; if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Click again to delete"; return; } await api("/api/admin/events/" + encodeURIComponent(ev.id), { method: "DELETE" }); close(); renderEvents(); };
  $("#evForm").onsubmit = async (x) => {
    x.preventDefault(); const msg = $("#eMsg");
    const id = ev ? ev.id : $("#eN").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 6);
    const body = { id, season: $("#eSn").value, name: $("#eN").value, county: $("#eC").value, city: $("#eCity").value, type: $("#eT").value, start: $("#eS").value, end: $("#eE").value, status: $("#eSt").value, free: $("#eF").checked, price: $("#eP").value, hours: $("#eH").value, lat, lng, blurb: $("#eB").value, url: $("#eU").value, venue: $("#eV").value, address: $("#eA").value };
    try { await api("/api/admin/events", { method: "POST", body: JSON.stringify(body) }); close(); renderEvents(); }
    catch (err) { msg.className = "msg err"; msg.textContent = err.message; }
  };
}

(async () => {
  try { const me = await api("/api/admin/me"); $("#who").textContent = "Signed in as " + me.email; render(); }
  catch (e) { $("#who").textContent = ""; $("#main").innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
})();
