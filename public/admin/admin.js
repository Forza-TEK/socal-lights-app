// SoCal Lights admin: review houses, manage published posts, edit events.
import { CITY } from "/cities.js";
import { SEASONS, defaultSeason } from "/seasons.js";
import { attachAddress } from "/addflow.js?v=20261102c";
import { btn, rec, fact, toolbar, wireToolbar, filterCards, tap, toast, pager, modalFrame } from "/admin/kit.js?v=20261102b";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
let evSeason = defaultSeason(TODAY);
const photo = (k) => "/api/admin/photo/" + k.split("/").map(encodeURIComponent).join("/");
let tab = "dashboard", EVENTS = [], POSTS = [];
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

const TABS = ["dashboard", "pending", "subs", "contests", "reports", "approved", "events", "installers", "users", "overlaps", "data", "log"];
const TITLES = { dashboard: "Dashboard", pending: "Houses waiting", subs: "Submitted events", contests: "Contests", reports: "Reports", approved: "Published houses", events: "Events", installers: "Installers", users: "Users", overlaps: "Replaced records", data: "Data check", log: "Activity log" };
const setCount = (k, v) => { COUNTS[k] = v; document.querySelectorAll(`[data-count="${k}"]`).forEach((el) => { el.textContent = v; el.hidden = !v && el.dataset.hide0 === "1"; }); paintTitle(); };
const COUNTS = {};
// The browser tab shows how many things are waiting, so a pinned admin tab can be glanced at
function paintTitle() { const w = (COUNTS.pending || 0) + (COUNTS.subs || 0) + (COUNTS.contests || 0) + (COUNTS.reports || 0); document.title = (w ? `(${w}) ` : "") + "SoCal Lights Admin"; }
function setTab(t, push = true) {
  tab = t;
  document.querySelectorAll("[data-tab]").forEach((b) => { const on = b.dataset.tab === t; b.setAttribute("aria-current", on ? "page" : "false"); });
  $("#ptitle").textContent = TITLES[t] || "";
  closeSheet(); window.scrollTo(0, 0);
  if (push && location.hash !== "#" + t) history.replaceState(null, "", "#" + t);
  render();
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
const sheet = $("#side");
function openSheet() { document.body.classList.add("sheet-open"); $("#moreBtn") && $("#moreBtn").setAttribute("aria-expanded", "true"); }
function closeSheet() { document.body.classList.remove("sheet-open"); $("#moreBtn") && $("#moreBtn").setAttribute("aria-expanded", "false"); }
$("#moreBtn").onclick = () => (document.body.classList.contains("sheet-open") ? closeSheet() : openSheet());
$("#scrim").onclick = closeSheet;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABS.includes(h) && h !== tab) setTab(h, false); });

// The numbers on the menu, from one request, so they are right on arrival and after every change
async function refreshCounts() { try { const c = await api("/api/admin/counts"); for (const k of Object.keys(c)) setCount(k, c[k]); } catch {} }
async function render() {
  const main = $("#main");
  refreshCounts();
  try {
    if (tab === "dashboard") return renderDashboard();
    if (tab === "reports") return renderReports();
    if (tab === "events") return renderEvents();
    if (tab === "subs") return renderSubs();
    if (tab === "contests") return renderContests();
    if (tab === "overlaps") return renderOverlaps();
    if (tab === "installers") return renderInstallers();
    if (tab === "data") return renderData();
    if (tab === "users") return renderUsers();
    if (tab === "log") return renderLog();
    const posts = await api("/api/admin/posts?status=" + tab);
    if (tab === "pending") setCount("pending", posts.length);
    if (!posts.length) { main.innerHTML = `<div class="empty">${tab === "pending" ? "Nothing waiting for review." : "No published houses yet."}</div>`; return; }
    POSTS = posts; main.innerHTML = toolbar({ search: { placeholder: "Search houses, people, cities" }, count: String(posts.length) }) + `<div class="cards">${posts.map(postCard).join("")}</div>`;
    wireToolbar(main, { onSearch: (q) => filterCards(main, q) }); applyPreset(main);
  } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function postCard(p) {
  const web = p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(p.web)}</a>` : "";
  const note = (c, t) => `<p class="meta" style="margin:0;color:var(--ink)">${t}</p>`;
  const pending = tab === "pending";
  return rec({
    attrs: `data-id="${esc(p.id)}"`, title: esc(p.title), tags: [[p.kind === "installer" ? "Installer" : "Homeowner"], [pending ? "Waiting" : "Published", pending ? "warn" : "ok"]], meta: esc((p.created || "").slice(0, 16)) + " UTC",
    lead: p.photos.length ? `<div class="pics">${p.photos.map((k) => `<a href="${photo(k)}" target="_blank" rel="noopener"><img src="${photo(k)}" alt="" loading="lazy"></a>`).join("")}</div>` : `<div class="meta">No photos</div>`,
    facts: fact("Name / business", esc(p.biz)) + fact("City", esc(p.city) + " · " + esc(p.county || "")) + fact("Contact", `<span style="user-select:all">${esc(p.contact_email || "—")}</span>`) + fact("Website", web || "—")
      + (p.inst && p.kind !== "installer" ? fact("Installed by", esc(p.inst.name) + (p.inst.ok ? " (confirmed)" : " (claimed by the homeowner, not confirmed)")) : "") + fact("Public phone", esc(p.phone || "—")) + fact("Street address", esc(p.address || "—") + ' <span class="meta">(shown on the map)</span>') + fact("Where", esc(p.where || "—")) + fact("About", `<span style="white-space:pre-line">${esc(p.desc)}</span>`),
    body: (p.hiddenBySweep ? note(0, "<b>Not on the map.</b> You chose the sweep record for this address (Replaced records).") : "") + (p.replaces ? note(0, `<b>Replaces a sweep record.</b> When you approve this, the automatic listing at the same address is hidden: ${p.replaces.map((r) => esc(r.name)).join("; ")}.`) : "") + (p.nearby ? `<p class="meta" style="margin:0">Same street, different number (both stay listed): ${p.nearby.map((r) => esc(r.name + " (" + (r.address || "").split(",")[0] + ")")).join("; ")}.</p>` : ""),
    edit: btn("ghost", "Edit", `data-editpost="${esc(p.id)}"`) + btn("ghost", `Photos (${p.photos.length})`, `data-editpost="${esc(p.id)}" data-focus="photos"`),
    main: pending ? btn("main", "Approve and publish", 'data-act="approve"') : btn("ghost", "Unpublish", 'data-act="unpublish"'),
    danger: pending ? btn("danger", "Decline", 'data-act="decline"') : btn("danger", "Remove from site", 'data-act="delete"'),
  });
}
const DONE = { approve: "Published", decline: "Declined", unpublish: "Unpublished", delete: "Removed" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const card = b.closest("[data-id]"), id = card.dataset.id, act = b.dataset.act, msg = card.querySelector(".msg");
  if ((act === "decline" || act === "delete" || act === "unpublish") && !tap(b, act === "delete" ? "remove" : act)) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = act === "approve" ? "Publishing…" : "Working…";
  try {
    if (act === "delete") await api("/api/admin/posts/" + id, { method: "DELETE" });
    else await api("/api/admin/posts/" + id, { method: "POST", body: JSON.stringify({ action: act }) });
    card.remove(); toast(DONE[act] || "Done"); refreshCounts(); if (!document.querySelector(".rec")) render();
  } catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

// Resize a photo in the browser before uploading (long side 1800px, JPEG), like the add forms do
async function shrink(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 700 * 1024) return f;
  try { const bmp = await createImageBitmap(f), k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); const b = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85)); return b ? new File([b], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f; } catch { return f; }
}
function editPost(p) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="mh"><h2>Edit house</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close">×</button></div>
  <h3 class="psec" id="pPhotosH" style="margin-top:4px">Photos <span class="meta" id="pPhotosN"></span></h3><div id="pPhotos"></div>
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
    <div class="mfoot"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="pMsg" role="status"></span></div>
  </form></div>`;
  m.hidden = false; $("#mClose").onclick = () => { close(); if (photosChanged) render(); };
  let photosChanged = false;
  const paint = () => {
    $("#pPhotosN").textContent = `(${p.photos.length} of 8)`;
    $("#pPhotos").innerHTML = `<div class="pgrid">${p.photos.map((k, i) => `<figure class="pph"><a href="${photo(k)}" target="_blank" rel="noopener"><img src="${photo(k)}" alt="Photo ${i + 1}" loading="lazy"></a>${i === 0 ? '<span class="cover">Cover</span>' : ""}<figcaption><button type="button" class="btn ghost" data-pmv="${esc(k)}" data-to="${i - 1}" ${i === 0 ? "disabled" : ""} aria-label="Move photo ${i + 1} earlier">‹</button><button type="button" class="btn ghost" data-pmv="${esc(k)}" data-to="${i + 1}" ${i === p.photos.length - 1 ? "disabled" : ""} aria-label="Move photo ${i + 1} later">›</button><button type="button" class="btn ghost danger" data-prm="${esc(k)}" aria-label="Remove photo ${i + 1}">Remove</button></figcaption></figure>`).join("")}</div>
      ${p.photos.length ? "" : '<p class="meta" style="margin:0 0 8px">No photos yet.</p>'}<div class="mfoot" style="margin-top:8px"><label class="btn ghost" style="cursor:pointer;margin:0"><input id="pAdd" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden ${p.photos.length >= 8 ? "disabled" : ""}>Add photos</label><span class="meta">The first photo is the cover. JPG, PNG or WebP.</span><span class="msg" id="pPhMsg" role="status"></span></div>`;
    $("#pAdd").onchange = async (ev) => {
      const files = [...ev.target.files]; ev.target.value = ""; if (!files.length) return;
      const msg = $("#pPhMsg"); msg.className = "msg"; msg.textContent = "Uploading…";
      try { const fd = new FormData(); for (const f of files) fd.append("photos", await shrink(f)); const r = await fetch("/api/admin/posts/" + p.id, { method: "POST", body: fd, credentials: "same-origin" }), d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "The upload didn't work."); p.photos = d.photos; photosChanged = true; toast(files.length === 1 ? "Photo added" : "Photos added"); paint(); }
      catch (er) { msg.className = "msg err"; msg.textContent = er.message; }
    };
  };
  $("#pPhotos").onclick = async (ev) => {
    const mv = ev.target.closest("[data-pmv]"), rm = ev.target.closest("[data-prm]"); if (!mv && !rm) return;
    if (rm && !tap(rm, "remove")) return;
    try { const d = await api("/api/admin/posts/" + p.id, { method: "POST", body: JSON.stringify(mv ? { action: "photo_move", key: mv.dataset.pmv, to: Number(mv.dataset.to) } : { action: "photo_remove", key: rm.dataset.prm }) }); p.photos = d.photos; photosChanged = true; if (rm) toast("Photo removed"); paint(); }
    catch (er) { toast(er.message, true); }
  };
  paint();
  $("#pForm").onsubmit = async (x) => {
    x.preventDefault(); const msg = $("#pMsg"); msg.className = "msg"; msg.textContent = "Saving…";
    const body = { action: "edit", biz: $("#pBiz").value, title: $("#pTitle").value, city: $("#pCity").value, season: $("#pSeason").value, kind: $("#pKind").value, street: $("#pStreet").value, zip: $("#pZip").value, area: $("#pArea").value, web: $("#pWeb").value, phone: $("#pPhone").value, where: $("#pWhere").value, desc: $("#pDesc").value };
    try { await api("/api/admin/posts/" + p.id, { method: "POST", body: JSON.stringify(body) }); close(); render(); }
    catch (err) { msg.className = "msg err"; msg.textContent = err.message; }
  };
}
$("#main").addEventListener("click", (e) => { const b = e.target.closest("[data-editpost]"); if (b) { editPost(POSTS.find((x) => x.id === b.dataset.editpost)); if (b.dataset.focus === "photos") { const h = $("#pPhotosH"); if (h) h.scrollIntoView({ block: "start" }); } } });


/* ---------- submitted events (public "Add your event" form) ---------- */
let SUBS = [], SUBVIEW = "pending";
async function renderSubs() {
  const main = $("#main");
  const [waiting, live] = await Promise.all([api("/api/admin/submissions?status=pending"), api("/api/admin/submissions?status=published")]);
  SUBS = SUBVIEW === "pending" ? waiting : live;
  setCount("subs", waiting.length);
  const bar = toolbar({ views: [{ k: "pending", label: "Waiting", n: waiting.length }, { k: "published", label: "Live", n: live.length }], active: SUBVIEW, search: { placeholder: "Search events, cities" }, count: String(SUBS.length) });
  const go = () => { wireToolbar(main, { onView: (v) => { SUBVIEW = v; renderSubs(); }, onSearch: (q) => filterCards(main, q) }); applyPreset(main); };
  if (!SUBS.length) { main.innerHTML = bar + `<div class="empty">${SUBVIEW === "pending" ? "Nothing waiting. New events go live right away; look under Live to review or unpublish them." : "No submitted events are live."}</div>`; go(); return; }
  const pend = SUBVIEW === "pending";
  main.innerHTML = bar + `<div class="cards">${SUBS.map((x) => rec({
    attrs: `data-sid="${esc(x.id)}"`, title: esc(x.name), tags: [[pend ? "Waiting" : "Published", pend ? "warn" : "ok"]], meta: esc((x.created_at || "").slice(0, 16)) + " UTC",
    facts: fact("When", esc(x.start_date) + (x.end_date !== x.start_date ? " to " + esc(x.end_date) : "") + " · " + esc(x.hours || "no hours")) + fact("Where", `${esc(x.venue)}<br><span class="meta">${esc(x.address)}, ${esc(x.city)} · ${esc(x.county || "")} (pin ${Number(x.lat).toFixed(4)}, ${Number(x.lng).toFixed(4)})</span>`)
      + fact("Type", `${esc(SEASONS[x.season] ? SEASONS[x.season].label : x.season)} · ${esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)} · ${esc(x.price || "")}`) + fact("About", esc(x.blurb)) + fact("Event page", x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>` : "")
      + fact("Contact", `<span style="user-select:all">${esc(x.contact_email)}</span>`) + fact("Notes", esc(x.note || "")) + (x.paid_plans ? fact("Paid Featured", `<b>${esc(x.paid_plans)}</b>`) : ""),
    edit: pend ? btn("ghost", "Edit", `data-sedit="${esc(x.id)}"`) : "",
    main: pend ? btn("main", "Publish (confirmed)", 'data-sact="approve" data-st="confirmed"') + btn("ghost", "Publish (expected)", 'data-sact="approve" data-st="expected"') : btn("ghost", "Unpublish", 'data-sact="unpublish"'),
    danger: pend ? btn("danger", "Decline", 'data-sact="decline"') : "",
  })).join("")}</div>`;
  go();
}
// A small edit window for records with a few plain fields (submitted events, waiting contests)
function editSimple({ title, fields, values, save }) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.hidden = false;
  const fld = (f) => `<label for="es-${f.k}" ${f.wide ? 'style="grid-column:1/-1"' : ""}>${esc(f.label)}${f.area ? `<textarea id="es-${f.k}" rows="3" maxlength="${f.max || 600}">${esc(values[f.k] || "")}</textarea>` : `<input id="es-${f.k}" type="${f.type || "text"}" maxlength="${f.max || 120}" value="${esc(values[f.k] || "")}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ""}>`}</label>`;
  m.innerHTML = modalFrame(title, `<form class="f" id="esForm" novalidate><div class="grid2">${fields.map(fld).join("")}</div><div class="mfoot"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="esMsg" role="status"></span></div></form>`);
  $("#mClose").onclick = close;
  $("#esForm").onsubmit = async (e) => { e.preventDefault(); const body = {}; fields.forEach((f) => (body[f.k] = $("#es-" + f.k).value)); try { await save(body); close(); toast("Saved"); } catch (er) { const x = $("#esMsg"); x.className = "msg err"; x.textContent = er.message; } };
}
const SUBF = [{ k: "name", label: "Event name", wide: true }, { k: "venue", label: "Venue" }, { k: "address", label: "Address" }, { k: "city", label: "City" }, { k: "start_date", label: "Starts (YYYY-MM-DD)", max: 10 }, { k: "end_date", label: "Ends (YYYY-MM-DD)", max: 10 }, { k: "hours", label: "Hours" }, { k: "price", label: "Price" }, { k: "url", label: "Event page", type: "url", max: 300, wide: true }, { k: "contact_email", label: "Contact email", type: "email" }, { k: "blurb", label: "About", area: true, wide: true }];
const CONF = [{ k: "name", label: "Contest name", wide: true }, { k: "org", label: "Run by" }, { k: "city", label: "City" }, { k: "contact_email", label: "Organizer email", type: "email" }, { k: "site", label: "Website", type: "url", max: 200 }, { k: "entries_close", label: "Entries close (YYYY-MM-DD)", max: 10 }, { k: "vote_start", label: "Voting starts", max: 10 }, { k: "vote_end", label: "Voting ends", max: 10 }, { k: "descr", label: "Welcome message", area: true, wide: true, max: 1000 }];
$("#main").addEventListener("click", (e) => {
  const sb = e.target.closest("[data-sedit]"); if (sb) { const x = SUBS.find((r) => r.id === sb.dataset.sedit); return editSimple({ title: "Edit event", fields: SUBF, values: x, save: async (b) => { await api("/api/admin/submissions/" + x.id, { method: "POST", body: JSON.stringify({ action: "edit", ...b }) }); renderSubs(); } }); }
  const cb = e.target.closest("[data-cedit]"); if (cb) { const x = CONTESTS.find((r) => r.id === cb.dataset.cedit); return editSimple({ title: "Edit contest", fields: CONF, values: { ...x, contact_email: x.contact_email || x.owner_email }, save: async (b) => { await api("/api/admin/contests/" + x.id, { method: "POST", body: JSON.stringify({ action: "edit", ...b }) }); renderContests(); } }); }
});
const SDONE = { approve: "Published", decline: "Declined", unpublish: "Unpublished" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-sact]"); if (!b) return;
  const card = b.closest("[data-sid]"), msg = card.querySelector(".msg");
  if ((b.dataset.sact === "decline" || b.dataset.sact === "unpublish") && !tap(b, b.dataset.sact)) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try { await api("/api/admin/submissions/" + card.dataset.sid, { method: "POST", body: JSON.stringify({ action: b.dataset.sact, status: b.dataset.st }) }); toast(SDONE[b.dataset.sact] || "Done"); renderSubs(); refreshCounts(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

/* ---------- contests (organizers who need a review, e.g. a Gmail address or an email that doesn't match their website) ---------- */
let CONTESTS = [];
async function renderContests() {
  const main = $("#main");
  const list = await api("/api/admin/contests?status=pending");
  setCount("contests", list.length); CONTESTS = list;
  if (!list.length) { main.innerHTML = `<div class="empty">No contests waiting. A contest goes live by itself when the organizer's email matches their website.</div>`; return; }
  main.innerHTML = toolbar({ search: { placeholder: "Search contests, organizers" }, count: String(list.length) }) + `<div class="cards">${list.map((c) => rec({
    attrs: `data-cid="${esc(c.id)}"`, title: esc(c.name), tags: [["Waiting", "warn"]], meta: esc((c.created_at || "").slice(0, 16)) + " UTC",
    facts: fact("Run by", esc(c.org) + " · " + esc(c.city)) + fact("Organizer email", `<span style="user-select:all">${esc(c.owner_email || c.contact_email)}</span>`) + fact("Website", c.site ? `<a href="${esc(c.site)}" target="_blank" rel="noopener">${esc(c.site)}</a>` : "none given") + fact("Why it's here", esc(c.note || ""))
      + fact("Dates", `Entries to ${esc(c.entries_close)} · voting ${esc(c.vote_start)} to ${esc(c.vote_end)}`) + fact("Welcome message", esc(c.descr)) + fact("Public page", `<a href="/c/${esc(c.slug)}" target="_blank" rel="noopener">/c/${esc(c.slug)}</a>`),
    edit: btn("ghost", "Edit", `data-cedit="${esc(c.id)}"`), main: btn("main", "Approve (goes on the map)", 'data-cact="approve"'), danger: btn("danger", "Decline", 'data-cact="decline"'),
  })).join("")}</div>`;
  wireToolbar(main, { onSearch: (q) => filterCards(main, q) }); applyPreset(main);
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cact]"); if (!b) return;
  const card = b.closest("[data-cid]"), msg = card.querySelector(".msg");
  if (b.dataset.cact === "decline" && !tap(b, "decline")) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try { await api("/api/admin/contests/" + card.dataset.cid, { method: "POST", body: JSON.stringify({ action: b.dataset.cact }) }); card.remove(); toast(b.dataset.cact === "approve" ? "Contest approved" : "Contest declined"); refreshCounts(); if (!document.querySelector(".rec")) render(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

/* ---------- events ---------- */
let EVQ = "", EVLIMIT = 60;
async function renderEvents() {
  EVENTS = await (await fetch("/api/events?all=1", { cache: "no-store" })).json();
  const main = $("#main");
  const seasonSel = `<select id="evSeason" aria-label="Season">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === evSeason ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>`;
  main.innerHTML = toolbar({ search: { placeholder: "Search events, cities", value: EVQ }, right: seasonSel, add: { id: "addEv", label: "Add an event" }, count: "" }) + `<div id="evlist"></div>`;
  const paint = () => {
    const w = EVQ.toLowerCase().split(/\s+/).filter(Boolean);
    const all = EVENTS.filter((e) => (e.sn || "christmas") === evSeason && w.every((x) => (e.n + " " + e.city + " " + (e.p || "") + " " + e.c).toLowerCase().includes(x)));
    const list = all.slice(0, EVLIMIT);
    main.querySelector("[data-tcount]") ? 0 : main.querySelector(".tbar .grow").insertAdjacentHTML("afterend", '<span class="meta tcount" data-tcount></span>');
    main.querySelector("[data-tcount]").textContent = `${all.length} event${all.length === 1 ? "" : "s"}`;
    $("#evlist").innerHTML = all.length ? `<div class="cards">${list.map((e) => rec({
      compact: true, cls: e.e < TODAY ? "past" : "", attrs: `data-eid="${esc(e.id)}"`, title: esc(e.n), tags: [[e.st === "c" ? "Confirmed" : "Expected", e.st === "c" ? "ok" : "warn"], ...(e.e < TODAY ? [["Ended"]] : [])],
      meta: "", body: `<span class="sub">${esc(e.city)}, ${esc(e.c)} · ${esc(e.s)}${e.e !== e.s ? " to " + esc(e.e) : ""} · ${esc(e.p || "")}</span>`, edit: btn("ghost", "Edit", `data-edit="${esc(e.id)}"`),
    })).join("")}</div>${all.length > list.length ? `<div class="pager"><span class="meta">Showing ${list.length} of ${all.length}</span><button class="btn ghost" type="button" id="evMore">Show 60 more</button></div>` : ""}` : `<div class="empty">No events match.</div>`;
    $("#evlist").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editEvent(EVENTS.find((x) => x.id === b.dataset.edit))));
    if ($("#evMore")) $("#evMore").onclick = () => { EVLIMIT += 60; paint(); };
  };
  paint();
  wireToolbar(main, { onSearch: (q) => { EVQ = q; EVLIMIT = 60; paint(); } });
  $("#evSeason").onchange = (x) => { evSeason = x.target.value; EVLIMIT = 60; paint(); };
  $("#addEv").onclick = () => editEvent(null);
}
function editEvent(ev) {
  const e = ev || { id: "", n: "", c: "Orange", city: "", t: Object.keys(SEASONS[evSeason].types)[0], s: TODAY, e: TODAY, st: "expected", free: true, p: "Free", h: "", lat: 33.68, lng: -117.83, b: "", u: "", sn: evSeason };
  const typeOpts = (sn, cur) => Object.entries(SEASONS[sn].types).map(([v, l]) => `<option value="${v}" ${v === cur ? "selected" : ""}>${l}</option>`).join("");
  const m = $("#modal");
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="mh"><h2>${ev ? "Edit event" : "Add an event"}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close">×</button></div>
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
    <div class="mfoot"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="grow"></span>${ev ? `<button class="btn ghost danger" type="button" id="eDel">Delete event</button>` : ""}<span class="msg" id="eMsg" role="status" style="flex-basis:100%"></span></div>
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
  if (ev) $("#eDel").onclick = async (x) => { const b = x.target; if (!tap(b, "delete")) return; await api("/api/admin/events/" + encodeURIComponent(ev.id), { method: "DELETE" }); close(); toast("Event deleted"); renderEvents(); };
  $("#evForm").onsubmit = async (x) => {
    x.preventDefault(); const msg = $("#eMsg");
    const id = ev ? ev.id : $("#eN").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 6);
    const body = { id, season: $("#eSn").value, name: $("#eN").value, county: $("#eC").value, city: $("#eCity").value, type: $("#eT").value, start: $("#eS").value, end: $("#eE").value, status: $("#eSt").value, free: $("#eF").checked, price: $("#eP").value, hours: $("#eH").value, lat, lng, blurb: $("#eB").value, url: $("#eU").value, venue: $("#eV").value, address: $("#eA").value };
    try { await api("/api/admin/events", { method: "POST", body: JSON.stringify(body) }); close(); renderEvents(); }
    catch (err) { msg.className = "msg err"; msg.textContent = err.message; }
  };
}

(async () => {
  try { const me = await api("/api/admin/me"); $("#who").textContent = me.email; $("#whoi").textContent = (me.email || "?")[0].toUpperCase(); const h = location.hash.slice(1); setTab(TABS.includes(h) ? h : "dashboard", false); }
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
  setCount("users", d.all);
  const bar = toolbar({ views: [{ k: "", label: "All", n: d.all }, { k: "active", label: "Active" }, { k: "suspended", label: "Suspended", n: d.suspended }], active: USERS.status, search: { placeholder: "Search name or email", value: USERS.q }, right: `<a class="btn ghost" href="/api/admin/users?format=csv&q=${encodeURIComponent(USERS.q)}&status=${USERS.status}" download>Download CSV</a>`, count: `${d.total}` });
  main.innerHTML = bar + (d.users.length ? `<div class="cards">${d.users.map((u) => rec({
    compact: true, attrs: `data-uid="${esc(u.id)}"`, title: esc(u.name || "(no name)"), tags: u.status === "suspended" ? [["Suspended", "bad"]] : [],
    body: `<span class="sub">${esc(u.email)}${u.google ? " · Google" : ""} · joined ${esc((u.created_at || "").slice(0, 10))} · last sign-in ${ago(u.last_login)}</span><span class="sub">${u.homes + u.entries} home${u.homes + u.entries === 1 ? "" : "s"}/entr${u.homes + u.entries === 1 ? "y" : "ies"} · ${u.contests} contest${u.contests === 1 ? "" : "s"} run · ${u.votes} vote${u.votes === 1 ? "" : "s"}</span>`,
    edit: btn("ghost", "Profile", `data-open="${esc(u.id)}"`),
  })).join("")}</div>` + pager({ offset: d.offset, shown: d.users.length, total: d.total, page: d.page, idPrev: "uPrev", idNext: "uNext" }) : `<div class="empty">${USERS.q || USERS.status ? "Nobody matches that." : "Nobody has made a profile yet."}</div>`);
  wireToolbar(main, { onView: (v) => { USERS.status = v; USERS.offset = 0; renderUsers(); }, onSearch: (q) => { USERS.q = q; USERS.offset = 0; renderUsers().then(() => { const i = $("[data-search]"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); } });
  if ($("#uPrev")) $("#uPrev").onclick = () => { USERS.offset = Math.max(0, USERS.offset - d.page); renderUsers(); };
  if ($("#uNext")) $("#uNext").onclick = () => { USERS.offset += d.page; renderUsers(); };
  main.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openUser(b.dataset.open)));
}
async function openUser(id) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.hidden = false; m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="empty">Loading…</div></div>`;
  let d; try { d = await api("/api/admin/users/" + id); } catch (e) { m.innerHTML = `<div class="card"><p>${esc(e.message)}</p><button class="btn ghost" type="button" id="mClose">Close</button></div>`; $("#mClose").onclick = close; return; }
  const u = d.user, sus = u.status === "suspended";
  m.innerHTML = `<div class="card wide" role="dialog" aria-modal="true"><div class="mh"><h2>${esc(u.name || u.email)}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close">×</button></div>
    ${sus ? `<p class="msg err" style="margin:6px 0">Suspended ${when(u.suspended_at)}. They can't sign in, vote or enter contests.</p>` : ""}
    <dl class="facts"><dt>Email</dt><dd><span style="user-select:all">${esc(u.email)}</span></dd><dt>Signs in with</dt><dd>${u.google ? "Google or an emailed code" : "An emailed code"}</dd>
    <dt>Joined</dt><dd>${when(u.created_at)}</dd><dt>Last sign-in</dt><dd>${when(u.last_login)} · ${d.sessions} signed-in device${d.sessions === 1 ? "" : "s"}</dd>
    <dt>Address</dt><dd>${esc([u.street, u.city, u.zip].filter(Boolean).join(", ")) || "not given"}</dd><dt>Votes cast</dt><dd>${d.votes}</dd></dl>
    ${d.installers.length ? psec("Installer profiles they own", d.installers.length, d.installers.map((i) => prow(`data-pf-inst="${esc(i.id)}"`, "⚒", i.name, "Installer profile", [i.status === "hidden" ? "Hidden" : "Active", i.status === "hidden" ? "bad" : "ok"])).join("")) : ""}
    ${psec("Homes and contest entries", d.posts.length, d.posts.map((p) => prow(`data-pf-post="${esc(p.id)}"`, p.contest_id ? "★" : "⌂", p.title || p.biz, `${p.city || ""} · ${p.contest_id ? "contest entry" : p.season} · ${ago(p.created_at)}`, [p.status === "approved" ? "Live" : p.status === "pending" ? "Waiting" : p.status, p.status === "approved" ? "ok" : p.status === "pending" ? "warn" : ""])).join(""))}
    ${psec("Events they submitted", d.events.length, d.events.map((e) => prow(`data-pf-sub="${esc(e.name)}" data-pf-view="${e.status === "published" ? "published" : "pending"}"`, "◷", e.name, `${e.city || ""} · ${e.start_date || ""}`, [e.status === "published" ? "Live" : e.status === "pending" ? "Waiting" : e.status, e.status === "published" ? "ok" : e.status === "pending" ? "warn" : ""])).join(""))}
    ${psec("Contests they run", d.contests.length, d.contests.map((c) => `<li><a class="dli" href="/c/${esc(c.slug)}" target="_blank" rel="noopener"><span class="ico" aria-hidden="true">★</span><span class="dt"><b>${esc(c.name)}</b><small>${esc(c.city)}${c.announced ? " · winners announced" : ""}</small></span><span class="tag ${c.status === "live" ? "ok" : c.status === "pending" ? "warn" : ""}">${esc(c.status)}</span><span aria-hidden="true" class="chev">↗</span></a></li>`).join(""))}
    ${d.history.length ? `<h3 class="psec">Admin history</h3><ul class="meta" style="margin:0;padding-left:18px">${d.history.map((h) => `<li>${when(h.at)} · ${esc(h.admin || "admin")} ${esc(VERB[h.action] || h.action)}</li>`).join("")}</ul>` : ""}
    <form class="f" id="uForm" novalidate style="margin-top:14px"><label for="uName">Name<input id="uName" maxlength="80" value="${esc(u.name)}"></label>
    <label for="uNote">Private note (only you see this)<textarea id="uNote" rows="2" maxlength="1000">${esc(u.admin_note)}</textarea></label>
    <div class="mfoot"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="uMsg" role="status"></span></div></form>
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
    if (a === "suspend" && !tap(b, "suspend")) return;
    try { await api("/api/admin/users/" + id, { method: "POST", body: JSON.stringify({ action: a, confirm: a === "delete" ? $("#uDel").value : undefined }) }); if (a === "delete") { close(); renderUsers(); } else if (a === "signout") { msg("Signed out on every device."); } else { await openUser(id); renderUsers(); } } catch (er) { msg(er.message, true); }
  }));
}


/* ---------- activity log (what the admin tools were used for) ---------- */
const VERB = { photo_remove: "removed a photo from", photo_move: "reordered the photos of", dismiss: "dismissed", approve: "approved", decline: "declined", edit: "edited", delete: "deleted", add: "added", suspend: "suspended", unsuspend: "reactivated", signout: "signed out everywhere", rename: "renamed", note: "updated the private note on", start_voting: "started voting on", keep: "showed both records for", hide: "chose the person's record for", pick_post: "chose the person's own record for", pick_both: "chose to show both records for", pick_sweep: "chose the sweep record for" };
const AREA = { users: "account", posts: "house", events: "event", contests: "contest", submissions: "submitted event", overlaps: "sweep record", installers: "installer", reports: "report", normalize: "data check" };
let LOG = { area: "", offset: 0 };
async function renderLog() {
  const main = $("#main");
  const d = await api("/api/admin/log?" + new URLSearchParams(LOG));
  const opt = (v, l) => `<option value="${v}" ${LOG.area === v ? "selected" : ""}>${l}</option>`;
  main.innerHTML = toolbar({ right: `<select id="lga" aria-label="Show">${opt("", "Everything")}${opt("users", "Accounts")}${opt("posts", "Houses")}${opt("events", "Events")}${opt("submissions", "Submitted events")}${opt("contests", "Contests")}${opt("installers", "Installers")}${opt("reports", "Reports")}</select>`, count: `${d.total} action${d.total === 1 ? "" : "s"} recorded` })
    + (d.entries.length ? `<div class="tablewrap"><table><thead><tr><th>When</th><th>Who</th><th>What they did</th></tr></thead><tbody>${d.entries.map((e) => `<tr><td>${when(e.at)}</td><td>${esc(e.admin || "admin")}</td><td>${esc(VERB[e.action] || e.action)} ${esc(AREA[e.area] || e.area)} <b>${esc(e.label || e.target_id || "")}</b></td></tr>`).join("")}</tbody></table></div>` + pager({ offset: d.offset, shown: d.entries.length, total: d.total, page: d.page, idPrev: "lgPrev", idNext: "lgNext" })
    : `<div class="empty">Nothing recorded yet. Approving, declining, editing, deleting, suspending and similar actions will show up here.</div>`);
  $("#lga").onchange = (e) => { LOG.area = e.target.value; LOG.offset = 0; renderLog(); };
  if ($("#lgPrev")) $("#lgPrev").onclick = () => { LOG.offset = Math.max(0, LOG.offset - d.page); renderLog(); };
  if ($("#lgNext")) $("#lgNext").onclick = () => { LOG.offset += d.page; renderLog(); };
}


/* ---------- replaced records: a house or installer post replaces the sweep-made listing at the same address ---------- */
const CHOICES = [["pick_post", "post", "Their record"], ["pick_both", "both", "Both"], ["pick_sweep", "sweep", "Sweep record"]];
const choiceButtons = (r) => `<div class="row" style="gap:0;flex-wrap:nowrap" role="group" aria-label="Which record visitors see">${CHOICES.map(([a, c, l], i) => `<button type="button" data-ov="${a}" data-eid="${esc(r.event.id)}" aria-pressed="${r.event.choice === c}" class="btn ${r.event.choice === c ? "ice" : "ghost"}" style="border-radius:${i === 0 ? "10px 0 0 10px" : i === 2 ? "0 10px 10px 0" : "0"};padding-inline:12px;white-space:nowrap">${l}</button>`).join("")}</div>`;
async function renderOverlaps() {
  const main = $("#main"), d = await api("/api/admin/overlaps");
  const active = d.replaced.length;
  setCount("overlaps", active);
  const who = (p) => `<a href="#" data-gopost="${esc(p.id)}">${esc(p.title)}</a> <span class="meta">(${p.kind === "installer" ? "installer" : "homeowner"}, ${esc(p.biz)})</span>`;
  main.innerHTML = `<p class="meta" style="margin:0 0 12px;max-width:720px">When an approved house or installer post has the same street address as a record the sweeps made, the person's own record is shown and the sweep record is hidden. You can switch any address to the sweep record, or show both. Nothing is deleted, and the person's post stays approved.</p>
    <h3 style="margin:0 0 8px">Replaced (${d.replaced.length})</h3>
    ${d.replaced.length ? `<div class="tablewrap"><table><thead><tr><th>Sweep record</th><th>The person's record</th><th>Visitors see</th></tr></thead><tbody>${d.replaced.map((r) => `<tr><td><b>${esc(r.event.name)}</b><br><span class="meta">${esc(r.event.address)}</span></td><td>${who(r.post)}${r.event.win ? `<br><span class="meta">Win shown on their listing: ${esc(r.event.win)}</span>` : ""}</td><td>${choiceButtons(r)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">Nothing replaced yet.</div>'}
    <h3 style="margin:20px 0 8px">Same street, different number (${d.near.length}) <span class="meta" style="font-weight:400">both stay listed</span></h3>
    ${d.near.length ? `<div class="tablewrap"><table><thead><tr><th>Sweep record</th><th>Post</th></tr></thead><tbody>${d.near.map((r) => `<tr><td><b>${esc(r.event.name)}</b><br><span class="meta">${esc(r.event.address)}</span></td><td>${who(r.post)}<br><span class="meta">${esc(r.post.street)}, ${esc(r.post.city)}</span></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">None.</div>'}`;
  main.querySelectorAll("[data-ov]").forEach((b) => (b.onclick = async () => { main.querySelectorAll("[data-ov]").forEach((x) => (x.disabled = true)); try { await api("/api/admin/overlaps", { method: "POST", body: JSON.stringify({ action: b.dataset.ov, event_id: b.dataset.eid }) }); renderOverlaps(); refreshCounts(); } catch (e) { renderOverlaps(); alert(e.message); } }));
  main.querySelectorAll("[data-gopost]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); setTab("approved"); }));
}


/* ---------- installers: edit a profile, hide it, or merge two spellings of one company ---------- */
let INST = [];
async function renderInstallers() {
  const main = $("#main");
  INST = await api("/api/admin/installers");
  setCount("installers", INST.length);
  if (!INST.length) { main.innerHTML = `<div class="empty">No installer profiles yet. One appears when an installer posts a display or a homeowner names the company that installed their lights.</div>`; return; }
  main.innerHTML = toolbar({ search: { placeholder: "Search installers" }, count: String(INST.length) }) + `<div class="cards">${INST.map((i) => rec({
    attrs: `data-iid="${esc(i.id)}"`, title: esc(i.name), tags: [i.status === "hidden" ? ["Hidden", "bad"] : ["Active", "ok"], ...(i.unconfirmed ? [[i.unconfirmed + " not confirmed", "warn"]] : [])],
    meta: `${i.homes} home${i.homes === 1 ? "" : "s"} · <a href="/installer/${esc(i.slug)}" target="_blank" rel="noopener">view page</a>`,
    facts: fact("Website", esc(i.web)) + fact("Phone", esc(i.phone)) + fact("Service area", esc(i.area)) + fact("Confirmation email", esc(i.email)) + fact("Owner", esc(i.owner_email)),
    edit: btn("ghost", "Profile", `data-iedit="${esc(i.id)}"`), main: btn("ghost", i.status === "hidden" ? "Show" : "Hide", `data-iact="${i.status === "hidden" ? "show" : "hide"}"`),
  })).join("")}</div>`;
  wireToolbar(main, { onSearch: (q) => filterCards(main, q) }); applyPreset(main);
}
const instAct = async (id, body) => api("/api/admin/installers/" + id, { method: "POST", body: JSON.stringify(body) });
// ---- shared pieces of the Installer and User profile windows
const psec = (title, n, rows, empty = "None.") => `<h3 class="psec">${esc(title)} <span class="meta">(${n})</span></h3>` + (n ? `<ul class="dl">${rows}</ul>` : `<p class="meta" style="margin:0">${empty}</p>`);
const prow = (attrs, ico, title, sub, tag) => `<li><button type="button" class="dli" ${attrs}><span class="ico" aria-hidden="true">${ico}</span><span class="dt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${tag ? `<span class="tag ${tag[1] || ""}">${esc(tag[0])}</span>` : ""}<span aria-hidden="true" class="chev">›</span></button></li>`;
let PRESET = "";
const applyPreset = (root) => { if (!PRESET) return; const i = root.querySelector("[data-search]"); if (i) { i.value = PRESET; filterCards(root, PRESET); } PRESET = ""; };
async function openPostById(id) { const [p] = await api("/api/admin/posts?id=" + encodeURIComponent(id)); if (!p) return toast("That record no longer exists.", true); POSTS = [p]; editPost(p); }
document.addEventListener("click", (e) => {
  const q = (sel) => e.target.closest(sel);
  let b;
  if ((b = q("[data-pf-post]"))) openPostById(b.dataset.pfPost).catch((er) => toast(er.message, true));
  else if ((b = q("[data-pf-inst]"))) openInstaller(b.dataset.pfInst);
  else if ((b = q("[data-pf-user]"))) openUser(b.dataset.pfUser);
  else if ((b = q("[data-pf-sub]"))) { $("#modal").hidden = true; $("#modal").innerHTML = ""; PRESET = b.dataset.pfSub; SUBVIEW = b.dataset.pfView || "pending"; setTab("subs"); }
});

// The installer's profile: who they are, everything linked to them, then the edit form
async function openInstaller(id) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.hidden = false; m.innerHTML = `<div class="card wide"><div class="empty">Loading…</div></div>`;
  if (!INST.length) INST = await api("/api/admin/installers").catch(() => []);
  let d; try { d = await api("/api/admin/installers/" + id); } catch (e) { toast(e.message, true); return close(); }
  const i = d.installer, f = (k, l, v, ex = "") => `<label>${l}<input data-f="${k}" value="${esc(v || "")}" ${ex}></label>`;
  const conf = d.homes.filter((h) => h.installer_confirmed || h.poster_type === "installer").length;
  m.innerHTML = modalFrame(i.name, `
    <div class="rt" style="margin:-4px 0 10px"><span class="tag ${i.status === "hidden" ? "bad" : "ok"}">${i.status === "hidden" ? "Hidden" : "Active"}</span><a class="meta" href="/installer/${esc(i.slug)}" target="_blank" rel="noopener">View public page ↗</a></div>
    <div class="stats pstats"><div class="stat"><b>${d.homes.length}</b><span>homes linked</span></div><div class="stat"><b>${conf}</b><span>confirmed</span></div><div class="stat"><b>${d.views7}</b><span>page views, 7 days</span></div><div class="stat"><b>${d.leads.length}</b><span>quote requests</span></div></div>
    ${d.owner ? psec("Owner account", 1, prow(`data-pf-user="${esc(d.owner.id)}"`, "☺", d.owner.name || d.owner.email, d.owner.email)) : `<h3 class="psec">Owner account</h3><p class="meta" style="margin:0">${i.owner_email ? esc(i.owner_email) + " has no account yet." : "Nobody has claimed this profile."}</p>`}
    ${psec("Homes linked to this installer", d.homes.length, d.homes.map((h) => prow(`data-pf-post="${esc(h.id)}"`, "⌂", h.title, `${h.city || ""} · ${h.poster_type === "installer" ? "posted by the installer" : h.installer_confirmed ? "confirmed" : "claimed by the homeowner, not confirmed"} · ${ago(h.created_at)}`, [h.status === "approved" ? "Live" : h.status === "pending" ? "Waiting" : h.status, h.status === "approved" ? "ok" : h.status === "pending" ? "warn" : ""])).join(""))}
    ${psec("Recent quote requests", d.leads.length, d.leads.map((l) => `<li><div class="dli" style="cursor:default"><span class="ico" aria-hidden="true">✉</span><span class="dt"><b>${esc(l.name)}</b><small>${esc(l.email)}${l.phone ? " · " + esc(l.phone) : ""} · ${ago(l.created_at)}</small></span></div></li>`).join(""))}
    ${d.history.length ? `<h3 class="psec">Admin history</h3><ul class="meta" style="margin:0;padding-left:18px">${d.history.map((h) => `<li>${when(h.at)} · ${esc(h.admin || "admin")} ${esc(VERB[h.action] || h.action)}</li>`).join("")}</ul>` : ""}
    <h3 class="psec">Edit details</h3>
    <form class="f" id="iForm" novalidate>${f("name", "Company name", i.name, 'maxlength="80"')}<div class="two">${f("web", "Website", i.web, 'maxlength="200"')}${f("phone", "Phone", i.phone, 'maxlength="80"')}</div>
    <div class="two">${f("area", "Service area", i.area, 'maxlength="120"')}${f("email", "Email for confirmations (private)", i.email, 'maxlength="120" type="email"')}</div>
    ${f("owner", "Owner email (can edit this profile)", i.owner_email, 'maxlength="120" type="email"')}
    <label>About (shown on the profile)<textarea data-f="blurb" rows="3" maxlength="600">${esc(i.blurb || "")}</textarea></label>
    <div class="mfoot"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="iMsg" role="status"></span></div></form>
    <details style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Merge into another profile</summary>
    <p class="meta" style="margin:8px 0">Moves every home to the profile you keep and removes this one. Use it when one company was typed two ways.</p>
    <div class="mfoot" style="margin-top:0"><select id="iMerge" aria-label="Merge ${esc(i.name)} into" style="flex:1;min-width:200px"><option value="">Choose the profile to keep…</option>${INST.filter((o) => o.id !== i.id).map((o) => `<option value="${esc(o.id)}">${esc(o.name)} (${o.homes})</option>`).join("")}</select><button class="btn ghost danger" type="button" id="iMergeGo">Merge</button></div></details>`, true);
  $("#mClose").onclick = close;
  const msg = (t, bad) => { const e = $("#iMsg"); e.className = bad ? "msg err" : "msg"; e.textContent = t; };
  $("#iForm").onsubmit = async (e) => { e.preventDefault(); const body = { action: "edit" }; m.querySelectorAll("[data-f]").forEach((el) => (body[el.dataset.f] = el.value)); try { await instAct(i.id, body); toast("Saved"); await openInstaller(i.id); if (tab === "installers") renderInstallers(); refreshCounts(); } catch (er) { msg(er.message, true); } };
  $("#iMergeGo").onclick = async (e) => { const into = $("#iMerge").value; if (!into) return msg("Choose the profile to keep.", true); if (!tap(e.target, "merge")) return; try { await instAct(i.id, { action: "merge", into }); close(); toast("Merged"); renderInstallers(); refreshCounts(); } catch (er) { msg(er.message, true); } };
}
$("#main").addEventListener("click", async (e) => {
  const ed = e.target.closest("[data-iedit]"); if (ed) return openInstaller(ed.dataset.iedit);
  const b = e.target.closest("[data-iact]"); if (!b) return;
  const card = b.closest("[data-iid]"), msg = card.querySelector(".msg");
  b.disabled = true;
  try { await instAct(card.dataset.iid, { action: b.dataset.iact }); toast(b.dataset.iact === "hide" ? "Hidden from the site" : "Shown on the site"); renderInstallers(); refreshCounts(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});


/* ---------- data check: tidy every stored phone, website, email, ZIP, street and name ---------- */
async function renderData(res) {
  const main = $("#main");
  main.innerHTML = `<p class="loading">Checking every saved record…</p>`;
  const d = res || (await api("/api/admin/normalize"));
  const rows = d.fields.map((f) => `<tr><td>${esc(f.table)}</td><td>${esc(f.field)}</td><td>${f.changed}</td><td>${f.attention}</td><td class="small">${f.examples.map((x) => `<div><span class="meta">${esc(x.record)}:</span> <s>${esc(x.old)}</s> &rarr; ${esc(x.new)}</div>`).join("")}</td></tr>`).join("");
  main.innerHTML = `<p class="meta">Phones become (310) 555-0123, websites https://example.com/, emails lowercase, ZIPs five digits, streets "123 Main St", names tidy capitals. Anything that can't be fixed automatically is left alone and listed below. New entries are tidied as they are typed, so this only cleans up older records.</p>
   <div class="row" style="gap:10px;margin:10px 0"><span class="meta">${d.dry ? "Check only: nothing has been changed." : "Done."}</span><b>${d.changed} value${d.changed === 1 ? "" : "s"} ${d.dry ? "would change" : "changed"}</b>${d.needsPerson ? `<span class="meta">· ${d.needsPerson} need a person</span>` : ""}</div>
   ${d.fields.length ? `<div class="tablewrap"><table><thead><tr><th>Table</th><th>Field</th><th>${d.dry ? "Would change" : "Changed"}</th><th>Needs a person</th><th>Examples</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty">Everything is already tidy.</div>`}
   ${d.attention.length ? `<h3 style="margin-top:16px">Needs a person (left as they are)</h3><div class="tablewrap"><table><thead><tr><th>Table</th><th>Field</th><th>Record</th><th>Value</th></tr></thead><tbody>${d.attention.map((a) => `<tr><td>${esc(a.table)}</td><td>${esc(a.field)}</td><td>${esc(a.record)}</td><td>${esc(a.value)}</td></tr>`).join("")}</tbody></table></div>` : ""}
   <div class="row" style="gap:10px;margin-top:14px"><button class="btn ghost" type="button" id="dc-check">Check again</button>${d.dry && d.changed ? `<button class="btn ice" type="button" id="dc-fix">Tidy ${d.changed} value${d.changed === 1 ? "" : "s"}</button>` : ""}<span class="msg" id="dc-msg"></span></div>`;
  $("#dc-check").onclick = () => renderData();
  const fx = $("#dc-fix"); if (fx) fx.onclick = async () => { if (!tap(fx, "change " + d.changed + " value" + (d.changed === 1 ? "" : "s"))) return; fx.disabled = true; $("#dc-msg").textContent = "Working…"; try { renderData(await api("/api/admin/normalize", { method: "POST", body: JSON.stringify({ apply: true }) })); } catch (e) { fx.disabled = false; $("#dc-msg").className = "msg err"; $("#dc-msg").textContent = e.message; } };
}


/* ---------- dashboard: what needs you, today's numbers, what is live, what just happened ---------- */
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const agoShort = (s) => { const t = Date.parse(String(s || "").replace(" ", "T") + (/Z|\+/.test(String(s)) ? "" : "Z")); if (!t) return ""; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " hr ago" : Math.round(m / 1440) + " d ago"; };
const shortDate = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(new Date()));
async function renderDashboard() {
  const main = $("#main"), d = await api("/api/admin/dashboard");
  const a = d.attention, todo = [
    ["pending", a.waitHomes, "house", "waiting for your review"], ["subs", a.waitEvents, "event", "submitted, waiting for review"], ["contests", a.waitContests, "contest", "waiting for approval"],
    ["reports", a.reports, "report", "from visitors this week"], ["installers", a.claims, "installer claim", "to confirm"],
  ].filter((t) => t[1] > 0);
  const tile = (k, n, l) => `<div class="stat"><b>${fmt(n)}</b><span>${l}</span></div>`;
  const kindTab = { home: "pending", event: "subs" };
  main.innerHTML = `
    <p class="hello">${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}. ${todo.length ? "Here is what needs you." : "Nothing is waiting on you."}</p>
    <section aria-label="Needs your attention">${todo.length ? `<div class="todo">${todo.map(([k, n, w, l]) => `<button type="button" class="tcard" data-tab="${k}"><b>${fmt(n)}</b><span>${w}${n === 1 ? "" : "s"} ${l}</span><i aria-hidden="true">›</i></button>`).join("")}</div>` : `<div class="calm"><span aria-hidden="true">✓</span><div><b>All caught up</b><p class="meta" style="margin:2px 0 0">No houses, events, contests or reports are waiting.</p></div></div>`}</section>
    <h2 class="dh">Today</h2>
    <div class="stats">${tile("h", d.today.homes, "new houses")}${tile("e", d.today.events, "events submitted")}${tile("c", d.today.entries, "contest entries")}${tile("l", d.people.litToday, "lights switched on")}</div>
    <h2 class="dh">On the site now</h2>
    <div class="stats">${tile("h", d.live.homes, "published houses")}${tile("e", d.live.events, "map events")}${tile("c", d.live.contests, "contests running")}${tile("i", d.live.installers, "installers")}</div>
    <h2 class="dh">People, last 7 days</h2>
    <div class="stats">${tile("u", d.people.users, "accounts in total")}${tile("n", d.people.newUsers, "new accounts")}${tile("v", d.people.votesWeek, "contest votes")}${tile("p", d.people.hits, "installer profile views")}</div>
    <div class="dcols">
      <section class="dbox"><h2 class="dh">Newest submissions</h2>${d.recent.length ? `<ul class="dl">${d.recent.map((r) => `<li><button type="button" class="dli" data-tab="${r.kind === "event" ? "subs" : r.status === "pending" ? "pending" : "approved"}"><span class="ico" aria-hidden="true">${r.kind === "event" ? "◷" : "⌂"}</span><span class="dt"><b>${esc(r.name)}</b><small>${esc(r.city || "")} · ${r.kind === "event" ? "event" : r.pro ? "installer post" : "house"} · ${agoShort(r.at)}</small></span><span class="tag ${r.status === "pending" ? "exp" : ""}">${esc(r.status)}</span></button></li>`).join("")}</ul>` : `<div class="empty">Nothing submitted yet.</div>`}</section>
      <section class="dbox"><h2 class="dh">Contests running</h2>${d.contests.length ? `<ul class="dl">${d.contests.map((c) => `<li><button type="button" class="dli" data-tab="contests"><span class="ico" aria-hidden="true">★</span><span class="dt"><b>${esc(c.name)}</b><small>${esc(c.city)} · ${fmt(c.entries)} entries · ${fmt(c.votes)} votes · voting ends ${shortDate(c.vote_end)}</small></span></button></li>`).join("")}</ul>` : `<div class="empty">No contest is running right now.</div>`}
      <h2 class="dh">Your recent activity</h2>${d.activity.length ? `<ul class="dl">${d.activity.map((e) => `<li><button type="button" class="dli" data-tab="log"><span class="ico" aria-hidden="true">✎</span><span class="dt"><b>${esc(VERB[e.action] || e.action)} ${esc(AREA[e.area] || e.area)} ${esc(e.label || "")}</b><small>${esc(e.admin || "admin")} · ${agoShort(e.at)}</small></span></button></li>`).join("")}</ul>` : `<div class="empty">Nothing yet. Approvals and edits will show here.</div>`}</section>
    </div>`;
}

/* ---------- reports: "Something wrong? Tell us" from visitors ---------- */
async function renderReports() {
  const main = $("#main"), list = await api("/api/admin/reports");
  setCount("reports", list.length);
  main.innerHTML = list.length ? toolbar({ search: { placeholder: "Search reports" }, count: String(list.length) }) + `<p class="meta" style="margin:0 0 12px">From the "Something wrong? Tell us" link on events and houses. Fix the event or house, then dismiss the report.</p><div class="cards">${list.map((r) => rec({
    attrs: `data-rid="${esc(r.id)}"`, title: esc(r.name || r.ref), tags: [["New", "warn"]], meta: when(r.created_at),
    body: `<p style="margin:0;white-space:pre-line">${esc(r.message)}</p>`, facts: fact("About", `<code>${esc(r.ref)}</code>`) + fact("Reply to", r.contact ? `<a href="mailto:${esc(r.contact)}">${esc(r.contact)}</a>` : "They left no email"),
    edit: btn("ghost", "Open Events", 'data-tab="events"'), danger: btn("danger", "Dismiss", "data-rdismiss"),
  })).join("")}</div>` : `<div class="empty">No reports. Visitors can send one from the "Something wrong? Tell us" link on any event or house.</div>`;
  wireToolbar(main, { onSearch: (q) => filterCards(main, q) }); applyPreset(main);
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-rdismiss]"); if (!b) return;
  if (!tap(b, "dismiss")) return;
  const card = b.closest("[data-rid]"); b.disabled = true;
  try { await api("/api/admin/reports", { method: "POST", body: JSON.stringify({ id: card.dataset.rid, action: "dismiss" }) }); card.remove(); toast("Dismissed"); refreshCounts(); if (!document.querySelector("[data-rid]")) renderReports(); }
  catch (err) { b.disabled = false; card.querySelector(".msg").className = "msg err"; card.querySelector(".msg").textContent = err.message; }
});

// Every edit window closes the same way: the X, Cancel, Escape, or a tap outside it
const closeModal = () => { const m = $("#modal"); if (m && !m.hidden) { const x = m.querySelector("#mClose"); if (x) x.click(); else { m.hidden = true; m.innerHTML = ""; } } };
document.addEventListener("click", (e) => { if (e.target.closest("[data-mcancel]") || e.target === $("#modal")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
