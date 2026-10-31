// SoCal Lights admin: review houses, manage published posts, edit events.
import { CITY } from "/cities.js";
import { SEASONS, defaultSeason } from "/seasons.js";
import { attachAddress } from "/addflow.js?v=20261031t";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
let evSeason = defaultSeason(TODAY);
const photo = (k) => "/api/admin/photo/" + k.split("/").map(encodeURIComponent).join("/");
let tab = "pending", EVENTS = [], POSTS = [];
// Address suggestions on every address box in the edit windows (the house street and the event address)
attachAddress($("#modal"), { getCity: () => ($("#pCity") || $("#eCity") || {}).value || "", onPick: (s, inp) => {
  if (inp.id === "pStreet") { inp.value = s.street; if ($("#pCity") && [...$("#pCity").options].some((o) => o.value === s.city)) $("#pCity").value = s.city; if ($("#pZip") && /^\d{5}/.test(s.zip)) $("#pZip").value = s.zip.slice(0, 5); }
  else { inp.value = `${s.street}, ${s.city}, CA ${s.zip}`; if ($("#eCity")) $("#eCity").value = s.city; }
} });

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error("You're not signed in as the admin. Open this page through your Cloudflare Access login.");
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}

function setTab(t) { tab = t; ["pending", "approved", "subs", "contests", "events", "users"].forEach((k) => $("#tab-" + k).setAttribute("aria-selected", k === t)); render(); }
["pending", "approved", "subs", "contests", "events", "users"].forEach((k) => ($("#tab-" + k).onclick = () => setTab(k)));

async function render() {
  const main = $("#main");
  try {
    if (tab === "events") return renderEvents();
    if (tab === "subs") return renderSubs();
    if (tab === "contests") return renderContests();
    if (tab === "users") return renderUsers();
    const posts = await api("/api/admin/posts?status=" + tab);
    if (tab === "pending") $("#nPending").textContent = posts.length;
    if (!posts.length) { main.innerHTML = `<div class="empty">${tab === "pending" ? "Nothing waiting for review." : "No published houses yet."}</div>`; return; }
    POSTS = posts; main.innerHTML = `<div class="cards">${posts.map(postCard).join("")}</div>`;
  } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function postCard(p) {
  const web = p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(p.web)}</a>` : "—";
  return `<article class="acard" data-id="${esc(p.id)}">
    <div class="row" style="justify-content:space-between"><h3>${esc(p.title)}</h3><span class="meta">${esc((p.created || "").slice(0, 16))} UTC</span></div>
    ${p.photos.length ? `<div class="pics">${p.photos.map((k) => `<a href="${photo(k)}" target="_blank" rel="noopener"><img src="${photo(k)}" alt="" loading="lazy"></a>`).join("")}</div>` : `<div class="meta">No photos</div>`}
    <dl class="facts"><dt>Name / business</dt><dd>${esc(p.biz)}</dd><dt>City</dt><dd>${esc(p.city)} · ${esc(p.county || "")}</dd>
    <dt>Contact</dt><dd><span style="user-select:all">${esc(p.contact_email || "—")}</span></dd><dt>Website</dt><dd>${web}</dd>
    <dt>Posting as</dt><dd>${p.kind === "installer" ? "Professional installer" : "Homeowner"}</dd><dt>Public phone</dt><dd>${esc(p.phone || "—")}</dd><dt>Street address</dt><dd>${esc(p.address || "—")} <span class="meta">(${p.show_address ? "public" : "private"})</span></dd><dt>Where</dt><dd>${esc(p.where || "—")}</dd><dt>About</dt><dd style="white-space:pre-line">${esc(p.desc)}</dd></dl>
    <div class="row"><button class="btn ghost" type="button" data-editpost="${esc(p.id)}">Edit</button>${tab === "pending" ? `<button class="btn ice" type="button" data-act="approve">Approve and publish</button><button class="btn ghost" type="button" data-act="decline">Decline</button>` : `<button class="btn ghost" type="button" data-act="delete">Remove from site</button>`}<span class="msg"></span></div>
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

function editPost(p) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between"><h2>Edit house</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close">×</button></div>
  <form class="f" id="pForm" novalidate>
    <label for="pKind">Posting as<select id="pKind"><option value="homeowner" ${p.kind !== "installer" ? "selected" : ""}>Homeowner</option><option value="installer" ${p.kind === "installer" ? "selected" : ""}>Professional installer</option></select></label>
    <div class="two"><label for="pBiz">Name or business<input id="pBiz" value="${esc(p.biz)}" maxlength="80"></label><label for="pTitle">Display name<input id="pTitle" value="${esc(p.title)}" maxlength="90"></label></div>
    <label for="pStreet">Street address <span class="hint">saving moves the pin to this address</span><input id="pStreet" data-addr autocomplete="off" value="${esc(p.street || (p.address || "").split(",")[0])}" maxlength="120" placeholder="e.g. 123 Main St"></label>
    <div class="two"><label for="pCity">City<select id="pCity">${Object.keys(CITY).sort().map((c) => `<option ${c === p.city ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label><label for="pZip">ZIP<input id="pZip" value="${esc(p.zip || "")}" inputmode="numeric" maxlength="5" placeholder="92630"></label></div>
    <label for="pSeason">Season<select id="pSeason">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === (p.season || "christmas") ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></label>
    <div class="two"><label for="pWeb">Website<input id="pWeb" value="${esc(p.web || "")}" maxlength="200"></label><label for="pPhone">Phone<input id="pPhone" value="${esc(p.phone || "")}" maxlength="80"></label></div>
    <label for="pArea">Service area <span class="hint">installers</span><input id="pArea" value="${esc(p.area || "")}" maxlength="120"></label>
    <label for="pWhere">Where to see it<input id="pWhere" value="${esc(p.where || "")}" maxlength="120"></label>
    <label for="pDesc">About<textarea id="pDesc" maxlength="1200">${esc(p.desc)}</textarea></label>
    <div class="row"><button class="btn ice" type="submit">Save</button><span class="msg" id="pMsg" role="status"></span></div>
  </form></div>`;
  m.hidden = false; $("#mClose").onclick = close;
  $("#pForm").onsubmit = async (x) => {
    x.preventDefault(); const msg = $("#pMsg"); msg.className = "msg"; msg.textContent = "Saving…";
    const body = { action: "edit", biz: $("#pBiz").value, title: $("#pTitle").value, city: $("#pCity").value, season: $("#pSeason").value, kind: $("#pKind").value, street: $("#pStreet").value, zip: $("#pZip").value, area: $("#pArea").value, web: $("#pWeb").value, phone: $("#pPhone").value, where: $("#pWhere").value, desc: $("#pDesc").value };
    try { await api("/api/admin/posts/" + p.id, { method: "POST", body: JSON.stringify(body) }); close(); render(); }
    catch (err) { msg.className = "msg err"; msg.textContent = err.message; }
  };
}
$("#main").addEventListener("click", (e) => { const b = e.target.closest("[data-editpost]"); if (b) editPost(POSTS.find((x) => x.id === b.dataset.editpost)); });


/* ---------- submitted events (public "Add your event" form) ---------- */
let SUBS = [];
async function renderSubs() {
  const main = $("#main");
  SUBS = await api("/api/admin/submissions?status=pending");
  $("#nSubs").textContent = SUBS.length;
  if (!SUBS.length) { main.innerHTML = `<div class="empty">No submitted events waiting. Events whose web page checks out are published automatically.</div>`; return; }
  main.innerHTML = `<div class="cards">${SUBS.map((x) => `<article class="acard" data-sid="${esc(x.id)}">
    <div class="row" style="justify-content:space-between"><h3>${esc(x.name)}</h3><span class="meta">${esc((x.created_at || "").slice(0, 16))} UTC</span></div>
    <dl class="facts"><dt>When</dt><dd>${esc(x.start_date)}${x.end_date !== x.start_date ? " to " + esc(x.end_date) : ""} · ${esc(x.hours || "no hours")}</dd><dt>Where</dt><dd>${esc(x.venue)}<br><span class="meta">${esc(x.address)}, ${esc(x.city)} · ${esc(x.county || "")} (pin ${Number(x.lat).toFixed(4)}, ${Number(x.lng).toFixed(4)})</span></dd>
    <dt>Type</dt><dd>${esc(SEASONS[x.season] ? SEASONS[x.season].label : x.season)} · ${esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)} · ${esc(x.price || "")}</dd><dt>About</dt><dd>${esc(x.blurb)}</dd>
    <dt>Event page</dt><dd><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a></dd><dt>Contact</dt><dd><span style="user-select:all">${esc(x.contact_email)}</span></dd><dt>Why it's here</dt><dd>${esc(x.note || "")}</dd>${x.paid_plans ? `<dt>Paid Featured</dt><dd><b>${esc(x.paid_plans)}</b> <span class="meta">(turns on when you publish; if you decline, refund it in Stripe)</span></dd>` : ""}</dl>
    <div class="row"><button class="btn ice" type="button" data-sact="approve" data-st="confirmed">Publish (confirmed)</button><button class="btn ghost" type="button" data-sact="approve" data-st="expected">Publish (expected)</button><button class="btn ghost" type="button" data-sact="decline">Decline</button><span class="msg"></span></div></article>`).join("")}</div>`;
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-sact]"); if (!b) return;
  const card = b.closest("[data-sid]"), msg = card.querySelector(".msg");
  if (b.dataset.sact === "decline" && b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Click again to decline"; return; }
  b.disabled = true; msg.textContent = "Working…";
  try { await api("/api/admin/submissions/" + card.dataset.sid, { method: "POST", body: JSON.stringify({ action: b.dataset.sact, status: b.dataset.st }) }); card.remove(); $("#nSubs").textContent = document.querySelectorAll("[data-sid]").length; if (!document.querySelector("[data-sid]")) renderSubs(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

/* ---------- contests (organizers who need a review, e.g. a Gmail address or an email that doesn't match their website) ---------- */
async function renderContests() {
  const main = $("#main");
  const list = await api("/api/admin/contests?status=pending");
  $("#nContests").textContent = list.length;
  if (!list.length) { main.innerHTML = `<div class="empty">No contests waiting. A contest goes live by itself when the organizer's email matches their website.</div>`; return; }
  main.innerHTML = `<div class="cards">${list.map((c) => `<article class="acard" data-cid="${esc(c.id)}">
    <div class="row" style="justify-content:space-between"><h3>${esc(c.name)}</h3><span class="meta">${esc((c.created_at || "").slice(0, 16))} UTC</span></div>
    <dl class="facts"><dt>Run by</dt><dd>${esc(c.org)} · ${esc(c.city)}</dd><dt>Organizer email</dt><dd><span style="user-select:all">${esc(c.owner_email || c.contact_email)}</span></dd>
    <dt>Website</dt><dd>${c.site ? `<a href="${esc(c.site)}" target="_blank" rel="noopener">${esc(c.site)}</a>` : "none given"}</dd><dt>Why it's here</dt><dd>${esc(c.note || "")}</dd>
    <dt>Dates</dt><dd>Entries to ${esc(c.entries_close)} · voting ${esc(c.vote_start)} to ${esc(c.vote_end)}</dd><dt>Welcome message</dt><dd>${esc(c.descr)}</dd>
    <dt>Public page</dt><dd><a href="/c/${esc(c.slug)}" target="_blank" rel="noopener">/c/${esc(c.slug)}</a></dd></dl>
    <div class="row"><button class="btn ice" type="button" data-cact="approve">Approve (goes on the map)</button><button class="btn ghost" type="button" data-cact="decline">Decline</button><span class="msg" role="status"></span></div></article>`).join("")}</div>`;
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cact]"); if (!b) return;
  const card = b.closest("[data-cid]"), msg = card.querySelector(".msg");
  if (b.dataset.cact === "decline" && b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Click again to decline"; return; }
  b.disabled = true; msg.textContent = "Working…";
  try { await api("/api/admin/contests/" + card.dataset.cid, { method: "POST", body: JSON.stringify({ action: b.dataset.cact }) }); card.remove(); $("#nContests").textContent = document.querySelectorAll("[data-cid]").length; if (!document.querySelector("[data-cid]")) render(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
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
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between"><h2>${ev ? "Edit event" : "Add an event"}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close">×</button></div>
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
    <div class="two"><label for="eV">Venue<input id="eV" value="${esc(e.v || "")}" maxlength="120" placeholder="Crown Valley Community Park"></label><label for="eA">Street address<input id="eA" data-addr autocomplete="off" value="${esc(e.a || "")}" maxlength="200" placeholder="29751 Crown Valley Pkwy, Laguna Niguel, CA 92677"></label></div>
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
  try { const me = await api("/api/admin/me"); $("#who").textContent = "Signed in as " + me.email; render(); api("/api/admin/submissions?status=pending").then((l) => ($("#nSubs").textContent = l.length)).catch(() => {}); }
  catch (e) { $("#who").textContent = ""; $("#main").innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
})();


/* ---------- users (everyone who made a profile) ---------- */
let USERS = { q: "", status: "", offset: 0 };
const when = (s) => (s ? esc(String(s).slice(0, 16).replace("T", " ")) + " UTC" : "never");
const ago = (s) => { if (!s) return "never"; const d = Math.floor((Date.now() - new Date(String(s).replace(" ", "T") + "Z")) / 86400000); return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago"; };
async function renderUsers() {
  const main = $("#main");
  const qs = new URLSearchParams({ q: USERS.q, status: USERS.status, offset: USERS.offset });
  const d = await api("/api/admin/users?" + qs);
  $("#nUsers").textContent = d.all;
  const sel = (v, l) => `<option value="${v}" ${USERS.status === v ? "selected" : ""}>${l}</option>`;
  main.innerHTML = `<div class="row" style="gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <input id="uq" type="search" placeholder="Search name or email" value="${esc(USERS.q)}" style="flex:1;min-width:200px;padding:10px 12px;border:1px solid var(--line2);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit">
    <select id="ust" style="padding:10px 12px;border:1px solid var(--line2);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit">${sel("", "All people (" + d.all + ")")}${sel("active", "Active")}${sel("suspended", "Suspended (" + d.suspended + ")")}</select>
    <a class="btn ghost" href="/api/admin/users?format=csv&q=${encodeURIComponent(USERS.q)}&status=${USERS.status}" download>Download CSV</a></div>
    ${d.users.length ? `<div class="tablewrap"><table><thead><tr><th>Person</th><th>Joined</th><th>Last sign-in</th><th>Homes &amp; events</th><th>Contests</th><th>Votes</th><th></th></tr></thead><tbody>${d.users.map((u) => `<tr data-uid="${esc(u.id)}" style="cursor:pointer">
      <td><b>${esc(u.name || "(no name)")}</b>${u.status === "suspended" ? ' <span class="tag" style="border-color:#c0392b;color:#c0392b">Suspended</span>' : ""}<br><span class="meta">${esc(u.email)}${u.google ? " · Google" : ""}</span></td>
      <td>${esc((u.created_at || "").slice(0, 10))}</td><td>${ago(u.last_login)}</td><td>${u.homes + u.entries}${u.entries ? ` <span class="meta">(${u.entries} contest)</span>` : ""}</td><td>${u.contests}</td><td>${u.votes}</td><td><button class="btn ghost" type="button" data-open="${esc(u.id)}">Manage</button></td></tr>`).join("")}</tbody></table></div>
    <div class="row" style="justify-content:space-between;margin-top:12px"><span class="meta">${d.offset + 1}–${d.offset + d.users.length} of ${d.total}</span><span class="row" style="gap:8px"><button class="btn ghost" type="button" id="uPrev" ${d.offset ? "" : "disabled"}>Previous</button><button class="btn ghost" type="button" id="uNext" ${d.offset + d.page < d.total ? "" : "disabled"}>Next</button></span></div>`
    : `<div class="empty">${USERS.q || USERS.status ? "Nobody matches that." : "Nobody has made a profile yet."}</div>`}`;
  let t; $("#uq").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { USERS.q = e.target.value.trim(); USERS.offset = 0; renderUsers().then(() => { const i = $("#uq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 300); };
  $("#ust").onchange = (e) => { USERS.status = e.target.value; USERS.offset = 0; renderUsers(); };
  if ($("#uPrev")) $("#uPrev").onclick = () => { USERS.offset = Math.max(0, USERS.offset - d.page); renderUsers(); };
  if ($("#uNext")) $("#uNext").onclick = () => { USERS.offset += d.page; renderUsers(); };
  main.querySelectorAll("tr[data-uid]").forEach((r) => (r.onclick = () => openUser(r.dataset.uid)));
}
async function openUser(id) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.hidden = false; m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="empty">Loading…</div></div>`;
  let d; try { d = await api("/api/admin/users/" + id); } catch (e) { m.innerHTML = `<div class="card"><p>${esc(e.message)}</p><button class="btn ghost" type="button" id="mClose">Close</button></div>`; $("#mClose").onclick = close; return; }
  const u = d.user, sus = u.status === "suspended";
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between"><h2>${esc(u.name || u.email)}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close">×</button></div>
    ${sus ? `<p class="msg err" style="margin:6px 0">Suspended ${when(u.suspended_at)}. They can't sign in, vote or enter contests.</p>` : ""}
    <dl class="facts"><dt>Email</dt><dd><span style="user-select:all">${esc(u.email)}</span></dd><dt>Signs in with</dt><dd>${u.google ? "Google or an emailed code" : "An emailed code"}</dd>
    <dt>Joined</dt><dd>${when(u.created_at)}</dd><dt>Last sign-in</dt><dd>${when(u.last_login)} · ${d.sessions} signed-in device${d.sessions === 1 ? "" : "s"}</dd>
    <dt>Address</dt><dd>${esc([u.street, u.city, u.zip].filter(Boolean).join(", ")) || "not given"}</dd><dt>Votes cast</dt><dd>${d.votes}</dd></dl>
    <h3 style="margin:14px 0 6px">Homes, events and entries (${d.posts.length})</h3>
    ${d.posts.length ? `<ul class="meta" style="margin:0;padding-left:18px">${d.posts.map((p) => `<li>${esc(p.title || p.biz)} · ${esc(p.city)} · ${p.contest_id ? "contest entry" : esc(p.season)} · ${esc(p.status)}</li>`).join("")}</ul>` : '<p class="meta">None.</p>'}
    <h3 style="margin:14px 0 6px">Contests they run (${d.contests.length})</h3>
    ${d.contests.length ? `<ul class="meta" style="margin:0;padding-left:18px">${d.contests.map((c) => `<li><a href="/c/${esc(c.slug)}" target="_blank" rel="noopener">${esc(c.name)}</a> · ${esc(c.city)} · ${esc(c.status)}${c.announced ? " · announced" : ""}</li>`).join("")}</ul>` : '<p class="meta">None.</p>'}
    <form class="f" id="uForm" novalidate style="margin-top:14px"><label for="uName">Name<input id="uName" maxlength="80" value="${esc(u.name)}"></label>
    <label for="uNote">Private note (only you see this)<textarea id="uNote" rows="2" maxlength="1000">${esc(u.admin_note)}</textarea></label>
    <div class="row"><button class="btn ice" type="submit">Save name and note</button><span class="msg" id="uMsg" role="status"></span></div></form>
    <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn ghost" type="button" data-ua="signout">Sign out everywhere</button>
    <button class="btn ghost" type="button" data-ua="${sus ? "unsuspend" : "suspend"}">${sus ? "Reactivate" : "Suspend account"}</button></div>
    <details style="margin-top:14px"><summary style="cursor:pointer;color:#c0392b;font-weight:700">Delete this account</summary>
    <p class="meta" style="margin:8px 0">This permanently removes their sign-ins, drafts, picture, contest entries and votes, closes the contests they run, and clears their email from homes and events they posted. It can't be undone. Type their email to confirm.</p>
    <div class="row"><input id="uDel" placeholder="${esc(u.email)}" style="flex:1;padding:10px 12px;border:1px solid var(--line2);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit"><button class="btn ghost" type="button" data-ua="delete" style="color:#c0392b">Delete</button></div></details></div>`;
  $("#mClose").onclick = close;
  const msg = (t, bad) => { const e = $("#uMsg"); e.className = bad ? "msg err" : "msg"; e.textContent = t; };
  $("#uForm").onsubmit = async (e) => { e.preventDefault(); try { await api("/api/admin/users/" + id, { method: "POST", body: JSON.stringify({ action: "rename", name: $("#uName").value }) }); await api("/api/admin/users/" + id, { method: "POST", body: JSON.stringify({ action: "note", note: $("#uNote").value }) }); msg("Saved."); renderUsers(); } catch (er) { msg(er.message, true); } };
  m.querySelectorAll("[data-ua]").forEach((b) => (b.onclick = async () => {
    const a = b.dataset.ua;
    if (a === "suspend" && b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Click again to suspend"; return; }
    try { await api("/api/admin/users/" + id, { method: "POST", body: JSON.stringify({ action: a, confirm: a === "delete" ? $("#uDel").value : undefined }) }); if (a === "delete") { close(); renderUsers(); } else if (a === "signout") { msg("Signed out on every device."); } else { await openUser(id); renderUsers(); } } catch (er) { msg(er.message, true); }
  }));
}
