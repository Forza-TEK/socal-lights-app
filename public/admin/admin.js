// SoCal Lights admin: review houses, manage published posts, edit events.
import { CITY } from "/cities.js";
import { SEASONS, defaultSeason } from "/seasons.js";
import { attachAddress } from "/addflow.js?v=20261110c";
import { areaHtml, wireAreas } from "/areapick.js?v=20261102a";
import { renderEmails } from "/admin/emails.js?v=20261104c";
import { renderHelp } from "/admin/help.js?v=20261104a";
import { btn, rec, fact, toolbar, wireToolbar, filterCards, tap, toast, pager, modalFrame } from "/admin/kit.js?v=20261103a";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
let evSeason = defaultSeason(TODAY);
const photo = (k) => "/api/admin/photo/" + k.split("/").map(encodeURIComponent).join("/");
let tab = "dashboard", PVIEW = "pending", EVENTS = [], POSTS = [];
// Address suggestions on every address box in the edit windows (the house street and the event address)
attachAddress($("#modal"), { getCity: () => ($("#pCity") || $("#eCity") || {}).value || "", onPick: (s, inp) => {
  if (inp.id === "pStreet") { inp.value = s.street; if ($("#pCity") && [...$("#pCity").options].some((o) => o.value === s.city)) $("#pCity").value = s.city; if ($("#pZip") && /^\d{5}/.test(s.zip)) $("#pZip").value = s.zip.slice(0, 5); }
  else { inp.value = `${s.street}, ${s.city}, CA ${s.zip}`; if ($("#eCity")) $("#eCity").value = s.city; }
} });

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error("You're not signed in as the admin. Open this page through your Cloudflare Access login.");
  if (!r.ok) { const e = new Error(d.error || "Something went wrong. Try again."); e.status = r.status; e.data = d; throw e; }
  return d;
}

const TABS = ["dashboard", "pending", "subs", "claims", "orders", "contests", "reports", "approved", "events", "installers", "users", "overlaps", "data", "log", "usage", "emails", "help"];
const TITLES = { dashboard: "Dashboard", pending: "Houses waiting", subs: "Submitted events", claims: "Event claims", orders: "Orders", contests: "Contests", reports: "Reports", approved: "Published houses", events: "Events", installers: "Installers", users: "Users", overlaps: "Replaced records", data: "Data check", log: "Activity log", usage: "Cloudflare usage", emails: "Email templates", help: "Help Center" };
const setCount = (k, v) => { COUNTS[k] = v; document.querySelectorAll(`[data-count="${k}"]`).forEach((el) => { el.textContent = v; el.hidden = !v && el.dataset.hide0 === "1"; }); paintTitle(); };
const COUNTS = {};
// The browser tab shows how many things are waiting, so a pinned admin tab can be glanced at
function paintTitle() { const w = (COUNTS.pending || 0) + (COUNTS.subs || 0) + (COUNTS.claims || 0) + (COUNTS.orders || 0) + (COUNTS.contests || 0) + (COUNTS.reports || 0); document.title = (w ? `(${w}) ` : "") + "SoCal Lights Admin"; }
function setTab(t, push = true) {
  if (t !== tab) PVIEW = "pending";
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
    if (tab === "claims") return renderClaims();
    if (tab === "orders") return renderOrders();
    if (tab === "contests") return renderContests();
    if (tab === "overlaps") return renderOverlaps();
    if (tab === "installers") return renderInstallers();
    if (tab === "data") return renderData();
    if (tab === "users") return renderUsers();
    if (tab === "log") return renderLog();
    if (tab === "usage") return renderUsage();
    if (tab === "emails") return renderEmails(main);
    if (tab === "help") return renderHelp(main);
    const waiting = await api("/api/admin/posts?status=" + tab), declined = tab === "pending" ? await api("/api/admin/posts?status=declined") : [];
    if (tab === "pending") setCount("pending", waiting.length);
    const showing = tab === "pending" && PVIEW === "declined" ? declined : waiting;
    const bar = toolbar({ views: tab === "pending" ? [{ k: "pending", label: "Waiting", n: waiting.length }, { k: "declined", label: "Declined", n: declined.length }] : [], active: PVIEW, search: { placeholder: "Search houses, people, cities" }, right: dl("houses" + (tab === "pending" ? (PVIEW === "declined" ? "&status=declined" : "&status=pending") : "&status=approved")), count: String(showing.length) });
    const go = () => { wireToolbar(main, { onView: (v) => { PVIEW = v; render(); }, onSearch: (q) => filterCards(main, q) }); applyPreset(main); };
    if (!showing.length) { main.innerHTML = bar + `<div class="empty">${tab !== "pending" ? "No published houses yet." : PVIEW === "declined" ? "Nothing declined." : "Nothing waiting for review."}</div>`; go(); return; }
    const bulk = tab === "pending" && PVIEW !== "declined" ? `<div class="bulk" id="bulk"><label class="chk"><input type="checkbox" id="selAll"> Select all</label><span class="grow"></span><span class="meta" id="selN"></span><button class="btn ice" type="button" id="bulkGo" hidden></button><button class="btn ghost" type="button" id="bulkClear" hidden>Clear</button></div>` : "";
    POSTS = showing; main.innerHTML = bar + bulk + `<div class="cards">${showing.map(postCard).join("")}</div>`; go(); if (bulk) wireBulk(main);
  } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function postCard(p) {
  const web = p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(p.web)}</a>` : "";
  const note = (c, t) => `<p class="meta" style="margin:0;color:var(--ink)">${t}</p>`;
  const pending = tab === "pending", dec = pending && PVIEW === "declined";
  return rec({
    attrs: `data-id="${esc(p.id)}"`, title: (pending && !dec ? `<input type="checkbox" class="rsel" data-sel="${esc(p.id)}" aria-label="Select ${esc(p.title)}">` : "") + esc(p.title), tags: [[p.kind === "installer" ? "Installer" : "Homeowner"], [dec ? "Declined" : pending ? "Waiting" : "Published", dec ? "bad" : pending ? "warn" : "ok"]], meta: esc((p.created || "").slice(0, 16)) + " UTC",
    lead: p.photos.length ? `<div class="pics">${p.photos.map((k) => `<a href="${photo(k)}" target="_blank" rel="noopener"><img src="${photo(k)}" alt="" loading="lazy"></a>`).join("")}</div>` : `<div class="meta">No photos</div>`,
    facts: fact("Name / business", esc(p.biz)) + fact("City", esc(p.city) + " · " + esc(p.county || "")) + fact("Contact", `<span style="user-select:all">${esc(p.contact_email || "—")}</span>`) + fact("Website", web || "—")
      + (p.inst && p.kind !== "installer" ? fact("Installed by", esc(p.inst.name) + (p.inst.ok ? " (confirmed)" : " (claimed by the homeowner, not confirmed)")) : "") + fact("Public phone", esc(p.phone || "—")) + fact("Street address", esc(p.address || "—") + ' <span class="meta">(shown on the map)</span>') + fact("Where", esc(p.where || "—")) + fact("About", `<span style="white-space:pre-line">${esc(p.desc)}</span>`),
    body: (p.hiddenBySweep ? note(0, "<b>Not on the map.</b> You chose the sweep record for this address (Replaced records).") : "") + (p.claimed ? note(0, `<b>Says this is their home.</b> They tapped “Is this your home?” on “${esc(p.claimed.name)}”. ${p.claimed.matched ? (p.status === "pending" ? "The address matches, so approving replaces that listing." : "The address matches, so it replaces that listing on the map.") : "The addresses do not match, so it does not replace that listing. Check the street in Edit."}`) : "") + (p.replaces ? note(0, `<b>Replaces a sweep record.</b> When you approve this, the automatic listing at the same address is hidden: ${p.replaces.map((r) => esc(r.name)).join("; ")}.`) : "") + (p.nearby ? `<p class="meta" style="margin:0">Same street, different number (both stay listed): ${p.nearby.map((r) => esc(r.name + " (" + (r.address || "").split(",")[0] + ")")).join("; ")}.</p>` : ""),
    edit: btn("ghost", "Edit", `data-editpost="${esc(p.id)}"`) + btn("ghost", `Photos (${p.photos.length})`, `data-editpost="${esc(p.id)}" data-focus="photos"`),
    main: dec ? btn("main", "Restore to waiting", 'data-act="restore"') : pending ? btn("main", "Approve and publish", 'data-act="approve"') : btn("ghost", "Unpublish", 'data-act="unpublish"'),
    danger: dec ? btn("danger", "Delete", 'data-act="delete"') : pending ? btn("danger", "Decline", 'data-act="decline"') : btn("danger", "Remove from site", 'data-act="delete"'),
  });
}
// Pick several waiting houses and approve them in one go
function wireBulk(main) {
  const boxes = () => [...main.querySelectorAll(".rec:not([hidden]) .rsel")], picked = () => boxes().filter((b) => b.checked);
  const paint = () => { const n = picked().length; $("#selN").textContent = n ? `${n} selected` : ""; $("#bulkGo").hidden = !n; $("#bulkClear").hidden = !n; $("#bulkGo").textContent = `Approve ${n} house${n === 1 ? "" : "s"}`; $("#selAll").checked = n > 0 && n === boxes().length; };
  main.addEventListener("change", (e) => { if (e.target.matches(".rsel")) paint(); });
  $("#selAll").onchange = (e) => { boxes().forEach((b) => (b.checked = e.target.checked)); paint(); };
  $("#bulkClear").onclick = () => { boxes().forEach((b) => (b.checked = false)); paint(); };
  $("#bulkGo").onclick = async (e) => {
    const ids = picked().map((b) => b.dataset.sel); if (!ids.length) return; const btn = e.target;
    if (!tap(btn, `approve ${ids.length}`)) return;
    btn.disabled = true; let done = 0, failed = 0;
    for (const id of ids) { btn.textContent = `Approving ${done + failed + 1} of ${ids.length}…`; try { await api("/api/admin/posts/" + id, { method: "POST", body: JSON.stringify({ action: "approve" }) }); done++; } catch { failed++; } }
    toast(failed ? `Published ${done}, ${failed} could not be published` : `Published ${done} house${done === 1 ? "" : "s"}`, !!failed); render(); refreshCounts();
  };
  paint();
}
const DONE = { approve: "Published", decline: "Declined", unpublish: "Unpublished", delete: "Removed", restore: "Back in the waiting list" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const card = b.closest("[data-id]"), id = card.dataset.id, act = b.dataset.act, msg = card.querySelector(".msg"), name = card.querySelector("h3").textContent, extra = {};
  if (act === "decline") { const r = await askReason({ title: "Decline " + name, hint: "This is emailed to the person who added it. Leave it blank to send no reason." }); if (r === null) return; extra.reason = r; }
  else if ((act === "delete" || act === "unpublish") && !tap(b, act === "delete" ? "remove" : act)) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = act === "approve" ? "Publishing…" : "Working…";
  try {
    if (act === "delete") await api("/api/admin/posts/" + id, { method: "DELETE" });
    else await api("/api/admin/posts/" + id, { method: "POST", body: JSON.stringify({ action: act, ...extra }) });
    card.remove(); refreshCounts(); if (!document.querySelector(".rec")) render();
    const undo = act === "decline" ? { action: "restore" } : act === "unpublish" ? { action: "approve", notify: false } : null;
    toast(DONE[act] || "Done", false, undo ? { undo: async () => { try { await api("/api/admin/posts/" + id, { method: "POST", body: JSON.stringify(undo) }); toast("Undone"); render(); refreshCounts(); } catch (er) { toast(er.message, true); } } } : {});
  } catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

// An in-page window that asks for an optional reason (emailed to the person). Resolves to the text, or null when cancelled.
function askReason({ title, hint, go = "Decline" }) {
  return new Promise((done) => {
    const m = $("#modal"); m.hidden = false;
    m.innerHTML = modalFrame(title, `<form class="f" id="rsForm" novalidate>${fsec("Reason", "", ff("rs-t", "Why? (optional)", `<textarea id="rs-t" rows="3" maxlength="400" placeholder="For example: the photo is too dark to see the lights"></textarea>`, { hint: hint || "This is emailed to them. Leave it blank to send no reason." }))}<div class="mfoot"><button class="btn danger-solid" type="submit">${esc(go)}</button><button class="btn ghost" type="button" data-mcancel>Cancel</button></div></form>`);
    const end = (v) => { m.hidden = true; m.innerHTML = ""; done(v); };
    $("#mClose").onclick = () => end(null); m.querySelector("[data-mcancel]").addEventListener("click", () => end(null), { once: true });
    $("#rsForm").onsubmit = (e) => { e.preventDefault(); end($("#rs-t").value.trim()); }; $("#rs-t").focus();
  });
}
// A "Download CSV" link for a list (spreadsheet)
const dl = (q, label = "Download CSV") => `<a class="btn ghost" href="/api/admin/export?type=${q}" download>${label}</a>`;
// Edit-form building blocks: sections with a heading, fields on a 6-column grid (c2 c3 c4 c6 = how many columns wide)
const fsec = (title, desc, inner, o = {}) => `<fieldset class="fsec"${o.id ? ` id="${o.id}"` : ""}${o.hide ? " hidden" : ""}><legend>${title}</legend>${desc ? `<p class="fdesc">${desc}</p>` : ""}<div class="fgrid">${inner}</div></fieldset>`;
const ff = (id, label, control, o = {}) => `<div class="ff ${o.c || "c6"}"${o.id ? ` id="${o.id}"` : ""}${o.hide ? " hidden" : ""}><label for="${id}">${label}</label>${control}${o.hint ? `<small class="fhint">${o.hint}</small>` : ""}</div>`;
const AREAS_HINT = "The cities or counties this company works in, such as Orange County and Los Angeles.";
// Resize a photo in the browser before uploading (long side 1800px, JPEG), like the add forms do
async function shrink(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 700 * 1024) return f;
  try { const bmp = await createImageBitmap(f), k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); const b = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85)); return b ? new File([b], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f; } catch { return f; }
}
function editPost(p, startTab = "details") {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.innerHTML = `<div class="card wide" role="dialog" aria-modal="true"><div class="mh"><h2>Edit house</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="seg" id="pTabs" role="group" aria-label="Show" style="margin-bottom:14px"><button type="button" data-ptab="details" aria-pressed="true">Details</button><button type="button" data-ptab="photos" aria-pressed="false">Photos <span id="pPhotosN"></span></button></div>
  <div id="pPhotos" hidden></div>
  <form class="f" id="pForm" novalidate>
    ${fsec("Listing", "", ff("pKindSeg", "Posting as", `<div class="seg" id="pKindSeg" role="group" aria-label="Posting as"><button type="button" data-kind="homeowner" aria-pressed="${p.kind !== "installer"}">Homeowner</button><button type="button" data-kind="installer" aria-pressed="${p.kind === "installer"}">Professional installer</button></div><input type="hidden" id="pKind" value="${p.kind === "installer" ? "installer" : "homeowner"}">`)
      + ff("pBiz", p.kind === "installer" ? "Business name" : "Name shown as Posted by", `<input id="pBiz" value="${esc(p.biz)}" maxlength="80">`, { c: "c3", hint: p.kind === "installer" ? "Families see this with a way to ask for a quote." : "For example, The Garcia family." }) + ff("pTitle", "Listing title", `<input id="pTitle" value="${esc(p.title)}" maxlength="90">`, { c: "c3", hint: "The name shown on the map card." }))}
    ${fsec("Address", "Saving a new address moves the pin on the map.", ff("pStreet", "Street address", `<input id="pStreet" data-addr autocomplete="off" value="${esc(p.street || (p.address || "").split(",")[0])}" maxlength="120" placeholder="123 Main St">`)
      + ff("pCity", "City", `<select id="pCity">${Object.keys(CITY).sort().map((c) => `<option ${c === p.city ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>`, { c: "c4" }) + ff("pZip", "ZIP", `<input id="pZip" value="${esc(p.zip || "")}" inputmode="numeric" maxlength="5" placeholder="92630">`, { c: "c2" }))}
    ${fsec("How people reach them", "Shown on the public page so families can ask for a quote.", ff("pPhone", "Phone", `<input id="pPhone" type="tel" value="${esc(p.phone || "")}" maxlength="80">`, { c: "c3" }) + ff("pWeb", "Website", `<input id="pWeb" type="url" value="${esc(p.web || "")}" maxlength="200" placeholder="https://">`, { c: "c3" })
      + ff("pArea", "Areas served", areaHtml({ id: "pArea", value: p.area }), { hint: AREAS_HINT }), { id: "pProSec", hide: p.kind !== "installer" })}
    ${fsec("About", "", ff("pSeason", "Season", `<select id="pSeason">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === (p.season || "christmas") ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>`, { c: "c3" })
      + ff("pDesc", "Description", `<textarea id="pDesc" maxlength="1200" rows="4">${esc(p.desc)}</textarea>`, { hint: "Shown on the listing." }))}
    <div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="pMsg" role="status"></span></div>
  </form></div>`;
  m.hidden = false; $("#mClose").onclick = () => { close(); if (photosChanged) render(); };
  let photosChanged = false;
  let cur = 0;
  const showTab = (t) => { $("#pForm").hidden = t !== "details"; $("#pPhotos").hidden = t !== "photos"; $("#pTabs").querySelectorAll("[data-ptab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ptab === t))); };
  $("#pTabs").onclick = (ev) => { const b = ev.target.closest("[data-ptab]"); if (b) showTab(b.dataset.ptab); };
  const paint = () => {
    const n = p.photos.length; cur = Math.max(0, Math.min(cur, n - 1));
    $("#pPhotosN").textContent = `(${n})`;
    const k = p.photos[cur];
    $("#pPhotos").innerHTML = `${n ? `<div class="pview"><img src="${photo(k)}" alt="Photo ${cur + 1} of ${n}">${cur === 0 ? '<span class="cover">Cover</span>' : ""}<button type="button" class="pnav prev" data-pgo="-1" aria-label="Previous photo" ${n < 2 ? "hidden" : ""}>‹</button><button type="button" class="pnav next" data-pgo="1" aria-label="Next photo" ${n < 2 ? "hidden" : ""}>›</button><span class="pcount">${cur + 1} of ${n}</span></div>
      <div class="pstrip" role="group" aria-label="All photos">${p.photos.map((x, i) => `<button type="button" data-pat="${i}" aria-pressed="${i === cur}" aria-label="Show photo ${i + 1}"><img src="${photo(x)}" alt=""></button>`).join("")}</div>
      <div class="pact">${cur > 0 ? `<button type="button" class="btn ghost" data-pmv="${esc(k)}" data-to="0">Make cover</button><button type="button" class="btn ghost" data-pmv="${esc(k)}" data-to="${cur - 1}">Move earlier</button>` : ""}${cur < n - 1 ? `<button type="button" class="btn ghost" data-pmv="${esc(k)}" data-to="${cur + 1}">Move later</button>` : ""}<span class="sp"></span><button type="button" class="btn ghost danger" data-prm="${esc(k)}">Remove photo</button></div>` : '<p class="meta" style="margin:0 0 10px">No photos yet.</p>'}
      <div class="mfoot" style="margin-top:10px"><label class="btn ice" style="cursor:pointer;margin:0"><input id="pAdd" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden ${n >= 8 ? "disabled" : ""}>Add photos</label><span class="meta">Up to 8. The first photo is the cover. JPG, PNG or WebP.</span><span class="msg" id="pPhMsg" role="status"></span></div>`;
    $("#pAdd").onchange = async (ev) => {
      const files = [...ev.target.files]; ev.target.value = ""; if (!files.length) return;
      const msg = $("#pPhMsg"); msg.className = "msg"; msg.textContent = "Uploading…";
      try { const fd = new FormData(); for (const f of files) fd.append("photos", await shrink(f)); const r = await fetch("/api/admin/posts/" + p.id, { method: "POST", body: fd, credentials: "same-origin" }), d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "The upload didn't work."); cur = p.photos.length; p.photos = d.photos; photosChanged = true; toast(files.length === 1 ? "Photo added" : "Photos added"); paint(); }
      catch (er) { msg.className = "msg err"; msg.textContent = er.message; }
    };
  };
  $("#pPhotos").onclick = async (ev) => {
    const go = ev.target.closest("[data-pgo]"), at = ev.target.closest("[data-pat]");
    if (go) { cur = (cur + Number(go.dataset.pgo) + p.photos.length) % p.photos.length; return paint(); }
    if (at) { cur = Number(at.dataset.pat); return paint(); }
    const mv = ev.target.closest("[data-pmv]"), rm = ev.target.closest("[data-prm]"); if (!mv && !rm) return;
    if (rm && !tap(rm, "remove")) return;
    try { const d = await api("/api/admin/posts/" + p.id, { method: "POST", body: JSON.stringify(mv ? { action: "photo_move", key: mv.dataset.pmv, to: Number(mv.dataset.to) } : { action: "photo_remove", key: rm.dataset.prm }) }); if (mv) cur = Number(mv.dataset.to); p.photos = d.photos; photosChanged = true; toast(rm ? "Photo removed" : "Photo moved"); paint(); }
    catch (er) { toast(er.message, true); }
  };
  // Left and right arrow keys browse the photos
  photoKey = (ev) => { if (m.hidden) { photoKey = null; return; } if (!$("#pPhotos").hidden && p.photos.length > 1 && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) { cur = (cur + (ev.key === "ArrowRight" ? 1 : -1) + p.photos.length) % p.photos.length; paint(); } };
  $("#pKindSeg").onclick = (ev) => {
    const b = ev.target.closest("[data-kind]"); if (!b) return; const pro = b.dataset.kind === "installer";
    $("#pKind").value = b.dataset.kind; $("#pKindSeg").querySelectorAll("[data-kind]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("#pProSec").hidden = !pro; const lb = $("#pBiz").closest(".ff"); lb.querySelector("label").textContent = pro ? "Business name" : "Name shown as Posted by"; lb.querySelector(".fhint").textContent = pro ? "Families see this with a way to ask for a quote." : "For example, The Garcia family.";
  };
  wireAreas(m);
  paint(); showTab(startTab);
  $("#pForm").onsubmit = async (x) => {
    x.preventDefault(); const msg = $("#pMsg"); msg.className = "msg"; msg.textContent = "Saving…";
    const body = { action: "edit", biz: $("#pBiz").value, title: $("#pTitle").value, city: $("#pCity").value, season: $("#pSeason").value, kind: $("#pKind").value, street: $("#pStreet").value, zip: $("#pZip").value, desc: $("#pDesc").value };
    // Phone, website and areas served belong to installers only; a homeowner listing leaves them as they are
    if ($("#pKind").value === "installer") Object.assign(body, { area: $("#pArea").value, web: $("#pWeb").value, phone: $("#pPhone").value });
    try { await api("/api/admin/posts/" + p.id, { method: "POST", body: JSON.stringify(body) }); close(); render(); }
    catch (err) { msg.className = "msg err"; msg.textContent = err.message; }
  };
}
$("#main").addEventListener("click", (e) => { const b = e.target.closest("[data-editpost]"); if (b) editPost(POSTS.find((x) => x.id === b.dataset.editpost), b.dataset.focus === "photos" ? "photos" : "details"); });


/* ---------- submitted events (public "Add your event" form) ---------- */
let SUBS = [], SUBVIEW = "pending";
async function renderSubs() {
  const main = $("#main");
  const [waiting, live, declined] = await Promise.all([api("/api/admin/submissions?status=pending"), api("/api/admin/submissions?status=published"), api("/api/admin/submissions?status=declined")]);
  SUBS = SUBVIEW === "pending" ? waiting : SUBVIEW === "declined" ? declined : live;
  setCount("subs", waiting.length);
  const bar = toolbar({ views: [{ k: "pending", label: "Waiting", n: waiting.length }, { k: "published", label: "Live", n: live.length }, { k: "declined", label: "Declined", n: declined.length }], active: SUBVIEW, search: { placeholder: "Search events, cities" }, count: String(SUBS.length) });
  const go = () => { wireToolbar(main, { onView: (v) => { SUBVIEW = v; renderSubs(); }, onSearch: (q) => filterCards(main, q) }); applyPreset(main); };
  if (!SUBS.length) { main.innerHTML = bar + `<div class="empty">${SUBVIEW === "pending" ? "Nothing waiting. New events go live right away; look under Live to review or unpublish them." : SUBVIEW === "declined" ? "Nothing declined." : "No submitted events are live."}</div>`; go(); return; }
  const pend = SUBVIEW === "pending";
  main.innerHTML = bar + `<div class="cards">${SUBS.map((x) => rec({
    attrs: `data-sid="${esc(x.id)}"`, title: esc(x.name), tags: [[pend ? "Waiting" : SUBVIEW === "declined" ? "Declined" : "Published", pend ? "warn" : SUBVIEW === "declined" ? "bad" : "ok"]], meta: esc((x.created_at || "").slice(0, 16)) + " UTC",
    facts: fact("When", esc(x.start_date) + (x.end_date !== x.start_date ? " to " + esc(x.end_date) : "") + " · " + esc(x.hours || "no hours")) + fact("Where", `${esc(x.venue)}<br><span class="meta">${esc(x.address)}, ${esc(x.city)} · ${esc(x.county || "")} (pin ${Number(x.lat).toFixed(4)}, ${Number(x.lng).toFixed(4)})</span>`)
      + fact("Type", `${esc(SEASONS[x.season] ? SEASONS[x.season].label : x.season)} · ${esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)} · ${esc(x.price || "")}`) + fact("About", esc(x.blurb)) + fact("Event page", x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>` : "")
      + fact("Contact", `<span style="user-select:all">${esc(x.contact_email)}</span>`) + fact("Notes", esc(x.note || "")) + (x.paid_plans ? fact("Paid Featured", `<b>${esc(x.paid_plans)}</b>`) : ""),
    edit: pend ? btn("ghost", "Edit", `data-sedit="${esc(x.id)}"`) : "",
    main: SUBVIEW === "declined" ? btn("main", "Restore to waiting", 'data-sact="restore"') : pend ? btn("main", "Publish (confirmed)", 'data-sact="approve" data-st="confirmed"') + btn("ghost", "Publish (expected)", 'data-sact="approve" data-st="expected"') : btn("ghost", "Unpublish", 'data-sact="unpublish"'),
    danger: pend ? btn("danger", "Decline", 'data-sact="decline"') : "",
  })).join("")}</div>`;
  go();
}
let photoKey = null;
document.addEventListener("keydown", (e) => photoKey && photoKey(e));
// A small edit window for records with a few plain fields (submitted events, waiting contests)
function editSimple({ title, fields, values, save }) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.hidden = false;
  const fld = (f) => ff("es-" + f.k, f.label, f.area ? `<textarea id="es-${f.k}" rows="3" maxlength="${f.max || 600}">${esc(values[f.k] || "")}</textarea>` : `<input id="es-${f.k}" type="${f.type || "text"}" maxlength="${f.max || 120}" value="${esc(values[f.k] || "")}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ""}>`, { c: f.wide ? "c6" : "c3" });
  m.innerHTML = modalFrame(title, `<form class="f" id="esForm" novalidate>${fsec("Details", "", fields.map(fld).join(""))}<div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="esMsg" role="status"></span></div></form>`, true);
  $("#mClose").onclick = close;
  $("#esForm").onsubmit = async (e) => { e.preventDefault(); const body = {}; fields.forEach((f) => (body[f.k] = $("#es-" + f.k).value)); try { await save(body); close(); toast("Saved"); } catch (er) { const x = $("#esMsg"); x.className = "msg err"; x.textContent = er.message; } };
}
const SUBF = [{ k: "name", label: "Event name", wide: true }, { k: "venue", label: "Venue" }, { k: "address", label: "Address" }, { k: "city", label: "City" }, { k: "start_date", label: "Starts (YYYY-MM-DD)", max: 10 }, { k: "end_date", label: "Ends (YYYY-MM-DD)", max: 10 }, { k: "hours", label: "Hours" }, { k: "price", label: "Price" }, { k: "url", label: "Event page", type: "url", max: 300, wide: true }, { k: "contact_email", label: "Contact email", type: "email" }, { k: "blurb", label: "About", area: true, wide: true }];
const CONF = [{ k: "name", label: "Contest name", wide: true }, { k: "org", label: "Run by" }, { k: "city", label: "City" }, { k: "contact_email", label: "Organizer email", type: "email" }, { k: "site", label: "Website", type: "url", max: 200 }, { k: "entries_close", label: "Entries close (YYYY-MM-DD)", max: 10 }, { k: "vote_start", label: "Voting starts", max: 10 }, { k: "vote_end", label: "Voting ends", max: 10 }, { k: "descr", label: "Welcome message", area: true, wide: true, max: 1000 }];
$("#main").addEventListener("click", (e) => {
  const sb = e.target.closest("[data-sedit]"); if (sb) return editSubmission(SUBS.find((r) => r.id === sb.dataset.sedit));
  const cb = e.target.closest("[data-cedit]"); if (cb) { const x = CONTESTS.find((r) => r.id === cb.dataset.cedit); return editSimple({ title: "Edit contest", fields: CONF, values: { ...x, contact_email: x.contact_email || x.owner_email }, save: async (b) => { await api("/api/admin/contests/" + x.id, { method: "POST", body: JSON.stringify({ action: "edit", ...b }) }); renderContests(); } }); }
});
const editSubmission = (x) => editSimple({ title: "Edit event", fields: SUBF, values: x, save: async (b) => { await api("/api/admin/submissions/" + x.id, { method: "POST", body: JSON.stringify({ action: "edit", ...b }) }); if (tab === "subs") renderSubs(); else if (tab === "dashboard") renderDashboard(); } });
// A row on the dashboard goes to that record: the right tab, already narrowed to it, so its card (with every action) is the first thing you see
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-recent]"); if (!b) return;
  try {
    PRESET = b.dataset.name;
    if (b.dataset.recent === "home") return setTab(b.dataset.st === "pending" ? "pending" : "approved");
    if (b.dataset.st === "published" && b.dataset.eid) {
      const all = await (await fetch("/api/admin/events", { cache: "no-store" })).json(), ev = all.find((r) => r.id === b.dataset.eid);
      if (ev) { evSeason = ev.sn || "christmas"; EVQ = b.dataset.name; PRESET = ""; return setTab("events"); }
    }
    SUBVIEW = b.dataset.st === "published" ? "published" : b.dataset.st === "pending" ? "pending" : "published"; setTab("subs");
  } catch (er) { toast(er.message, true); }
});
const SDONE = { approve: "Published", decline: "Declined. If they paid for Featured, refund it under Orders.", unpublish: "Unpublished", restore: "Back in the waiting list" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-sact]"); if (!b) return;
  const card = b.closest("[data-sid]"), msg = card.querySelector(".msg"), act = b.dataset.sact, id = card.dataset.sid, name = card.querySelector("h3").textContent, x = SUBS.find((r) => r.id === id) || {}, extra = {};
  if (act === "decline") { const r = await askReason({ title: "Decline " + name, hint: x.paid_plans ? `They already paid for Featured (${x.paid_plans}). After you decline, refund it in the Stripe dashboard (it is listed under Orders as refund due), then mark it refunded. This note is emailed to them.` : "This is emailed to the person who added it. Leave it blank to send no reason." }); if (r === null) return; extra.reason = r; }
  else if (act === "unpublish" && !tap(b, "unpublish")) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try {
    const post = (more = {}) => api("/api/admin/submissions/" + id, { method: "POST", body: JSON.stringify({ action: act, status: b.dataset.st, ...extra, ...more }) });
    try { await post(); } catch (er) { if (er.status === 409 && er.data && er.data.code === "paid_placement" && confirm(er.message)) await post({ confirm: true }); else throw er; } // a paid placement needs an explicit yes
    const undo = act === "decline" ? { action: "restore" } : act === "unpublish" ? { action: "approve", status: x.verified ? "confirmed" : "expected", notify: false } : null;
    toast(SDONE[act] || "Done", false, undo ? { undo: async () => { try { await api("/api/admin/submissions/" + id, { method: "POST", body: JSON.stringify(undo) }); toast("Undone"); renderSubs(); refreshCounts(); } catch (er) { toast(er.message, true); } } } : {});
    renderSubs(); refreshCounts();
  } catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

/* ---------- event claims ("this event is mine": approving lets them buy Featured for it, nothing else) ---------- */
let CLVIEW = "pending";
async function renderClaims() {
  const main = $("#main"), [pend, ok, no] = await Promise.all(["pending", "approved", "declined"].map((s) => api("/api/admin/claims?status=" + s)));
  const rows = CLVIEW === "pending" ? pend : CLVIEW === "declined" ? no : ok;
  setCount("claims", pend.length);
  const bar = toolbar({ views: [{ k: "pending", label: "Waiting", n: pend.length }, { k: "approved", label: "Approved", n: ok.length }, { k: "declined", label: "Declined", n: no.length }], active: CLVIEW, count: String(rows.length) });
  const go = () => wireToolbar(main, { onView: (v) => { CLVIEW = v; renderClaims(); }, onSearch: () => {} });
  if (!rows.length) { main.innerHTML = bar + `<div class="empty">${CLVIEW === "pending" ? "No claims waiting. A claim only lets the person buy Featured for that event; it gives no edit rights. When you approve or decline one, the person is emailed once." : "Nothing here."}</div>`; go(); return; }
  main.innerHTML = bar + `<div class="cards">${rows.map((x) => rec({
    attrs: `data-clid="${esc(x.id)}"`, title: esc(x.name || x.event_id), tags: [[x.status === "pending" ? "Waiting" : x.status === "approved" ? "Approved" : "Declined", x.status === "pending" ? "warn" : x.status === "approved" ? "ok" : "bad"]], meta: esc((x.created_at || "").slice(0, 16)) + " UTC",
    facts: fact("Claimed by", `<span style="user-select:all">${esc(x.claimant)}</span>`) + fact("Event page", x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>` : "None") + fact("Where", esc(x.city || "")) + (x.method ? fact("Approved by", esc(x.method)) : ""),
    edit: "", main: x.status !== "approved" ? btn("main", "Approve", 'data-clact="approve"') : "", danger: x.status !== "declined" ? btn("danger", "Decline", 'data-clact="decline"') : "",
  })).join("")}</div>`;
  go();
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-clact]"); if (!b) return;
  const card = b.closest("[data-clid]"); b.disabled = true;
  try { const r = await api("/api/admin/claims/" + card.dataset.clid, { method: "POST", body: JSON.stringify({ action: b.dataset.clact }) }); toast((b.dataset.clact === "approve" ? "Approved" : "Declined") + (r && r.emailed ? " and emailed" : " (no email sent)")); renderClaims(); refreshCounts(); } catch (er) { b.disabled = false; toast(er.message, true); }
});

/* ---------- Featured orders: money that needs the owner (refunds to make, disputes, placements that did not apply) ---------- */
let OVIEW = "attention";
const OFLAG = { refund_due: ["Refund due", "bad"], disputed: ["Disputed", "bad"], held: ["Partial refund", "warn"], unapplied: ["Not applied", "bad"], differs: ["Placement differs", "warn"], mismatch: ["Amount differs", "warn"], note: ["See note", "warn"], cancelled: ["Event cancelled", "warn"] };
// Event plans (current: ev_*; old: pin, top, season stay for orders already paid) and what each contains. Installer plans have their own names (INST_PLAN).
const PLAN_NAME = { ev_pin: "Featured pin", ev_banner: "Banner + Featured pin", ev_top: "Top of the list + Featured pin", ev_all: "Top of the list + Banner + Featured pin", pin: "Featured pin (old plan)", top: "Top of the list (old plan)", season: "Full run (old plan)" };
const PLAN_PARTS = { ev_pin: "pin", ev_banner: "pin + banner", ev_top: "pin + top of the list", ev_all: "pin + banner + top of the list", pin: "pin", top: "pin + top of the list", season: "pin + top of the list" };
const INST_PLAN = { banner: "Banner", top: "Top of the list", banner_top: "Banner and top of the list" };
const OSTATUS = { paid: ["Paid", "ok"], refunded: ["Refunded", ""], disputed: ["Disputed", "bad"], dispute_won: ["Dispute won", ""], held: ["Held", "warn"], refund_due: ["Refund due", "bad"] };
const money = (c, cur) => (c == null ? "" : (cur && cur !== "usd" ? cur.toUpperCase() + " " : "$") + (c / 100).toFixed(2));
async function renderOrders() {
  const main = $("#main"), all = await api("/api/admin/orders"), rn = await api("/api/admin/renewals").catch(() => null);
  const RG = { upcoming: ["Upcoming", "ok"], failed: ["Charge failed", "bad"], overdue: ["Overdue: run the job", "bad"], lapsed: ["Lapsed", "bad"], paused: ["Paused", "warn"], cancelled: ["Cancelled", ""] };
  const renHtml = rn && rn.rows.length ? `<h2 class="dh">Automatic renewals (read-only): ${rn.counts.upcoming} upcoming, ${rn.counts.overdue} overdue, ${rn.counts.failed} failed, ${rn.counts.lapsed} lapsed, ${rn.counts.paused} paused</h2><div class="cards">${rn.rows.map((r) => rec({ attrs: "", title: esc(r.name || r.installer_id), tags: [RG[r.group] || [r.group, ""]], meta: esc(INST_PLAN[r.plan] || "Banner") + " · " + esc(money(r.price_cents)), facts: fact("Next charge", esc(r.next_charge_date || "")) + fact("Reminder sent", r.notice_sent_for ? "yes" : "not yet") + fact("Retry", esc(r.retry_at || "")) + fact("Last error", esc(r.last_error || "")) + fact("Agreed", esc((r.consent_at || "") + (r.consent_text_version ? " · wording " + r.consent_text_version : ""))) })).join("")}</div>` : "";
  const need = all.filter((o) => o.flags.length), rows = OVIEW === "attention" ? need : OVIEW === "paid" ? all.filter((o) => o.status === "paid") : OVIEW === "closed" ? all.filter((o) => o.status !== "paid") : all;
  setCount("orders", need.length);
  const bar = toolbar({ views: [{ k: "attention", label: "Needs attention", n: need.length }, { k: "paid", label: "Paid", n: all.filter((o) => o.status === "paid").length }, { k: "closed", label: "Refunded and disputed", n: all.filter((o) => o.status !== "paid").length }, { k: "all", label: "All", n: all.length }], active: OVIEW, search: { placeholder: "Search events, emails" }, count: String(rows.length) });
  const go = () => wireToolbar(main, { onView: (v) => { OVIEW = v; renderOrders(); }, onSearch: (q) => filterCards(main, q) });
  if (!rows.length) { main.innerHTML = bar + renHtml + `<div class="empty">${OVIEW === "attention" ? "Nothing needs you. Refunds you still have to make, disputes, partial refunds and placements that did not switch on show up here." : "No orders here yet."}</div>`; go(); return; }
  main.innerHTML = bar + renHtml + `<div class="cards">${rows.map((o) => {
    const st = OSTATUS[o.status] || [o.status, ""], due = ["refund_due", "held", "disputed"].includes(o.status);
    return rec({
      attrs: `data-oid="${esc(o.session_id)}" data-onote="${esc(o.note || "")}"`, title: esc(o.target === "contest_pass" ? orgLabelOf(o.event_id) : o.name || o.event_id), tags: [st, ...(o.target === "contest_pass" ? [["Contest pass", ""]] : o.target === "home" ? [["Featured home", ""]] : o.target === "installer" ? [["Installer: " + (INST_PLAN[o.plan] || o.plan).toLowerCase(), ""], ...(o.renewal ? [["Auto-renewal", ""]] : [])] : []), ...o.flags.filter((f) => !(f === "refund_due" || f === "disputed" || f === "held")).map((f) => OFLAG[f] || [f, "warn"])], meta: esc((o.created_at || "").slice(0, 16)) + " UTC",
      facts: o.target === "contest_pass" ? fact("Organization", `${esc(orgLabelOf(o.event_id))} · <a href="/admin/#contests">Contest passes</a>`) + fact("Pass", `Up to ${esc(o.pass_cap)} contests · <b>${esc(money(o.amount, o.currency))}</b> <span class="meta">(${esc(o.pass_status || "not applied")})</span>`) + fact("Window", o.pass_from ? `${esc(pdate(o.pass_from))} to ${esc(pdate(o.pass_to))}` : "") + fact("Payment", o.stripe_url ? `<a href="${esc(o.stripe_url)}" target="_blank" rel="noopener">${esc(o.payment_intent)} in Stripe</a>` : "") + fact("Note", esc(o.note || ""))
      : fact("Plan", `${esc(o.target === "installer" ? INST_PLAN[o.plan] || o.plan : PLAN_NAME[o.plan] || o.plan)} · <b>${esc(money(o.amount, o.currency))}</b>${o.target === "event" && PLAN_PARTS[o.plan] ? ` <span class="meta">(${esc(PLAN_PARTS[o.plan])})</span>` : ""}`) + fact("Placement", o.target === "installer" ? (o.applied ? `${esc(o.applied_from || "")} to ${[o.applied_until ? `banner until ${esc(o.applied_until)}` : "", o.applied_top_until ? `top of the list until ${esc(o.applied_top_until)}` : ""].filter(Boolean).join(", ")} (installer now: banner ${esc(o.inst_banner || "off")}, top ${esc(o.inst_top || "off")})` : "not on the installer yet") : o.applied ? `level ${esc(o.applied_featured)} until ${esc(o.applied_until || "the end")}${o.applied_banner_until ? `, banner until ${esc(o.applied_banner_until)}` : ""}${o.ev_featured || o.ev_banner ? ` (${o.target === "home" ? "home" : "event"} now: level ${esc(o.ev_featured || 0)} until ${esc(o.ev_until || "the end")}${o.target === "event" ? `, banner ${esc(o.ev_banner || "off")}` : ""})` : ` (${o.target === "home" ? "home" : "event"} now: not featured)`}` : `not on the ${o.target === "home" ? "home" : "event"} yet`)
        + (o.target === "installer" ? fact("Installer", `<a href="/admin/#installers">${esc(o.name || o.event_id)}</a>${o.inst_slug ? ` · <a href="/installer/${esc(o.inst_slug)}" target="_blank" rel="noopener">public page</a>` : ""}`) : o.target === "home" ? fact("Home", esc([o.city, o.contest_name && "podium of " + o.contest_name, o.event_id].filter(Boolean).join(" · "))) : fact("Event", esc([o.city, o.start_date && o.end_date ? (o.start_date === o.end_date ? o.start_date : o.start_date + " to " + o.end_date) : "", o.notice && o.notice.toUpperCase(), String(o.event_id).startsWith("sub:") ? "waiting for approval (payment held; it switches on when you approve the event)" : o.event_id].filter(Boolean).join(" · ")))) + fact("Buyer", `<span style="user-select:all">${esc(o.email)}</span>`)
        + fact("Payment", o.stripe_url ? `<a href="${esc(o.stripe_url)}" target="_blank" rel="noopener">${esc(o.payment_intent)} in Stripe</a>` : "") + fact("Note", esc(o.note || "")),
      edit: btn("ghost", o.note ? "Edit note" : "Add note", 'data-oact="note"'),
      main: due ? btn("main", "Mark refunded", 'data-oact="mark_refunded"') : o.status === "paid" && !o.applied ? btn("main", "Apply now", 'data-oact="reapply"') : "",
    });
  }).join("")}</div>`;
  go();
}
function askNote(title, value) {
  return new Promise((done) => {
    const m = $("#modal"); m.hidden = false;
    m.innerHTML = modalFrame(title, `<form class="f" id="rsForm" novalidate>${fsec("Note", "", ff("on-t", "Your note", `<textarea id="on-t" rows="4" maxlength="500">${esc(value)}</textarea>`, { hint: "Saving your own note marks an automatic warning as seen." }))}<div class="mfoot"><button class="btn ice" type="submit">Save note</button><button class="btn ghost" type="button" data-mcancel>Cancel</button></div></form>`);
    const end = (v) => { m.hidden = true; m.innerHTML = ""; done(v); };
    $("#mClose").onclick = () => end(null); m.querySelector("[data-mcancel]").addEventListener("click", () => end(null), { once: true });
    $("#rsForm").onsubmit = (e) => { e.preventDefault(); end($("#on-t").value.trim()); }; $("#on-t").focus();
  });
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-oact]"); if (!b) return;
  const card = b.closest("[data-oid]"), act = b.dataset.oact, name = card.querySelector("h3").textContent, msg = card.querySelector(".msg"), body = { action: act };
  if (act === "mark_refunded" && !confirm("Mark this order refunded?\n\nOnly do this after you refunded the payment in the Stripe dashboard. This does not refund anything.")) return;
  if (act === "note") { const v = await askNote("Note for " + name, card.dataset.onote); if (v === null) return; body.note = v; }
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try { const d = await api("/api/admin/orders/" + encodeURIComponent(card.dataset.oid), { method: "POST", body: JSON.stringify(body) }); toast(act === "mark_refunded" ? (d.placement_differs ? "Marked refunded. The placement was left on: check it" : "Marked refunded") : act === "reapply" ? "Applied" : "Note saved"); renderOrders(); refreshCounts(); }
  catch (er) { b.disabled = false; msg.className = "msg err"; msg.textContent = er.message; }
});

/* ---------- contests (organizers who need a review, e.g. a Gmail address or an email that doesn't match their website) ---------- */
let CONTESTS = [], CVIEW = "", CSEARCH = "";
const flagged = (c) => c.status === "live" && !!c.note;
const cview = (c) => (c.status === "pending" || flagged(c) ? "look" : c.status === "live" ? "live" : c.status === "declined" ? "declined" : "ended");
async function renderContests() {
  const main = $("#main");
  CONTESTS = await api("/api/admin/contests");
  const g = (k) => CONTESTS.filter((c) => cview(c) === k), n = { look: g("look").length, live: g("live").length, ended: g("ended").length, declined: g("declined").length };
  setCount("contests", n.look);
  if (!CVIEW || (CVIEW === "look" && !n.look)) CVIEW = n.look ? "look" : n.live ? "live" : n.ended ? "ended" : "declined";
  const list = g(CVIEW);
  const bar = toolbar({ views: [{ k: "look", label: "Needs a look", n: n.look }, { k: "live", label: "Live", n: n.live }, { k: "ended", label: "Ended", n: n.ended }, { k: "declined", label: "Unpublished", n: n.declined }, { k: "passes", label: "Contest passes" }], active: CVIEW, search: { placeholder: "Search contests, organizers", value: CSEARCH }, right: dl("contests"), count: String(list.length) });
  const wire = () => { wireToolbar(main, { onView: (v) => { CVIEW = v; renderContests(); }, onSearch: (q) => { CSEARCH = q; filterCards(main, q); } }); if (CSEARCH) filterCards(main, CSEARCH); applyPreset(main); };
  if (CVIEW === "passes") { main.innerHTML = bar + `<div id="passes">Loading…</div>`; wire(); return renderPasses(); }
  if (!list.length) { main.innerHTML = bar + `<div class="empty">${CVIEW === "look" ? "Nothing needs a look. New contests go live right away. One shows here when the organizer's email could not be matched to a website." : "No contests here."}</div>`; wire(); return; }
  main.innerHTML = bar + `<div class="cards">${list.map((c) => {
    const tone = c.status === "live" ? "ok" : c.status === "declined" ? "bad" : c.status === "pending" ? "warn" : "";
    const label = c.status === "live" ? (c.announced ? "Winners announced" : "Live") : c.status === "declined" ? "Unpublished" : c.status === "pending" ? "Waiting" : "Ended";
    return rec({
      attrs: `data-cid="${esc(c.id)}"`, title: esc(c.name), tags: [[label, tone], ...(flagged(c) ? [["Needs a look", "warn"]] : [])], meta: esc((c.created_at || "").slice(0, 16)) + " UTC",
      facts: fact("Run by", esc(c.org) + " · " + esc(c.city)) + fact("Organizer", `<span style="user-select:all">${esc(c.owner_email || c.contact_email || "no owner")}</span>`) + fact("Website", c.site ? `<a href="${esc(c.site)}" target="_blank" rel="noopener">${esc(c.site)}</a>` : "none given") + fact("Why it needs a look", esc(c.note || ""))
        + fact("Dates", `Entries to ${esc(c.entries_close)} · voting ${esc(c.vote_start)} to ${esc(c.vote_end)}`) + fact("Activity", `${fmt(c.entries)} ${c.entries === 1 ? "entry" : "entries"} · ${fmt(c.votes)} ${c.votes === 1 ? "vote" : "votes"}`)
        + fact("Pages", `<a href="/c/${esc(c.slug)}" target="_blank" rel="noopener">Public page</a> · <a href="/c/${esc(c.slug)}/manage" target="_blank" rel="noopener">Organizer dashboard</a>`),
      edit: btn("ghost", "Edit", `data-cedit="${esc(c.id)}"`) + btn("ghost", "Sponsors", `data-csp="${esc(c.id)}"`),
      main: (c.status === "live" ? (flagged(c) ? btn("main", "Looks fine", 'data-cact="approve"') : "") + btn("ghost", "Unpublish", 'data-cact="decline"') : c.status === "closed" ? "" : btn("main", c.status === "pending" ? "Approve (goes on the map)" : "Make live again", 'data-cact="approve"')),
      danger: btn("danger", c.entries ? `Delete with ${c.entries} ${c.entries === 1 ? "entry" : "entries"}` : "Delete", 'data-cact="delete"'),
    });
  }).join("")}</div>`;
  wire();
}
/* ---------- Contest passes: usage per organization, comps (free for a founding partner), passes bought, "more than 20" leads ---------- */
const pdate = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
async function renderPasses() {
  const box = $("#passes"); let d;
  try { d = await api("/api/admin/passes"); } catch (er) { box.innerHTML = `<div class="empty">${esc(er.message)}</div>`; return; }
  const comp = fsec("Grant a comp", "A comp lets an organization run free contests without a pass. It never shows a price to the organizer: they see \"Founding partner: free through the date\". Example, the Founding City: type covinaca.gov, choose Unlimited, set the valid-until date, add the note \"Founding partner: Covina\", then Grant. Nothing is granted until you click Grant.",
    ff("pcTarget", "Website domain or organizer email", `<input id="pcTarget" maxlength="120" placeholder="covinaca.gov" autocomplete="off">`, { c: "c3" }) + ff("pcAllowed", "Contests allowed per 12-month window", `<input id="pcAllowed" type="number" min="1" max="1000" value="5" inputmode="numeric">`, { c: "c3" })
    + ff("pcUnl", "Unlimited", `<label class="chk"><input id="pcUnl" type="checkbox"> No limit while the comp runs</label>`, { c: "c3" }) + ff("pcUntil", "Valid until", `<input id="pcUntil" type="date">`, { c: "c3" }) + ff("pcNote", "Note (only you see it)", `<input id="pcNote" maxlength="300" placeholder="Founding partner: Covina">`, { c: "c6" }))
    + `<div class="mfoot"><button class="btn ice" type="button" id="pcGrant">Grant comp</button><span class="msg" id="pcMsg" role="status"></span></div>`;
  const orgs = d.orgs.length ? `<div class="cards">${d.orgs.map((o) => rec({ attrs: `data-pkey="${esc(o.key)}"`, title: esc(o.label), tags: [[o.over ? "Over its limit" : o.comp ? "Comp" : "Within limit", o.over ? "bad" : o.comp ? "ok" : ""]], meta: esc(o.key),
    facts: fact("This window", o.windowStart ? `${esc(pdate(o.windowStart))} to ${esc(pdate(o.windowEnd))}` : "no window running (the next contest is free)") + fact("Contests counted", `<b>${o.used}</b> of ${o.unlimited ? "unlimited" : o.cap}`) + fact("Comp", o.comp ? `${o.comp.unlimited ? "unlimited" : o.comp.allowed} through ${esc(pdate(o.comp.until))}${o.comp.note ? " · " + esc(o.comp.note) : ""}` : "")
      + fact("Contests", o.contests.map((c) => `<a href="/c/${esc(c.slug)}/manage" target="_blank" rel="noopener">${esc(c.name)}</a> (${esc(c.live_at)}${c.status === "live" ? "" : ", " + esc(c.status)})`).join("<br>")),
    main: btn("ghost", "Merge into another key", 'data-pact="merge"') })).join("")}</div>` : `<div class="empty">No organization has a contest live yet.</div>`;
  const comps = d.comps.length ? `<div class="cards">${d.comps.map((c) => rec({ attrs: `data-pcomp="${esc(c.id)}"`, title: esc(c.label), tags: [[c.running ? "Running" : c.revoked ? "Ended by you" : "Expired", c.running ? "ok" : ""]], meta: esc(c.created_at.slice(0, 10)),
    facts: fact("Allowed", c.allowed < 0 ? "unlimited contests" : `${c.allowed} contests per window`) + fact("Valid until", esc(pdate(c.valid_until))) + fact("Note", esc(c.note)) + fact("Granted by", esc(c.created_by)), main: c.running ? btn("ghost", "End this comp now", 'data-pact="revoke_comp"') : "" })).join("")}</div>` : `<div class="empty">No comps yet.</div>`;
  const passes = d.passes.length ? `<div class="cards">${d.passes.map((p) => rec({ attrs: `data-ppass="${esc(p.session_id)}"`, title: esc(orgLabelOf(p.org_key)) + " · up to " + p.cap, tags: [[p.status === "active" ? "Active" : "Revoked", p.status === "active" ? "ok" : ""]], meta: esc(p.created_at.slice(0, 10)),
    facts: fact("Window", `${esc(pdate(p.window_start))} to ${esc(pdate(p.window_end))}`) + fact("Paid", esc(money(p.amount, "usd"))) + fact("Buyer", esc(p.email || "")) + fact("Order", esc(p.order_status || "")), main: p.status === "active" ? btn("ghost", "Revoke this pass", 'data-pact="revoke_pass"') : "" })).join("")}</div>` : `<div class="empty">No passes bought yet. Passes also show in Orders.</div>`;
  const leads = d.leads.length ? `<div class="cards">${d.leads.map((l) => rec({ title: esc(l.email), tags: [["More than 20", "warn"]], meta: esc(l.created_at.slice(0, 10)), facts: fact("Organization", esc(l.label)) + fact("Note", esc(l.note)) })).join("")}</div>` : `<div class="empty">No "more than 20 contests" requests.</div>`;
  box.innerHTML = `${comp}<h2 class="dh">Organizations (${d.orgs.length})</h2>${orgs}<h2 class="dh">Comps</h2>${comps}<h2 class="dh">Passes bought</h2>${passes}<h2 class="dh">More than 20 contests: leads</h2>${leads}`;
  $("#pcUnl").onchange = (e) => { $("#pcAllowed").disabled = e.target.checked; };
  $("#pcGrant").onclick = async () => {
    const m = $("#pcMsg"); m.className = "msg"; m.textContent = "Working…";
    try { await api("/api/admin/passes", { method: "POST", body: JSON.stringify({ action: "grant", name: $("#pcTarget").value, target: $("#pcTarget").value, allowed: $("#pcUnl").checked ? "unlimited" : Number($("#pcAllowed").value), until: $("#pcUntil").value, note: $("#pcNote").value }) }); toast("Comp granted"); renderPasses(); }
    catch (er) { m.className = "msg err"; m.textContent = er.message; }
  };
  box.querySelectorAll("[data-pact]").forEach((b) => (b.onclick = async () => {
    const act = b.dataset.pact, body = { action: act };
    if (act === "merge") { const to = prompt("Count this organization's contests under which key? Type a website domain (covinaca.gov) or an email address."); if (!to) return; body.from = b.closest("[data-pkey]").dataset.pkey; body.to = to; }
    else if (act === "revoke_comp") { if (!confirm("End this comp now?")) return; body.id = b.closest("[data-pcomp]").dataset.pcomp; }
    else if (act === "revoke_pass") { if (!confirm("Revoke this pass? Contests already live stay live. This does not refund anything.")) return; body.session_id = b.closest("[data-ppass]").dataset.ppass; }
    try { await api("/api/admin/passes", { method: "POST", body: JSON.stringify(body) }); toast(act === "merge" ? "Merged" : "Done"); renderPasses(); } catch (er) { toast(er.message); }
  }));
}
/* ---------- Sponsors of a contest (organizer-collected; support and abuse review: contact details, amounts, receipts, hide) ---------- */
async function openSponsors(cid) {
  const m = $("#modal"); m.hidden = false; m.innerHTML = modalFrame("Sponsors", "<p>Loading…</p>", true);
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  try {
    const d = await api("/api/admin/sponsors?contest=" + encodeURIComponent(cid));
    const rows = d.sponsors.map((x) => `<article class="acard rec" data-sid="${esc(x.id)}"><div class="rh"><div class="rt"><h3>${esc(x.name)}</h3><span class="tag ${x.shown ? "ok" : x.hidden_by_admin ? "bad" : "warn"}">${x.hidden_by_admin ? "Hidden by you" : x.shown ? "Shown" : "Not shown"}</span></div></div>
      <dl class="facts">${fact("Level", esc(x.tier))}${fact("Contact", esc([x.contact_name, x.phone, x.email].filter(Boolean).join(" · ")))}${fact("Website", esc(x.url))}${fact("Amount", x.amount_cents == null ? "" : esc(money(x.amount_cents, "usd")))}${fact("Basis", x.basis === "paid" ? `Paid to the organizer on ${esc(x.paid_date)} (${esc(x.paid_method)})` : x.basis === "in_kind" ? "Donated in kind: " + esc(x.in_kind_note) : esc(x.basis || "not confirmed"))}${fact("Permission ticked", x.permission ? "yes" : "no")}${fact("Receipt", x.receipt ? `<a href="/api/admin/sponsors?receipt=${esc(x.id)}" target="_blank" rel="noopener">Open receipt (private)</a>` : "none")}</dl>
      <div class="ra">${btn("ghost", x.hidden_by_admin ? "Show again" : "Hide from the contest page", `data-sh="${x.hidden_by_admin ? "show" : "hide"}"`)}<span class="sp"></span><span class="msg" role="status"></span></div></article>`).join("");
    const iv = d.invite, inv = `<article class="acard rec"><div class="rh"><div class="rt"><h3>Sponsor invite link and payment text</h3><span class="tag ${iv.link_on && !iv.switched_off_by_admin ? "ok" : ""}">${iv.switched_off_by_admin ? "Switched off by you" : iv.link_on ? "Link on" : "Link off"}</span></div></div>
      <dl class="facts">${fact("Contest review note", esc(d.contest.review_note || "none (trusted)"))}${fact("Payment link", esc(iv.pay_url))}${fact("Payment text", esc(iv.pay_text))}${fact("Levels", esc(iv.levels))}${fact("Payment text hidden", iv.pay_hidden ? "yes" : "no")}</dl>
      <div class="ra">${btn("ghost", iv.switched_off_by_admin ? "Allow the invite link again" : "Switch the invite link off", `data-cf="${iv.switched_off_by_admin ? "invite_on" : "invite_off"}"`)}${btn("ghost", iv.pay_hidden ? "Show the payment text again" : "Hide the payment link and text", `data-cf="${iv.pay_hidden ? "show_pay" : "hide_pay"}"`)}<span class="sp"></span><span class="msg" role="status"></span></div></article>`;
    m.innerHTML = modalFrame("Sponsors of " + d.contest.name, `<p class="meta">Sponsor money goes to the organizer, not to SoCal Lights. Receipts are private to the organizer team and you.</p>${inv}${rows || `<div class="empty">No sponsors recorded.</div>`}`, true);
    $("#mClose").onclick = close;
    m.querySelectorAll("[data-cf]").forEach((b) => (b.onclick = async () => { try { await api("/api/admin/sponsors", { method: "POST", body: JSON.stringify({ action: b.dataset.cf, contest: cid, name: d.contest.name }) }); toast("Done"); openSponsors(cid); } catch (er) { toast(er.message, true); } }));
    m.querySelectorAll("[data-sh]").forEach((b) => (b.onclick = async () => { try { await api("/api/admin/sponsors", { method: "POST", body: JSON.stringify({ action: b.dataset.sh, id: b.closest("[data-sid]").dataset.sid, name: d.contest.name }) }); toast(b.dataset.sh === "hide" ? "Hidden" : "Shown again"); openSponsors(cid); } catch (er) { toast(er.message, true); } }));
  } catch (er) { m.innerHTML = modalFrame("Sponsors", `<p>${esc(er.message)}</p>`); $("#mClose").onclick = close; }
}
$("#main").addEventListener("click", (e) => { const b = e.target.closest("[data-csp]"); if (b) openSponsors(b.dataset.csp); });
const orgLabelOf = (k) => (String(k).startsWith("d:") ? String(k).slice(2) : String(k).startsWith("u:") ? String(k).slice(2) : String(k));
const CDONE = { approve: "Contest is live", decline: "Contest unpublished", delete: "Contest deleted" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cact]"); if (!b) return;
  const card = b.closest("[data-cid]"), msg = card.querySelector(".msg"), act = b.dataset.cact;
  const cname = card.querySelector("h3").textContent, extra = {};
  if (act === "decline") { const r = await askReason({ title: "Unpublish " + cname, hint: "This is emailed to the organizer. Leave it blank to send no reason.", go: "Unpublish" }); if (r === null) return; extra.reason = r; }
  else if (act === "delete" && !tap(b, "delete for good")) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try {
    const res = await api("/api/admin/contests/" + card.dataset.cid, act === "delete" ? { method: "DELETE" } : { method: "POST", body: JSON.stringify({ action: act, ...extra }) });
    toast(CDONE[act] + (res && res.overCap ? `. Heads up: ${res.overCap.org} is now over its contest limit (${res.overCap.used} of ${res.overCap.cap}); see Contest passes` : ""), false, act === "decline" ? { undo: async () => { try { await api("/api/admin/contests/" + card.dataset.cid, { method: "POST", body: JSON.stringify({ action: "approve", notify: false }) }); toast("Undone"); renderContests(); refreshCounts(); } catch (er) { toast(er.message, true); } } } : {});
    renderContests(); refreshCounts(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

/* ---------- events ---------- */
let EVQ = "", EVLIMIT = 60;
async function renderEvents() {
  EVENTS = await (await fetch("/api/admin/events", { cache: "no-store" })).json();
  const main = $("#main");
  const seasonSel = `<select id="evSeason" aria-label="Season">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === evSeason ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>`;
  main.innerHTML = toolbar({ search: { placeholder: "Search events, cities", value: EVQ }, right: seasonSel + `<a class="btn ghost" id="evDl" href="/api/admin/export?type=events&season=${evSeason}" download>Download CSV</a>`, add: { id: "addEv", label: "Add an event" }, count: "" }) + `<div id="evlist"></div>`;
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
  $("#evSeason").onchange = (x) => { evSeason = x.target.value; EVLIMIT = 60; $("#evDl").href = "/api/admin/export?type=events&season=" + evSeason; paint(); };
  $("#addEv").onclick = () => editEvent(null);
}
function editEvent(ev) {
  const e = ev || { id: "", n: "", c: "Orange", city: "", t: Object.keys(SEASONS[evSeason].types)[0], s: TODAY, e: TODAY, st: "expected", free: true, p: "Free", h: "", lat: 33.68, lng: -117.83, b: "", u: "", sn: evSeason };
  const typeOpts = (sn, cur) => Object.entries(SEASONS[sn].types).map(([v, l]) => `<option value="${v}" ${v === cur ? "selected" : ""}>${l}</option>`).join("");
  const m = $("#modal");
  m.innerHTML = `<div class="card wide" role="dialog" aria-modal="true"><div class="mh"><h2>${ev ? "Edit event" : "Add an event"}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <form class="f" id="evForm" novalidate>
    ${fsec("Event", "", ff("eN", "Name", `<input id="eN" value="${esc(e.n)}" maxlength="120" required>`)
      + ff("eSn", "Season", `<select id="eSn">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === (e.sn || "christmas") ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>`, { c: "c3" }) + ff("eT", "Type", `<select id="eT">${typeOpts(e.sn || "christmas", e.t)}</select>`, { c: "c3" })
      + ff("eSt", "Dates are", `<select id="eSt"><option value="confirmed" ${e.st === "c" ? "selected" : ""}>Confirmed for this season</option><option value="expected" ${e.st !== "c" ? "selected" : ""}>Expected (based on last year)</option></select>`, { hint: "Expected events show a note that visitors should check the event's website." }))}
    ${fsec("When and price", "", ff("eS", "Starts", `<input id="eS" type="date" value="${esc(e.s)}">`, { c: "c3" }) + ff("eE", "Ends", `<input id="eE" type="date" value="${esc(e.e)}">`, { c: "c3" }) + ff("eH", "Hours", `<input id="eH" value="${esc(e.h)}" maxlength="200" placeholder="6 to 10 pm nightly">`)
      + ff("eP", "Price shown", `<input id="eP" value="${esc(e.p)}" maxlength="80" placeholder="Free, From $19…">`, { c: "c4" }) + `<div class="ff c2"><label class="chk" for="eF"><input type="checkbox" id="eF" ${e.free ? "checked" : ""}> Free event</label></div>`)}
    ${fsec("Where", "Directions use the street address. The pin sets where the event appears on the map.", ff("eCity", "City or area", `<input id="eCity" value="${esc(e.city)}" maxlength="60" required>`, { c: "c4" }) + ff("eC", "County", `<select id="eC">${COUNTIES.map((c) => `<option ${c === e.c ? "selected" : ""}>${c}</option>`).join("")}</select>`, { c: "c2" })
      + ff("eV", "Venue", `<input id="eV" value="${esc(e.v || "")}" maxlength="120" placeholder="Crown Valley Community Park">`, { c: "c3" }) + ff("eA", "Street address", `<input id="eA" data-addr autocomplete="off" value="${esc(e.a || "")}" maxlength="200" placeholder="29751 Crown Valley Pkwy, Laguna Niguel, CA 92677">`, { c: "c3" })
      + `<div class="ff c6"><div class="row" style="margin-bottom:8px"><button class="btn ghost" type="button" id="eGeo">Place pin from address</button><span class="meta" id="geoMsg">Or click the map, or drag the pin.</span></div><div id="pick"></div><div class="meta dates" id="ll" style="margin-top:4px"></div></div>`)}
    ${fsec("Details", "", ff("eB", "Description", `<textarea id="eB" maxlength="600" rows="4">${esc(e.b)}</textarea>`) + ff("eU", "Event website", `<input id="eU" type="url" value="${esc(e.u)}" maxlength="300" placeholder="https://">`))}
    ${ev ? fsec("Paid placement", "Featured: 1 is the gold pin and badge, 2 also lists the event first. Banner: the event is a pill labelled Featured in the strip at the top of the map list. Organizers buy these themselves at /feature (see Orders). A level or date set here can never be lower or earlier than a paid order that is still running. Leave a date empty for no end date (Featured) or to keep the banner off.",
      ff("eFl", "Featured level", `<select id="eFl" disabled><option value="0">Off</option><option value="1">1: pin and badge</option><option value="2">2: also listed first</option></select>`, { c: "c2" }) + ff("eFu", "Featured until", `<input id="eFu" type="date" disabled>`, { c: "c2" }) + ff("eBu", "Banner until", `<input id="eBu" type="date" disabled>`, { c: "c2", hint: "Loading…" })) : ""}
    <div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="grow"></span>${ev ? `<button class="btn ghost danger" type="button" id="eDel">Delete event</button>` : ""}<span class="msg" id="eMsg" role="status" style="flex-basis:100%"></span></div>
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
  let placed = false; // the paid placement fields are sent only once they have loaded, so a failed load can never wipe a placement
  if (ev) api("/api/admin/events/" + encodeURIComponent(ev.id), { cache: "no-store" }).then((p) => { if (!$("#eFl")) return; $("#eFl").value = String(p.featured || 0); $("#eFu").value = p.featured_until || ""; $("#eBu").value = p.banner_until || ""; ["eFl", "eFu", "eBu"].forEach((i) => ($("#" + i).disabled = false)); const h = $("#eBu").closest(".ff").querySelector(".hint, small"); if (h) h.textContent = p.floor && (p.floor.banner_until || p.floor.featured_until) ? `Paid orders still running: Featured to ${p.floor.featured_until || "n/a"}, banner to ${p.floor.banner_until || "n/a"}. These cannot be set lower.` : "No paid order is running."; placed = true; }).catch(() => { const h = $("#eBu") && $("#eBu").closest(".ff").querySelector(".hint, small"); if (h) h.textContent = "Could not load the placement; it is left as it is."; });
  if (ev) $("#eDel").onclick = async (x) => { const b = x.target; if (!tap(b, "delete")) return; const del = "/api/admin/events/" + encodeURIComponent(ev.id); try { await api(del, { method: "DELETE" }); } catch (er) { if (er.status === 409 && er.data && er.data.code === "paid_placement" && confirm(er.message)) await api(del + "?confirm=1", { method: "DELETE" }); else { b.textContent = b.dataset.label || "Delete"; return toast(er.message, true); } } close(); toast("Event deleted"); if (tab === "events") renderEvents(); else render(); };
  $("#evForm").onsubmit = async (x) => {
    x.preventDefault(); const msg = $("#eMsg");
    const id = ev ? ev.id : $("#eN").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 6);
    const body = { id, season: $("#eSn").value, name: $("#eN").value, county: $("#eC").value, city: $("#eCity").value, type: $("#eT").value, start: $("#eS").value, end: $("#eE").value, status: $("#eSt").value, free: $("#eF").checked, price: $("#eP").value, hours: $("#eH").value, lat, lng, blurb: $("#eB").value, url: $("#eU").value, venue: $("#eV").value, address: $("#eA").value };
    if (ev && placed) body.placement = { featured: Number($("#eFl").value), featured_until: $("#eFu").value, banner_until: $("#eBu").value };
    try { await api("/api/admin/events", { method: "POST", body: JSON.stringify(body) }); close(); toast("Saved"); if (tab === "events") renderEvents(); else render(); }
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
  m.innerHTML = `<div class="card wide" role="dialog" aria-modal="true"><div class="mh"><h2>${esc(u.name || u.email)}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    ${sus ? `<p class="msg err" style="margin:6px 0">Suspended ${when(u.suspended_at)}. They can't sign in, vote or enter contests.</p>` : ""}
    <dl class="facts"><dt>Email</dt><dd><span style="user-select:all">${esc(u.email)}</span></dd><dt>Signs in with</dt><dd>${u.google ? "Google or an emailed code" : "An emailed code"}</dd>
    <dt>Joined</dt><dd>${when(u.created_at)}</dd><dt>Last sign-in</dt><dd>${when(u.last_login)} · ${d.sessions} signed-in device${d.sessions === 1 ? "" : "s"}</dd>
    <dt>Address</dt><dd>${esc([u.street, u.city, u.zip].filter(Boolean).join(", ")) || "not given"}</dd><dt>Votes cast</dt><dd>${d.votes}</dd></dl>
    ${d.installers.length ? psec("Installer profiles they own", d.installers.length, d.installers.map((i) => prow(`data-pf-inst="${esc(i.id)}"`, "⚒", i.name, "Installer profile", [i.status === "hidden" ? "Hidden" : "Active", i.status === "hidden" ? "bad" : "ok"])).join("")) : ""}
    ${psec("Homes and contest entries", d.posts.length, d.posts.map((p) => prow(`data-pf-post="${esc(p.id)}"`, p.contest_id ? "★" : "⌂", p.title || p.biz, `${p.city || ""} · ${p.contest_id ? "contest entry" : p.season} · ${ago(p.created_at)}`, [p.status === "approved" ? "Live" : p.status === "pending" ? "Waiting" : p.status, p.status === "approved" ? "ok" : p.status === "pending" ? "warn" : ""])).join(""))}
    ${psec("Events they submitted", d.events.length, d.events.map((e) => prow(`data-pf-sub="${esc(e.name)}" data-pf-view="${e.status === "published" ? "published" : "pending"}"`, "◷", e.name, `${e.city || ""} · ${e.start_date || ""}`, [e.status === "published" ? "Live" : e.status === "pending" ? "Waiting" : e.status, e.status === "published" ? "ok" : e.status === "pending" ? "warn" : ""])).join(""))}
    ${psec("Contests they run", d.contests.length, d.contests.map((c) => `<li><a class="dli" href="/c/${esc(c.slug)}" target="_blank" rel="noopener">${dico("trophy")}<span class="dt"><b>${esc(c.name)}</b><small>${esc(c.city)}${c.announced ? " · winners announced" : ""}</small></span><span class="tag ${c.status === "live" ? "ok" : c.status === "pending" ? "warn" : ""}">${esc(c.status)}</span><span aria-hidden="true" class="chev">↗</span></a></li>`).join(""))}
    ${d.history.length ? `<h3 class="psec">Admin history</h3><ul class="meta" style="margin:0;padding-left:18px">${d.history.map((h) => `<li>${when(h.at)} · ${esc(h.admin || "admin")} ${esc(VERB[h.action] || h.action)}</li>`).join("")}</ul>` : ""}
    <form class="f" id="uForm" novalidate style="margin-top:6px">${fsec("Edit person", "", ff("uName", "Name", `<input id="uName" maxlength="80" value="${esc(u.name)}">`, { hint: "Shown on their entries and in emails to them." }) + ff("uNote", "Private note", `<textarea id="uNote" rows="3" maxlength="1000">${esc(u.admin_note)}</textarea>`, { hint: "Only you see this." }))}
    <div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="uMsg" role="status"></span></div></form>
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
const VERB = { restore: "restored", photo_remove: "removed a photo from", photo_move: "reordered the photos of", dismiss: "dismissed", approve: "approved", decline: "declined", edit: "edited", delete: "deleted", add: "added", suspend: "suspended", unsuspend: "reactivated", signout: "signed out everywhere", rename: "renamed", note: "updated the private note on", start_voting: "started voting on", keep: "showed both records for", hide: "chose the person's record for", pick_post: "chose the person's own record for", pick_both: "chose to show both records for", pick_sweep: "chose the sweep record for", reset: "reset to default" };
const AREA = { users: "account", posts: "house", events: "event", contests: "contest", submissions: "submitted event", overlaps: "sweep record", installers: "installer", reports: "report", removals: "home removal", normalize: "data check", emails: "email template" };
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
  setCount("overlaps", d.replaced.length);
  const who = (p) => `<a href="#" data-gopost="${esc(p.id)}" data-name="${esc(p.title)}">${esc(p.title)}</a> <span class="meta">(${p.kind === "installer" ? "installer" : "homeowner"}, ${esc(p.biz)})</span>`;
  const note = '<p class="meta" style="margin:0 0 14px;max-width:760px">When an approved house or installer post has the same street address as a record the sweeps made, the person\'s own record is shown and the sweep record is hidden. Choose which one visitors see for each address. Nothing is deleted, and the person\'s post stays approved.</p>';
  const replaced = d.replaced.length ? `<div class="cards">${d.replaced.map((r) => rec({
    attrs: `data-ovid="${esc(r.event.id)}"`, title: esc(r.event.name), tags: [[r.event.choice === "sweep" ? "Sweep record shown" : r.event.choice === "both" ? "Both shown" : "Their record shown", r.event.choice === "post" ? "ok" : ""]],
    facts: fact("Address", esc(r.event.address)) + fact("The person's record", who(r.post)) + fact("Win on their listing", esc(r.event.win || "")),
    body: `<div class="ovchoice"><span class="meta">Visitors see:</span>${choiceButtons(r)}</div>`,
  })).join("")}</div>` : '<div class="empty">Nothing replaced yet.</div>';
  const near = d.near.length ? `<div class="cards">${d.near.map((r) => rec({
    compact: true, title: esc(r.event.name), tags: [["Both listed"]],
    body: `<span class="sub">${esc(r.event.address)}</span><span class="sub">Post: ${who(r.post)} · ${esc(r.post.street)}, ${esc(r.post.city)}</span>`,
  })).join("")}</div>` : '<div class="empty">None.</div>';
  main.innerHTML = note + toolbar({ search: { placeholder: "Search replaced records" }, count: String(d.replaced.length) }) + `<h2 class="dh">Replaced (${d.replaced.length})</h2>${replaced}<h2 class="dh" style="margin-top:28px">Same street, different number (${d.near.length})</h2><p class="meta" style="margin:-4px 0 10px">Both stay listed.</p>${near}`;
  wireToolbar(main, { onSearch: (q) => filterCards(main, q) });
  main.querySelectorAll("[data-ov]").forEach((b) => (b.onclick = async () => { main.querySelectorAll("[data-ov]").forEach((x) => (x.disabled = true)); try { await api("/api/admin/overlaps", { method: "POST", body: JSON.stringify({ action: b.dataset.ov, event_id: b.dataset.eid }) }); toast("Saved"); renderOverlaps(); refreshCounts(); } catch (e) { renderOverlaps(); toast(e.message, true); } }));
  main.querySelectorAll("[data-gopost]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); PRESET = a.dataset.name; setTab("approved"); }));
}


/* ---------- installers: edit a profile, hide it, or merge two spellings of one company ---------- */
let INST = [];
async function renderInstallers() {
  const main = $("#main");
  INST = await api("/api/admin/installers");
  setCount("installers", INST.length);
  if (!INST.length) { main.innerHTML = `<div class="empty">No installer profiles yet. One appears when an installer posts a display or a homeowner names the company that installed their lights.</div>`; return; }
  main.innerHTML = toolbar({ search: { placeholder: "Search installers" }, right: dl("installers"), count: String(INST.length) }) + `<div class="cards">${INST.map((i) => rec({
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
const GL = { "⌂": "home", "★": "trophy", "◷": "event", "⚒": "pro", "☺": "user", "✉": "mail" };
const prow = (attrs, ico, title, sub, tag) => `<li><button type="button" class="dli" ${attrs}>${dico(GL[ico] || "home")}<span class="dt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${tag ? `<span class="tag ${tag[1] || ""}">${esc(tag[0])}</span>` : ""}<span aria-hidden="true" class="chev">›</span></a></li>`;
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
    ${psec("Recent quote requests", d.leads.length, d.leads.map((l) => `<li><div class="dli" style="cursor:default">${dico("mail")}<span class="dt"><b>${esc(l.name)}</b><small>${esc(l.email)}${l.phone ? " · " + esc(l.phone) : ""} · ${ago(l.created_at)}</small></span></div></li>`).join(""))}
    ${d.history.length ? `<h3 class="psec">Admin history</h3><ul class="meta" style="margin:0;padding-left:18px">${d.history.map((h) => `<li>${when(h.at)} · ${esc(h.admin || "admin")} ${esc(VERB[h.action] || h.action)}</li>`).join("")}</ul>` : ""}
    <h3 class="psec">Edit details</h3>
    <form class="f" id="iForm" novalidate>
    ${fsec("Company", "", ff("if-name", "Company name", `<input id="if-name" data-f="name" value="${esc(i.name)}" maxlength="80">`) + ff("if-web", "Website", `<input id="if-web" data-f="web" type="url" value="${esc(i.web || "")}" maxlength="200" placeholder="https://">`, { c: "c3" }) + ff("if-phone", "Phone", `<input id="if-phone" data-f="phone" type="tel" value="${esc(i.phone || "")}" maxlength="80">`, { c: "c3" })
      + ff("if-area", "Areas served", areaHtml({ id: "if-area", value: i.area, extra: 'data-f="area"' }), { hint: AREAS_HINT }) + ff("if-blurb", "About", `<textarea id="if-blurb" data-f="blurb" rows="3" maxlength="600">${esc(i.blurb || "")}</textarea>`, { hint: "Shown on the public profile page." }))}
    ${fsec("Map banner and top of the list", "Banner: a thin labelled strip on the map. Top of the list: a labelled company card at the top of the list, behind Featured events. The banner plus top plan gets both, so set both dates. Installers can now buy these themselves at /sponsor; a paid order sets these dates (see Orders), and a date here can never be set earlier than a paid order that is still running. Leave a date empty to keep them off. Needs a phone number or website.", ff("if-ban", "Banner until", `<input id="if-ban" data-f="banner_until" type="date" value="${esc(i.banner_until || "")}">`, { c: "c3", hint: `Last 30 days: shown ${d.banner.imp}, company link ${d.banner.click}, phone ${d.banner.call}.` }) + ff("if-top", "Top of the list until", `<input id="if-top" data-f="top_until" type="date" value="${esc(i.top_until || "")}">`, { c: "c3", hint: `Last 30 days: shown ${d.banner.lst_imp}, taps on the card ${d.banner.lst_click + d.banner.lst_call}.` }))}
    ${fsec("Contacts", "These are private. They never appear on the public page.", ff("if-email", "Email for confirmations", `<input id="if-email" data-f="email" type="email" value="${esc(i.email || "")}" maxlength="120">`, { c: "c3", hint: "Where we send requests to confirm a home." }) + ff("if-owner", "Owner email", `<input id="if-owner" data-f="owner" type="email" value="${esc(i.owner_email || "")}" maxlength="120">`, { c: "c3", hint: "This person can edit the profile after signing in." }))}
    <div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="iMsg" role="status"></span></div></form>
    <details style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Merge into another profile</summary>
    <p class="meta" style="margin:8px 0">Moves every home to the profile you keep and removes this one. Use it when one company was typed two ways.</p>
    <div class="mfoot" style="margin-top:0"><select id="iMerge" aria-label="Merge ${esc(i.name)} into" style="flex:1;min-width:200px"><option value="">Choose the profile to keep…</option>${INST.filter((o) => o.id !== i.id).map((o) => `<option value="${esc(o.id)}">${esc(o.name)} (${o.homes})</option>`).join("")}</select><button class="btn ghost danger" type="button" id="iMergeGo">Merge</button></div></details>`, true);
  wireAreas(m); $("#mClose").onclick = close;
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
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const fields = d.fields.map((f) => rec({
    compact: true, title: `${esc(f.table)} · ${esc(f.field)}`, tags: [[d.dry ? `${plural(f.changed, "value")} would change` : `${plural(f.changed, "value")} changed`, f.changed ? "warn" : "ok"], ...(f.attention ? [[`${f.attention} need a person`, "bad"]] : [])],
    body: f.examples.map((x) => `<span class="sub"><b>${esc(x.record)}</b>: <s>${esc(x.old)}</s> &rarr; ${esc(x.new)}</span>`).join(""),
  })).join("");
  const attention = d.attention.map((a) => rec({ compact: true, title: `${esc(a.table)} · ${esc(a.field)}`, tags: [["Needs a person", "bad"]], body: `<span class="sub"><b>${esc(a.record)}</b>: ${esc(a.value)}</span>` })).join("");
  main.innerHTML = `<p class="meta" style="margin:0 0 14px;max-width:760px">Phones become (310) 555-0123, websites https://example.com/, emails lowercase, ZIPs five digits, streets "123 Main St", names tidy capitals. Anything that can't be fixed automatically is left alone and listed below. New entries are tidied as they are typed, so this only cleans up older records.</p>
   <div class="dcsum"><div class="stat"><b>${d.changed}</b><span>${d.dry ? "values would change" : "values changed"}</span></div><div class="stat"><b>${d.needsPerson || 0}</b><span>need a person</span></div><div class="dcact"><span class="meta">${d.dry ? "Check only: nothing has been changed." : "Done."}</span><div class="row" style="gap:8px"><button class="btn ghost" type="button" id="dc-check">Check again</button>${d.dry && d.changed ? `<button class="btn ice" type="button" id="dc-fix">Tidy ${plural(d.changed, "value")}</button>` : ""}</div><span class="msg" id="dc-msg" role="status"></span></div></div>
   <h2 class="dh">Fields</h2>${d.fields.length ? `<div class="cards">${fields}</div>` : `<div class="empty">Everything is already tidy.</div>`}
   ${d.attention.length ? `<h2 class="dh" style="margin-top:28px">Needs a person (left as they are)</h2><div class="cards">${attention}</div>` : ""}`;
  $("#dc-check").onclick = () => renderData();
  const fx = $("#dc-fix"); if (fx) fx.onclick = async () => { if (!tap(fx, "change " + plural(d.changed, "value"))) return; fx.disabled = true; $("#dc-msg").textContent = "Working…"; try { const r = await api("/api/admin/normalize", { method: "POST", body: JSON.stringify({ apply: true }) }); toast("Records tidied"); renderData(r); } catch (e) { fx.disabled = false; $("#dc-msg").className = "msg err"; $("#dc-msg").textContent = e.message; } };
}


/* ---------- dashboard: what needs you, today's numbers, what is live, what just happened ---------- */
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const agoShort = (s) => { const t = Date.parse(String(s || "").replace(" ", "T") + (/Z|\+/.test(String(s)) ? "" : "Z")); if (!t) return ""; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " hr ago" : Math.round(m / 1440) + " d ago"; };
const shortDate = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(new Date()));
const DI = {
  event: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/>', pro: '<path d="M14 7l3-3 3 3-3 3M17 7l-9.5 9.5a2 2 0 0 1-3-3L14 4"/><path d="M4 20h6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>', edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>', check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', chev: '<path d="M9 6l6 6-6 6"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
};
const dico = (k, cls = "ico") => `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${DI[k]}</svg></span>`;
// Several identical actions in a row (six photo reorders) show as one line with a count
const collapse = (list) => { const out = []; for (const e of list) { const l = out[out.length - 1]; if (l && l.action === e.action && l.area === e.area && l.label === e.label && l.admin === e.admin) l.n++; else out.push({ ...e, n: 1 }); } return out.slice(0, 8); };
const PAGE_NAMES = { map: "The map", contest: "Contest pages", "contest-manage": "Contest dashboards", "contest-enter": "Contest entry forms", "contest-judge": "Judge ballots", installer: "Installer pages", "installer-manage": "Installer dashboards", city: "City pages", tutorials: "Tutorials", profile: "Your profile", add: "The Add page", "add-event": "Add an event", "add-house": "Add a display", "add-contest": "Add a contest", contests: "The Contests page", privacy: "Privacy", terms: "Terms", feature: "Feature your event" };
// A small area chart for one number per day: faint grid, a line, a dot on the latest day
function spark(vals, days, label) {
  const W = 320, H = 84, pad = 8, max = Math.max(1, ...vals), x = (i) => pad + (i * (W - 2 * pad)) / (vals.length - 1), y = (v) => H - pad - (v / max) * (H - 2 * pad);
  const pts = vals.map((v, i) => [x(i), y(v)]), line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" "), area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L${pts[0][0].toFixed(1)} ${H - pad} Z`, last = pts[pts.length - 1];
  const md = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: ${vals.join(", ")} from ${md(days[0])} to ${md(days[days.length - 1])}" preserveAspectRatio="none"><title>${esc(label)}</title>${[0, .5, 1].map((t) => `<line x1="${pad}" x2="${W - pad}" y1="${(pad + t * (H - 2 * pad)).toFixed(1)}" y2="${(pad + t * (H - 2 * pad)).toFixed(1)}" class="sg"/>`).join("")}<path d="${area}" class="sa"/><path d="${line}" class="sl" vector-effect="non-scaling-stroke"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" class="sd"/></svg><div class="sx"><span>${md(days[0])}</span><span>${md(days[days.length - 1])}</span></div>`;
}
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
    ${d.staleJobs && d.staleJobs.length ? `<div class="limitbanner" role="alert"><b>${d.staleJobs.length === 1 ? "A scheduled job has stopped reporting in." : d.staleJobs.length + " scheduled jobs have stopped reporting in."}</b>${d.staleJobs.slice(0, 5).map((j) => `<span>${esc(j.line)}</span>`).join("")}<span>GitHub runs scheduled jobs late or skips them. Run the workflow by hand from GitHub > Actions, or see docs/runbooks/monitoring.md.</span></div>` : ""}
    ${d.limits && d.limits.length ? `<button type="button" class="limitbanner" data-tab="usage"><b>A Cloudflare free-plan limit was hit at ${esc(String(d.limits[0].at).slice(0, 16))} UTC.</b><span>${esc(String(d.limits[0].detail).slice(0, 140))} Open Cloudflare usage to see which one and what to do.</span></button>` : ""}
    <section aria-label="Needs your attention">${todo.length ? `<div class="todo">${todo.map(([k, n, w, l]) => `<button type="button" class="tcard" data-tab="${k}"><b>${fmt(n)}</b><span>${w}${n === 1 ? "" : "s"} ${l}</span><i aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DI.chev}</svg></i></button>`).join("")}</div>` : `<div class="calm">${dico("check", "okic")}<div><b>All caught up</b><p class="meta" style="margin:2px 0 0">No houses, events, contests or reports are waiting.</p></div></div>`}</section>
    <h2 class="dh">Today</h2>
    <div class="stats">${tile("h", d.today.homes, "new houses")}${tile("e", d.today.events, "events submitted")}${tile("c", d.today.entries, "contest entries")}${tile("l", d.people.litToday, "lights switched on")}</div>
    <h2 class="dh">On the site now</h2>
    <div class="stats">${tile("h", d.live.homes, "published houses")}${tile("e", d.live.events, "map events")}${tile("c", d.live.contests, "contests running")}${tile("i", d.live.installers, "installers")}</div>
    <h2 class="dh">People, last 7 days</h2>
    <div class="stats">${tile("u", d.people.users, "accounts in total")}${tile("n", d.people.newUsers, "new accounts")}${tile("v", d.people.votesWeek, "contest votes")}${tile("p", d.people.hits, "installer profile views")}</div>
    <h2 class="dh">Last 14 days</h2>
    <div class="trends">${[["New houses", d.trends.houses], ["Contest votes", d.trends.votes], ["New accounts", d.trends.accounts], ["Page views*", d.trends.views]].map(([t, v]) => { const sum = v.reduce((a, b) => a + b, 0), prev = v.slice(0, 7).reduce((a, b) => a + b, 0), now = v.slice(7).reduce((a, b) => a + b, 0), ch = prev ? Math.round(((now - prev) / prev) * 100) : null; return `<div class="tr"><div class="trh"><span>${t}</span>${ch == null ? "" : `<span class="chg ${ch >= 0 ? "up" : "dn"}" title="Last 7 days compared with the 7 days before">${ch >= 0 ? "+" : ""}${ch}%</span>`}</div><b>${fmt(sum)}</b>${sum || t !== "Page views*" ? spark(v, d.trends.days, t) : '<p class="meta" style="margin:8px 0 0">Counting starts now. Visits appear here as people open pages.</p>'}</div>`; }).join("")}</div>
    ${d.trends.topPages.length ? `<h2 class="dh">Most visited pages, last 14 days</h2><ul class="dl toppg">${d.trends.topPages.map((p) => `<li><div class="dli" style="cursor:default"><span class="dt"><b>${esc(PAGE_NAMES[p.page.replace(/^\/+/, "")] || p.page.replace(/^\/+/, "").replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()))}</b></span><span class="meta">${fmt(p.n)} view${p.n === 1 ? "" : "s"}</span></div></li>`).join("")}</ul>` : ""}
    <p class="meta" style="margin:6px 0 0">*Page views and visits are counted by a small script in the visitor's browser, once per page per browser tab. They are not people: visitors who block scripts, and search engines and previewers that do not run them, are not counted, and a person using two tabs counts twice. Use them to see direction and which pages get used, not as a head count.</p>
    ${d.funnel ? `<h2 class="dh">How people use the site</h2><ul class="dl toppg">${d.funnel.steps.map(([k, l]) => { const c = d.funnel.counts[k] || { today: 0, week: 0 }; return `<li><div class="dli" style="cursor:default"><span class="dt"><b>${esc(l)}</b></span><span class="meta">${fmt(c.today)} today · ${fmt(c.week)} in 7 days</span></div></li>`; }).join("")}${(d.funnel.refs || []).map((r) => `<li><div class="dli" style="cursor:default"><span class="dt"><b>Arrived from link ?ref=${esc(r.code)}</b></span><span class="meta">${fmt(r.today)} today · ${fmt(r.week)} in 7 days</span></div></li>`).join("")}</ul>` : ""}
    <h2 class="dh">Taps on links and buttons</h2><ul class="dl toppg">${[["feature", "Opened the Feature page"], ["click:feature-checkout-start", "Continue to payment"], ["click:promote", "Promote your event menu row"], ["click:ticket", "Ticket link (Eventbrite, Ticketmaster, Fever)"], ["click:event-link", "Other event page link"], ["click:route", "Directions and route buttons"], ["click:installer", "Installer quote and contact"], ["click:shop", "Shop links"]].map(([k, l]) => { const c = (d.trends.clicks || {})[k] || { today: 0, week: 0 }; return `<li><div class="dli" style="cursor:default"><span class="dt"><b>${l}</b></span><span class="meta">${fmt(c.today)} today · ${fmt(c.week)} in 7 days</span></div></li>`; }).join("")}</ul>
    <div class="dcols">
      <section class="dbox"><h2 class="dh">Newest submissions</h2>${d.recent.length ? `<ul class="dl">${d.recent.map((r) => `<li><button type="button" class="dli" data-recent="${esc(r.kind)}" data-id="${esc(r.id)}" data-eid="${esc(r.eid || "")}" data-st="${esc(r.status)}" data-name="${esc(r.name)}">${dico(r.kind === "event" ? "event" : r.pro ? "pro" : "home")}<span class="dt"><b>${esc(r.name)}</b><small>${esc(r.city || "")} · ${r.kind === "event" ? "event" : r.pro ? "installer post" : "house"} · ${agoShort(r.at)}</small></span><span class="tag ${r.status === "pending" ? "warn" : r.status === "approved" || r.status === "published" ? "ok" : ""}">${esc(r.status)}</span></button></li>`).join("")}</ul>` : `<div class="empty">Nothing submitted yet.</div>`}</section>
      <section class="dbox"><h2 class="dh">Contests running</h2>${d.contests.length ? `<ul class="dl">${d.contests.map((c) => `<li><a class="dli" href="/c/${esc(c.slug)}" target="_blank" rel="noopener">${dico("trophy")}<span class="dt"><b>${esc(c.name)}</b><small>${esc(c.city)} · ${fmt(c.entries)} ${c.entries === 1 ? "entry" : "entries"} · ${fmt(c.votes)} ${c.votes === 1 ? "vote" : "votes"} · voting ends ${shortDate(c.vote_end)}</small></span></a></li>`).join("")}</ul>` : `<div class="empty">No contest is running right now.</div>`}
      <h2 class="dh">Your recent activity</h2>${d.activity.length ? `<ul class="dl">${collapse(d.activity).map((e) => `<li><button type="button" class="dli wrap" data-tab="log">${dico("edit")}<span class="dt"><b>${esc(VERB[e.action] || e.action)} ${esc(AREA[e.area] || e.area)} ${esc(e.label || "")}${e.n > 1 ? ` <span class="rep">×${e.n}</span>` : ""}</b><small>${esc(e.admin || "admin")} · ${agoShort(e.at)}</small></span></button></li>`).join("")}</ul>` : `<div class="empty">Nothing yet. Approvals and edits will show here.</div>`}</section>
    </div>`;
}

/* ---------- Cloudflare free-plan usage (read-only) ---------- */
const U_BYTES = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : fmt(n) + " B");
const U_NUM = (m, n) => (m.unit === "bytes" ? U_BYTES(n) : fmt(n));
const U_TAG = { ok: ["ok", "OK"], watch: ["warn", "Watch"], warning: ["bad", "Warning"], limit: ["bad", "Limit reached"], unknown: ["", "No data"] };
const U_RESET = { day: "Resets at 00:00 UTC (4 pm Pacific in winter, 5 pm in summer)", month: "Month to date (calendar month, UTC)", now: "Current size" };
function usageCard(m) {
  const [cls, lab] = U_TAG[m.level] || U_TAG.unknown, pct = m.pct == null ? 0 : Math.min(100, m.pct);
  const trend = m.trend && m.trend.length ? `<details class="utrend"><summary>Last 7 days ${usageSpark(m.trend)}</summary><table><thead><tr><th scope="col">UTC day</th><th scope="col">${m.period === "month" ? "That day" : "Used"}</th></tr></thead><tbody>${m.trend.map((p) => `<tr><td>${esc(p.d)}</td><td>${fmt(p.v)}</td></tr>`).join("")}</tbody></table></details>` : "";
  return `<article class="ucard u-${esc(m.level)}" aria-label="${esc(m.label)}">
    <div class="uh"><h3>${esc(m.label)}</h3><span class="tag ${cls}">${lab}</span></div>
    ${m.used == null ? `<p class="meta" style="margin:6px 0 0">${esc(m.why || "No data")}</p>` : `<p class="unum"><b>${U_NUM(m, m.used)}</b> of ${U_NUM(m, m.limit)} <span class="meta">(${m.pct}%)</span></p>
    <div class="ubar" role="progressbar" aria-label="${esc(m.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-valuetext="${m.pct}% of the free limit"><i style="width:${pct}%"></i></div>`}
    <p class="meta ures">${U_RESET[m.period]} · free limit ${U_NUM(m, m.limit)} ${m.verified ? "" : '<span class="tag">unverified</span>'} · <a href="${esc(m.source)}" target="_blank" rel="noopener">source</a></p>
    ${trend}
    <details class="utrend"><summary>What happens at the limit</summary><p class="meta" style="margin:6px 0 0">${esc(m.breaks)} On a paid plan: ${esc(m.paid)}.</p></details>
  </article>`;
}
function usageSpark(t) {
  const max = Math.max(1, ...t.map((p) => p.v)), W = 84, H = 18, step = W / (t.length - 1);
  return `<svg class="uspark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="${t.map((p, i) => `${(i * step).toFixed(1)},${(H - 2 - (p.v / max) * (H - 4)).toFixed(1)}`).join(" ")}"/></svg>`;
}
async function renderUsage() {
  const main = $("#main"), q = main.dataset.urefresh === "1" ? "?refresh=1" : "";
  main.dataset.urefresh = "";
  const u = await api("/api/admin/usage" + q);
  const grp = (title, keys) => `<h2 class="dh">${title}</h2><div class="ugrid">${u.metrics.filter((m) => keys.includes(m.key)).map(usageCard).join("")}</div>`;
  const worst = u.top ? `${esc(u.top.label)} at ${u.top.pct}%` : "no numbers yet";
  const steps = `<section class="ucard u-ok" aria-label="Connect Cloudflare analytics"><div class="uh"><h3>Not connected</h3><span class="tag">Cloudflare numbers off</span></div>
    <p class="meta" style="margin:6px 0">${u.error ? esc(u.error) : "This page needs two secrets so it can read Cloudflare's usage numbers (read-only). Email counts and logged limit errors work without them."}</p>
    <ol class="usteps"><li>Cloudflare dashboard &gt; avatar (top right) &gt; My Profile &gt; API Tokens &gt; Create Token &gt; Custom token &gt; Get started.</li><li>Permission: Account / Account Analytics / Read. Account resources: Include / this account. Continue to summary &gt; Create Token. Copy the token once.</li><li>Account ID: Workers &amp; Pages overview, right-hand column (it is also the long code in the dashboard address after /).</li><li>Workers &amp; Pages &gt; socal-lights &gt; Settings &gt; Variables and Secrets &gt; Add. Type: Secret, name <code>CF_ANALYTICS_TOKEN</code>, paste the token. Add again: Secret <code>CF_ACCOUNT_ID</code>. Environment: Production. Save.</li><li>Redeploy (Deployments &gt; the latest &gt; Retry deployment), then reload this page.</li></ol>
    <p class="meta" style="margin:0">Full steps: docs/runbooks/cloudflare-limits.md</p></section>`;
  main.innerHTML = `<p class="meta" style="margin:0 0 12px">Free-plan limits for <b>today, UTC day ${esc(u.utcDay)}</b>. Cloudflare resets its daily limits at 00:00 UTC. Read-only: this page cannot change anything. ${u.connected && u.fetchedAt ? `Cloudflare numbers as of ${esc(String(u.fetchedAt).slice(0, 16))} UTC (cached up to 5 minutes).` : ""}
    Colors: <span class="tag warn">Watch</span> from 70%, <span class="tag bad">Warning</span> from 90%, <span class="tag bad">Limit reached</span> at 100%. Highest right now: <b>${worst}</b>. <button type="button" class="btn ghost" id="urefresh">Refresh now</button></p>
    ${u.limitHits.length ? `<div class="limitbanner" role="alert"><b>Limit hit at ${esc(String(u.limitHits[0].at).slice(0, 16))} UTC${u.limitHits.length > 1 ? ` (${u.limitHits.length} times in 24 hours)` : ""}.</b><span>${esc(String(u.limitHits[0].detail).slice(0, 200))}</span></div>` : ""}
    ${u.connected && !u.error ? "" : steps}
    ${u.missing.length ? `<p class="msg err">Cloudflare would not give some numbers: ${u.missing.map((x) => esc(x.what) + (x.permission ? ` (needs ${esc(x.permission)})` : "")).join("; ")}.</p>` : ""}
    ${grp("Today (UTC)", ["d1_rows_read", "d1_rows_written", "requests"])}
    ${u.cpu ? `<p class="meta">Today's Function CPU: ${fmt(u.cpu.exceeded)} requests stopped for using too much CPU, ${fmt(u.cpu.failed)} failed in all, of ${fmt(u.cpu.requests)}. The free plan allows 10 ms of CPU per request.</p>` : ""}
    ${grp("This month", ["r2_class_a", "r2_class_b"])}
    ${grp("Storage", ["d1_storage", "r2_storage"])}
    ${grp("Email (Resend, counted by this site)", ["email_day", "email_month"])}
    <p class="meta">Email counts only emails this site sent through Resend (one send each); Resend's own total also counts received mail. Check the Resend dashboard if the numbers disagree.</p>`;
  const b = $("#urefresh"); if (b) b.onclick = () => { main.dataset.urefresh = "1"; renderUsage(); };
}

/* ---------- reports: "Something wrong? Tell us" from visitors ---------- */
const rmCard = (r) => {
  const l = r.listing, done = r.status !== "open", pick = (m) => btn("ghost", `Remove: ${m.name || m.address}${m.city ? " (" + m.city + ")" : ""}`, `data-rm="approve" data-target="${esc(m.target)}"`);
  return rec({
    attrs: `data-rmid="${esc(r.id)}"`, title: "Remove a home: " + esc((l && l.name) || r.address || r.ref), meta: when(r.createdAt),
    tags: [[r.status === "open" ? "Waiting" : r.status === "done" ? "Removed" : "Declined", r.status === "open" ? "warn" : r.status === "done" ? "ok" : "bad"], ...(l && l.addedBy ? [["Added by an organizer", ""]] : [])],
    facts: fact("Contact", `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`) + (r.ref ? fact("Listing id", `<code>${esc(r.ref)}</code>`) : "") + (r.address ? fact("Typed", esc(r.address)) : "") + (r.note ? fact("Note", esc(r.note)) : "")
      + (l ? fact("Listing", esc([l.name, l.address, l.city].filter(Boolean).join(", "))) + (l.consent ? fact("Organizer confirmed", `${esc(l.consent.email)} on ${esc(l.consent.created_at)} (${l.consent.n} homes, wording ${esc(l.consent.version)})`) : "") : "")
      + (done ? fact("Handled", esc(r.handledAt || "") + (r.target ? ` · ${esc(r.target)}` : "") + (r.adminNote ? ` · ${esc(r.adminNote)}` : "")) : ""),
    body: !done && !l ? (r.matches.length ? `<p class="meta" style="margin:0">No listing id. Possible matches by address:</p><div class="row" style="gap:8px;flex-wrap:wrap">${r.matches.map(pick).join("")}</div>` : `<p class="meta" style="margin:0">No listing id and no address match. Search the Events tab by street, then close this request.</p>`) : "",
    main: done ? "" : l ? btn("main", "Approve and remove the listing", `data-rm="approve" data-target="${esc(l.target)}"`) : btn("ghost", "Nothing to remove, close it", 'data-rm="approve" data-nothing="1"'),
    danger: done ? "" : btn("danger", "Decline", 'data-rm="decline"'),
  });
};
async function renderReports() {
  const main = $("#main"), [list, rem] = await Promise.all([api("/api/admin/reports"), api("/api/admin/removals").catch(() => [])]);
  const open = rem.filter((r) => r.status === "open").length;
  setCount("reports", list.length + open);
  const removals = rem.length ? `<h2 style="font-size:18px;margin:6px 0">Remove my home requests (${open} waiting)</h2><p class="meta" style="margin:0 0 12px">A resident asked us to take a home off the site. Approve deletes the listing (and any photos), marks it done and emails the person. Decline emails them your note. Aim to answer within two business days.</p><div class="cards">${rem.map(rmCard).join("")}</div>` : "";
  const reports = list.length ? `${rem.length ? '<h2 style="font-size:18px;margin:18px 0 6px">Reports</h2>' : ""}<p class="meta" style="margin:0 0 12px">From the "Something wrong? Tell us" link on events and houses. Fix the event or house, then dismiss the report.</p><div class="cards">${list.map((r) => rec({
    attrs: `data-rid="${esc(r.id)}"`, title: esc(r.name || r.ref), tags: [["New", "warn"]], meta: when(r.created_at),
    body: `<p style="margin:0;white-space:pre-line">${esc(r.message)}</p>`, facts: fact("About", `<code>${esc(r.ref)}</code>`) + fact("Reply to", r.contact ? `<a href="mailto:${esc(r.contact)}">${esc(r.contact)}</a>` : "They left no email"),
    edit: btn("ghost", "Open Events", 'data-tab="events"'), danger: btn("danger", "Dismiss", "data-rdismiss"),
  })).join("")}</div>` : "";
  main.innerHTML = list.length || rem.length ? toolbar({ search: { placeholder: "Search reports" }, count: String(list.length + open) }) + removals + reports : `<div class="empty">No reports. Visitors can send one from the "Something wrong? Tell us" link on any event or house.</div>`;
  wireToolbar(main, { onSearch: (q) => filterCards(main, q) }); applyPreset(main);
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-rdismiss]"); if (!b) return;
  if (!tap(b, "dismiss")) return;
  const card = b.closest("[data-rid]"); b.disabled = true;
  try { await api("/api/admin/reports", { method: "POST", body: JSON.stringify({ id: card.dataset.rid, action: "dismiss" }) }); card.remove(); toast("Dismissed"); refreshCounts(); if (!document.querySelector("[data-rid]")) renderReports(); }
  catch (err) { b.disabled = false; card.querySelector(".msg").className = "msg err"; card.querySelector(".msg").textContent = err.message; }
});

$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-rm]"); if (!b) return;
  const card = b.closest("[data-rmid]"), act = b.dataset.rm;
  if (!tap(b, act === "approve" ? (b.dataset.nothing ? "close" : "remove") : "decline")) return;
  const body = { id: card.dataset.rmid, action: act };
  if (act === "approve") { if (b.dataset.target) body.target = b.dataset.target; if (b.dataset.nothing) body.nothing = true; }
  if (act === "decline") body.reason = prompt("A note for the person who asked (optional). It is included in the email.") || "";
  b.disabled = true;
  try { await api("/api/admin/removals", { method: "POST", body: JSON.stringify(body) }); toast(act === "approve" ? "Done. The person was emailed." : "Declined. The person was emailed."); refreshCounts(); renderReports(); }
  catch (err) { b.disabled = false; toast(err.message); }
});

// Every edit window closes the same way: the X, Cancel, Escape, or a tap outside it
const closeModal = () => { const m = $("#modal"); if (m && !m.hidden) { const x = m.querySelector("#mClose"); if (x) x.click(); else { m.hidden = true; m.innerHTML = ""; } } };
document.addEventListener("click", (e) => { if (e.target.closest("[data-mcancel]") || e.target === $("#modal")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* ---------- search everything (top bar) ---------- */
(() => {
  const box = $("#gs"), q = $("#gsq"), out = $("#gsr"), btn = $("#gsb");
  let t = 0, n = 0, flat = [], act = -1;
  const close = () => { out.hidden = true; q.setAttribute("aria-expanded", "false"); act = -1; };
  const ICON = { houses: "home", events: "event", subs: "event", installers: "pro", users: "user", contests: "trophy" };
  const go = async (g, it) => {
    close(); q.value = ""; box.classList.remove("open");
    if (g === "houses") { PRESET = it.title; setTab(it.status === "pending" ? "pending" : "approved"); }
    else if (g === "events") { evSeason = it.season || "christmas"; EVQ = it.title; setTab("events"); }
    else if (g === "subs") { PRESET = it.title; SUBVIEW = it.status === "published" ? "published" : it.status === "declined" ? "declined" : "pending"; setTab("subs"); }
    else if (g === "installers") { setTab("installers"); openInstaller(it.id); }
    else if (g === "users") { setTab("users"); openUser(it.id); }
    else if (g === "contests") { CSEARCH = it.title; CVIEW = it.flagged || it.status === "pending" ? "look" : it.status === "live" ? "live" : it.status === "declined" ? "declined" : "ended"; setTab("contests"); }
  };
  const paint = (groups) => {
    flat = []; out.innerHTML = groups.length ? groups.map((g) => `<div class="gsg"><div class="gsh">${esc(g.label)}</div>${g.items.map((it) => { flat.push([g.k, it]); return `<button type="button" role="option" class="gsi" data-i="${flat.length - 1}">${dico(ICON[g.k] || "home")}<span class="dt"><b>${esc(it.title)}</b><small>${esc(it.sub || "")}</small></span></button>`; }).join("")}</div>`).join("") : '<div class="gsn">Nothing found. Try a name, a city or an email.</div>';
    out.hidden = false; q.setAttribute("aria-expanded", "true"); act = flat.length ? 0 : -1; mark();
  };
  const mark = () => out.querySelectorAll(".gsi").forEach((b) => b.classList.toggle("on", +b.dataset.i === act));
  q.addEventListener("input", () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 2) return close(); t = setTimeout(async () => { const me = ++n; try { const d = await api("/api/admin/search?q=" + encodeURIComponent(v)); if (me === n && q.value.trim() === v) paint(d.groups); } catch {} }, 200); });
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); q.blur(); box.classList.remove("open"); }
    else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && flat.length) { e.preventDefault(); act = (act + (e.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length; mark(); const on = out.querySelector(".gsi.on"); if (on) on.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "Enter" && flat[act]) { e.preventDefault(); go(...flat[act]); }
  });
  out.addEventListener("click", (e) => { const b = e.target.closest(".gsi"); if (b) go(...flat[+b.dataset.i]); });
  document.addEventListener("click", (e) => { if (!box.contains(e.target) && !btn.contains(e.target)) { close(); box.classList.remove("open"); } });
  btn.onclick = () => { box.classList.add("open"); q.focus(); };
  document.addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $("#modal").hidden) { e.preventDefault(); box.classList.add("open"); q.focus(); q.select(); } });
})();
