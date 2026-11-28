// SoCal Lights admin: review houses, manage published posts, edit events.
import { CITY } from "/cities.js?v=20261115i";
import { SEASONS, defaultSeason } from "/seasons.js?v=20261115a";
import { attachAddress } from "/addflow.js?v=20261126a";
import { areaHtml, wireAreas } from "/areapick.js?v=20261102a";
import { renderEmails } from "/admin/emails.js?v=20261116b";
import { renderHelp } from "/admin/help.js?v=20261116b";
import { renderPartner } from "/admin/partner.js?v=20261116b";
import { renderChat } from "/admin/chat.js?v=20261128c";
import { renderGrok } from "/admin/grok.js?v=20261121b";
import { mdy, localTime, btn, rec, fact, toolbar, wireToolbar, filterCards, tap, toast, pager, modalFrame, phone, PAGE_PHONE, wireFold, sortSelect, askBox } from "/admin/kit.js?v=20261121a";
import { HEALTH, healthTest } from "/admin/health.js?v=20261113b";
import { pageHost } from "/admin/pagehost.js?v=20261116a";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
let evSeason = defaultSeason(TODAY);
const photo = (k) => "/api/admin/photo/" + k.split("/").map(encodeURIComponent).join("/");
// A small cover photo at the start of a list row (a camera icon when there is none). src: the picture's address.
const CAMI = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const thumb = (src) => `<span class="rthumb">${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : CAMI}</span>`;
const tcell = (src, inner) => `<div class="tcell">${thumb(src)}<div>${inner}</div></div>`;
let tab = "dashboard", PVIEW = "pending", EVENTS = [], POSTS = [], HSORT = "new", HOPEN = "", COPEN = "", INSTOPEN = "", UOPEN = "", NEXTVIEW = "";
const sortList = (list, key, by) => [...list].sort(by[key] || by.new);
const HSORTS = [["new", "Newest first"], ["old", "Oldest first"], ["name", "Name A to Z"], ["city", "City A to Z"]];
const HBY = { new: (a, b) => String(b.created || "").localeCompare(String(a.created || "")), old: (a, b) => String(a.created || "").localeCompare(String(b.created || "")), name: (a, b) => String(a.title || "").localeCompare(String(b.title || "")), city: (a, b) => String(a.city || "").localeCompare(String(b.city || "")) || String(a.title || "").localeCompare(String(b.title || "")) };
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

const TABS = ["dashboard", "pending", "subs", "claims", "orders", "partner", "contests", "passes", "reports", "approved", "events", "installers", "users", "overlaps", "data", "log", "usage", "outreach", "ads", "grok", "emails", "help", "chat"];
const TITLES = { dashboard: "Dashboard", pending: "Houses waiting", subs: "Submitted events", claims: "Event claims", orders: "Orders", partner: "Event Partners", contests: "Contests", passes: "Contest passes", reports: "Reports", approved: "Published houses", events: "Events", installers: "Installers", users: "Users", overlaps: "Replaced records", data: "Data check", log: "Activity log", usage: "Cloudflare usage", outreach: "Outreach", ads: "Ads", grok: "From Grok", emails: "Email templates", help: "Help Center", chat: "AI assistant" };
// The breadcrumb in the top bar: the menu group, the page, and (on a full record) the record's name
const groupOf = (t) => { const b = document.querySelector(`#side [data-tab="${t}"]`); if (!b) return ""; let n = b.closest(".grp"); n = n && n.previousElementSibling; while (n && !n.classList.contains("gh")) n = n.previousElementSibling; return n ? (n.dataset.grp || n.textContent.trim()) : ""; };
let detailOpen = false, NOBACK = false, DEEP = "";
// Which variable holds the open record on each page that has full-record pages, and how a link to one is opened
const RECORD_OPEN = { pending: () => HOPEN, contests: () => COPEN, subs: () => SUBOPEN, orders: () => OORDER, reports: () => RMOPEN };
const RECORD_SET = { pending: (v) => (HOPEN = v), contests: (v) => (COPEN = v), subs: (v) => (SUBOPEN = v), orders: (v) => (OORDER = v), reports: (v) => (RMOPEN = v), installers: (v) => (INSTOPEN = v), users: (v) => (UOPEN = v) };
const setDetail = (name) => {
  const d = $("#pdetail"); if (d) d.innerHTML = name ? `<span class="csep" aria-hidden="true">/</span><b>${esc(name)}</b>` : "";
  document.querySelector(".crumb").classList.toggle("has-detail", !!name);
  // The address names the open record (#pending/<id>), so it can be bookmarked or sent to someone
  const syncHash = () => { if (RECORD_OPEN[tab]) { const id = RECORD_OPEN[tab](), want = "#" + tab + (name && id ? "/" + encodeURIComponent(id) : ""); if (location.hash !== want) history.replaceState(history.state, "", want); } };
  if (!name) syncHash(); // closing: fix the address before going back; opening: after the history entry is pushed, so the list keeps its own address
  // A record is one step deeper: the phone's Back button returns to the list instead of leaving Admin
  if (name && !detailOpen) { detailOpen = true; history.pushState({ adm: 1 }, ""); }
  else if (!name && detailOpen) { detailOpen = false; if (!NOBACK && history.state && history.state.adm) history.back(); }
  if (name) syncHash();
};
window.addEventListener("popstate", () => { if (!detailOpen) return; detailOpen = false; const b = document.querySelector("#main .rback"); if (b) b.click(); });
document.addEventListener("admin:detail", (e) => setDetail(e.detail || ""));
const setCount = (k, v) => { COUNTS[k] = v; document.querySelectorAll(`[data-count="${k}"]`).forEach((el) => { el.textContent = v; el.hidden = !v && el.dataset.hide0 === "1"; const kind = el.classList.contains("act") ? " waiting" : " in total"; el.setAttribute("aria-label", v + kind); el.title = v + kind; }); paintTitle(); navPaint(); };
const COUNTS = {};
// The browser tab shows how many things are waiting, so a pinned admin tab can be glanced at
function paintTitle() { const w = (COUNTS.pending || 0) + (COUNTS.subs || 0) + (COUNTS.claims || 0) + (COUNTS.grok || 0) + (COUNTS.orders || 0) + (COUNTS.contests || 0) + (COUNTS.reports || 0); document.title = (w ? `(${w}) ` : "") + "SoCal Lights Admin"; const bd = $("#bdot"); if (bd) { bd.hidden = !w; $("#bell").title = w ? `${w} waiting` : "Nothing is waiting"; } }
// The desktop side menu: each group title (Review, Content, Money, Marketing, System) folds its items. On a short screen (a 1280x800 laptop shows only about half of the 25 items)
// every group starts folded except the one holding the open page, so all five titles are in view; on a tall screen they start open. A choice is remembered; opening a page opens its group.
// Folding only applies at 1100px and wider (the tablet rail and the phone sheet show everything).
const NAVKEY = "socal-admin-navfold";
const navHeads = [...document.querySelectorAll("#side .nvlist > p.gh")].map((p) => {
  const b = document.createElement("button"), grp = p.nextElementSibling, name = p.textContent.trim(); b.type = "button"; b.className = "gh"; b.dataset.grp = name;
  b.innerHTML = `<span>${esc(name)}</span><span class="cnt act gcnt" hidden></span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`; p.replaceWith(b); return { b, grp, name };
});
// The phone bottom bar has five buttons: Home, then Inbox, Listings, Customers and More open a sheet with that menu group (More holds Marketing and System)
const SHEETS = { inbox: ["Inbox"], listings: ["Listings"], customers: ["Customers"], more: ["Marketing", "System"] };
let navSaved = null; try { navSaved = JSON.parse(localStorage.getItem(NAVKEY)); } catch {}
const navFolded = new Set(Array.isArray(navSaved) ? navSaved : matchMedia("(max-height:899px)").matches ? navHeads.map((h) => h.name) : []);
// A folded group still shows what is waiting inside it (the red numbers of its items added together)
function navPaint() { navHeads.forEach(({ b, grp, name }) => { const f = navFolded.has(name); grp.classList.toggle("fold", f); b.setAttribute("aria-expanded", String(!f)); const n = [...grp.querySelectorAll(".cnt.act[data-count]:not([hidden])")].reduce((a, c) => a + (Number(c.textContent) || 0), 0), g = b.querySelector(".gcnt"); g.textContent = n; g.hidden = !(f && n); g.setAttribute("aria-label", n + " waiting in " + name); });
  // the phone bottom bar: a dot on Inbox / Listings / Customers / More when something inside is waiting
  for (const [key, names] of Object.entries(SHEETS)) { const dot = document.querySelector(`[data-grpdot="${key}"]`); if (!dot) continue; const n = navHeads.filter((h) => names.includes(h.name)).reduce((a, { grp }) => a + [...grp.querySelectorAll(".cnt.act[data-count]:not([hidden])")].reduce((x, c) => x + (Number(c.textContent) || 0), 0), 0); dot.hidden = !n; } }
function navOpen(t) { const h = navHeads.find((x) => x.grp.querySelector(`[data-tab="${t}"]`)); if (h && navFolded.has(h.name)) { navFolded.delete(h.name); navPaint(); } }
navHeads.forEach(({ b, name }) => (b.onclick = () => { navFolded.has(name) ? navFolded.delete(name) : navFolded.add(name); navPaint(); try { localStorage.setItem(NAVKEY, JSON.stringify([...navFolded])); } catch {} }));
navPaint();
function setTab(t, push = true) {
  navOpen(t);
  if (t !== tab || NEXTVIEW) { PVIEW = NEXTVIEW || "pending"; HOPEN = ""; COPEN = ""; OORDER = ""; NEXTVIEW = ""; }
  if (DEEP && RECORD_SET[t]) { RECORD_SET[t](DEEP); } DEEP = "";
  tab = t;
  document.querySelectorAll("[data-tab]").forEach((b) => { const on = b.dataset.tab === t; b.setAttribute("aria-current", on ? "page" : "false"); });
  paintBar(); // the bottom-bar button carrying the red line
  $("#ptitle").textContent = TITLES[t] || ""; $("#pgroup").textContent = groupOf(t); NOBACK = true; setDetail(""); NOBACK = false;
  closeSheet(); window.scrollTo(0, 0);
  if (push && location.hash.split("/")[0] !== "#" + t) history.replaceState(null, "", "#" + t);
  render();
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; if (b.dataset.pview) NEXTVIEW = b.dataset.pview; setTab(b.dataset.tab); }); // a card can open a tab on a given view (videos waiting)
{ const pb = $("#pmb"), pmenu = $("#pmenu"), shut = () => { pmenu.hidden = true; pb.setAttribute("aria-expanded", "false"); };
  pb.onclick = (e) => { e.stopPropagation(); pmenu.hidden = !pmenu.hidden; pb.setAttribute("aria-expanded", String(!pmenu.hidden)); };
  document.addEventListener("click", (e) => { if (!e.target.closest(".pm")) shut(); }); document.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(); }); }
const sheet = $("#side");
wireFold($("#main"));
// The red line on the phone bottom bar: on the menu that is open (while its sheet is up), otherwise on the page you are on (Home, or the menu group holding it)
function paintBar() {
  const open = document.body.dataset.sheet || "", gname = groupOf(tab);
  document.querySelectorAll(".bbar [data-tab]").forEach((b) => b.setAttribute("aria-current", !open && b.dataset.tab === tab ? "page" : "false"));
  document.querySelectorAll("[data-gsheet]").forEach((b) => b.setAttribute("aria-current", (open ? b.dataset.gsheet === open : SHEETS[b.dataset.gsheet].includes(gname)) ? "page" : "false"));
}
function closeSheet() {
  document.body.classList.remove("sheet-open"); delete document.body.dataset.sheet; document.querySelectorAll("[data-gsheet]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  navHeads.forEach(({ b, grp }) => { b.hidden = false; grp.hidden = false; }); const home = document.querySelector("#side .nvlist > .grp:first-child"); if (home) home.hidden = false; navPaint(); paintBar();
}
// Phone: open the sheet showing only the chosen menu group (the Home page has its own bar button)
function openSheet(key) {
  const want = SHEETS[key] || []; closeSheet();
  navHeads.forEach(({ b, grp, name }) => { const show = want.includes(name); b.hidden = !show; grp.hidden = !show; grp.classList.remove("fold"); });
  const home = document.querySelector("#side .nvlist > .grp:first-child"); if (home) home.hidden = true;
  document.body.classList.add("sheet-open"); document.body.dataset.sheet = key; document.querySelectorAll("[data-gsheet]").forEach((b) => b.setAttribute("aria-expanded", String(b.dataset.gsheet === key))); paintBar();
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-gsheet]"); if (!b) return; if (document.body.classList.contains("sheet-open") && b.getAttribute("aria-expanded") === "true") closeSheet(); else openSheet(b.dataset.gsheet); });
$("#scrim").onclick = closeSheet;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1).split("/")[0]; if (TABS.includes(h) && h !== tab) { try { DEEP = location.hash.split("/")[1] ? decodeURIComponent(location.hash.split("/")[1]) : ""; } catch { DEEP = ""; } setTab(h, false); } else if (h === "ads" && tab === "ads") renderAds(); else if (h === tab && RECORD_SET[h]) { let id = ""; try { id = location.hash.split("/")[1] ? decodeURIComponent(location.hash.split("/")[1]) : ""; } catch {} if (RECORD_OPEN[h] && id !== RECORD_OPEN[h]()) { RECORD_SET[h](id); render(); } } });

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
    if (tab === "partner") return renderPartner(main);
    if (tab === "contests" || tab === "passes") { if (tab === "passes") CVIEW = "passes"; else if (CVIEW === "passes") CVIEW = ""; return renderContests(); }
    if (tab === "overlaps") return renderOverlaps();
    if (tab === "installers") return renderInstallers();
    if (tab === "data") return renderData();
    if (tab === "users") return renderUsers();
    if (tab === "log") return renderLog();
    if (tab === "usage") return renderUsage();
    if (tab === "outreach") return renderOutreach();
    if (tab === "ads") return renderAds();
    if (tab === "emails") return renderEmails(main);
    if (tab === "help") return renderHelp(main);
    if (tab === "chat") return renderChat(main);
    if (tab === "grok") return renderGrok(main);
    return renderHouses();
  } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
// Houses: Houses waiting and Published houses share one page. A table, then a full record with a Back link.
async function renderHouses() {
  const main = $("#main"), pend = tab === "pending", contest = !pend && PVIEW === "contest";
  const [waiting, declined, cList, live] = await Promise.all([
    pend ? api("/api/admin/posts?status=pending") : [], pend ? api("/api/admin/posts?status=declined") : [],
    !pend ? api("/api/admin/posts?contest=1") : [], !pend ? api("/api/admin/posts?status=approved") : [],
  ]);
  if (pend) setCount("pending", waiting.length);
  const dec = pend && PVIEW === "declined", vids = !pend && PVIEW === "videos", waitVid = (x) => x.video_file && !x.video_ok, vcount = [...live, ...cList].filter(waitVid).length;
  const rows = sortList(pend ? (dec ? declined : waiting) : contest ? cList : vids ? [...live, ...cList].filter(waitVid) : live, HSORT, HBY);
  POSTS = pend ? [...waiting, ...declined] : [...live, ...cList]; if (pend) WAITH = waiting;
  const one = HOPEN && POSTS.find((p) => p.id === HOPEN); if (HOPEN && !one) HOPEN = "";
  const kv = (pairs) => `<div class="kv">${pairs.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join("")}</div>`;
  const stat = (p) => (p.contest ? ["Contest entry", ""] : dec ? ["Declined", "bad"] : pend ? ["Waiting", "warn"] : ["Published", "ok"]);
  if (one) { // the full record
    const p = one, st = stat(p), web = p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(p.web)}</a>` : "";
    const vacts = (p.video_file && !p.video_ok ? btn("main", "Approve video", 'data-act="video_approve"') : "") + (p.video_file || p.video ? btn("ghost", "Remove video", 'data-act="video_remove"') : "");
    const acts = vacts + btn("ghost", "Edit", `data-editpost="${esc(p.id)}"`) + (p.contest ? "" : btn("ghost", `Photos (${p.photos.length})`, `data-editpost="${esc(p.id)}" data-focus="photos"`))
      + (p.contest ? "" : dec ? btn("main", "Restore to waiting", 'data-act="restore"') + btn("danger", "Delete", 'data-act="delete"') : pend ? btn("main", "Approve and publish", 'data-act="approve"') + btn("danger", "Decline", 'data-act="decline"') : btn("ghost", "Unpublish", 'data-act="unpublish"') + btn("danger", "Remove from site", 'data-act="delete"'));
    const notes = [p.reviewNote ? `<b>Held for a look.</b> ${esc(p.reviewNote)}` : "", p.hiddenBySweep ?"<b>Not on the map.</b> You chose the sweep record for this address (Replaced records)." : "",
      p.claimed ? `<b>Says this is their home.</b> They tapped “Is this your home?” on “${esc(p.claimed.name)}”. ${p.claimed.matched ? (p.status === "pending" ? "The address matches, so approving replaces that listing." : "The address matches, so it replaces that listing on the map.") : "The addresses do not match, so it does not replace that listing. Check the street in Edit."}` : "",
      p.replaces ? `<b>Replaces a sweep record.</b> When you approve this, the automatic listing at the same address is hidden: ${p.replaces.map((r) => esc(r.name)).join("; ")}.` : "",
      p.nearby ? `Same street, different number (both stay listed): ${p.nearby.map((r) => esc(r.name + " (" + (r.address || "").split(",")[0] + ")")).join("; ")}.` : ""].filter(Boolean);
    setDetail(p.title);
    main.innerHTML = `<div class="rpage" data-id="${esc(p.id)}" data-name="${esc(p.title)}"><a class="rback" href="#${tab}" id="hBack"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to ${pend ? "houses waiting" : "published houses"}</a>
      <div class="pghead"><div><h2>House detail</h2></div><div class="pgacts">${acts}</div></div><span class="msg" role="status"></span>
      ${notes.length ? `<section class="rcard">${notes.map((n) => `<p class="meta" style="margin:0 0 6px;color:var(--ink)">${n}</p>`).join("")}</section>` : ""}
      <section class="rcard"><h3>Overview</h3>${kv([["Title", esc(p.title)], ["Status", `<span class="tag ${st[1]}">${st[0]}</span>`], ["Posted as", p.contest ? (p.byOrganizer ? (p.linked ? "Linked by homeowner" : "Added by organizer") : "Resident entry") : p.kind === "installer" ? "Installer" : "Homeowner"], ["Contest", esc(p.contest || "")], ["Name / business", esc(p.biz)], ["Received", p.created ? esc(localTime(p.created)) : ""]])}</section>
      <section class="rcard"><h3>Where</h3>${kv([["Street address", esc(p.address || "—") + ' <span class="meta">(shown on the map)</span>'], ["City", esc(p.city || "") + (p.county ? " · " + esc(p.county) : "")], ["Where", esc(p.where || "")]])}</section>
      <section class="rcard"><h3>Contact and about</h3>${kv([["Contact", `<span style="user-select:all">${esc(p.contact_email || "—")}</span>`], ["Public phone", esc(p.phone || "")], ["Website", web], ["Installed by", p.inst && p.kind !== "installer" ? esc(p.inst.name) + (p.inst.ok ? " (confirmed)" : " (claimed by the homeowner, not confirmed)") : ""], ["About", `<span style="white-space:pre-line">${esc(p.desc)}</span>`]])}</section>
      ${p.video_file || p.video ? `<section class="rcard"><h3>Video</h3>${p.video_file ? `<video controls playsinline preload="metadata" src="/api/admin/photo/${esc(p.video_file)}" style="display:block;max-width:480px;width:100%;border-radius:10px;background:#000"></video><p class="meta" style="margin:8px 0 0">${p.video_ok ? "Approved: visitors can watch it." : "Waiting for your approval. Visitors cannot see it yet."}</p>` : `<p style="margin:0">Link (shown at once): <a href="${esc(p.video)}" target="_blank" rel="noopener">${esc(p.video)}</a></p>`}</section>` : ""}
      ${p.contest ? "" : `<section class="rcard"><h3>Photos (${p.photos.length})</h3>${p.photos.length ? `<div class="pics">${p.photos.map((k) => `<a href="${photo(k)}" target="_blank" rel="noopener"><img src="${photo(k)}" alt="" loading="lazy"></a>`).join("")}</div>` : '<p class="meta" style="margin:0">No photos</p>'}</section>`}</div>`;
    window.scrollTo(0, 0); $("#hBack").onclick = (e) => { e.preventDefault(); HOPEN = ""; setDetail(""); renderHouses(); };
    return;
  }
  setDetail("");
  const tabs = pend ? [["pending", "Waiting", waiting.length], ["declined", "Declined", declined.length]] : [["pending", "Published", live.length], ["videos", "Videos waiting", vcount], ["contest", "Contest entries", cList.length]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === PVIEW}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>${pend ? "Houses waiting" : "Published houses"}</h2><p>${pend ? "Houses and installer posts people submitted. Open one to see its photos, then approve or decline it." : contest ? "Homes entered in a contest." : vids ? "Uploaded video clips waiting for your approval. A clip is hidden from visitors until you approve it; video links show at once." : "Houses and installer posts that are on the map."}</p></div></div>`;
  const bar = toolbar({ search: { placeholder: contest ? "Search entries, people, cities" : "Search houses, people, cities" }, right: sortSelect(HSORTS, HSORT) + (contest ? "" : dl("houses" + (pend ? (dec ? "&status=declined" : "&status=pending") : "&status=approved"))), count: String(rows.length) });
  const go = () => { wireToolbar(main.querySelector(".tbar"), { onSearch: (q) => filterCards(main, q), onSort: (v) => { HSORT = v; renderHouses(); } }); main.querySelectorAll(".pgtabs [data-view]").forEach((b) => (b.onclick = () => { PVIEW = b.dataset.view; renderHouses(); })); applyPreset(main); };
  if (!rows.length) { main.innerHTML = head + bar + `<div class="empty">${contest ? "No contest entries yet." : vids ? "No videos waiting for approval." : !pend ? "No published houses yet." : dec ? "Nothing declined." : "Nothing waiting for review."}</div>`; go(); return; }
  const bulk = pend && !dec && rows.length > 1 ? `<div class="bulk" id="bulk"><label class="chk"><input type="checkbox" id="selAll"> Select all</label><span class="grow"></span><span class="meta" id="selN"></span><button class="btn ice" type="button" id="bulkGo" hidden></button><button class="btn ghost" type="button" id="bulkClear" hidden>Clear</button></div>` : "";
  const cols = contest ? "<th>Entry</th><th>Contest</th><th>Posted by</th><th>Contact</th><th>Address</th>" : "<th>House</th><th>City</th><th>Posted as</th><th>Photos</th><th>Video</th><th>Received</th>";
  const cells = (p) => contest ? `<td>${tcell(p.photos[0] ? photo(p.photos[0]) : "", `<a class="rl" href="#${tab}" data-hopen="${esc(p.id)}">${esc(p.title)}</a>`)}</td><td>${esc(p.contest)}</td><td>${esc(p.biz)}</td><td>${esc(p.contact_email || "—")}</td><td>${esc(p.address || "—")}</td>`
    : `<td>${tcell(p.photos[0] ? photo(p.photos[0]) : "", `${pend && !dec ? `<input type="checkbox" class="rsel" data-sel="${esc(p.id)}" aria-label="Select ${esc(p.title)}"> ` : ""}<a class="rl" href="#${tab}" data-hopen="${esc(p.id)}">${esc(p.title)}</a><span class="sub">${esc(p.biz)}</span>`)}</td><td>${esc(p.city)}<span class="sub">${esc(p.county || "")}</span></td><td><span class="tag">${p.kind === "installer" ? "Installer" : "Homeowner"}</span></td><td data-label="Photos">${p.photos.length}</td><td data-label="Video">${p.video_file ? `<span class="tag ${p.video_ok ? "ok" : "warn"}">${p.video_ok ? "Clip live" : "Clip waiting"}</span>` : p.video ? '<span class="tag">Link</span>' : ""}</td><td data-label="Received">${esc(localTime(p.created))}</td>`;
  POSTS = pend ? [...waiting, ...declined] : contest ? cList : live;
  main.innerHTML = head + bar + bulk + `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr>${cols}<th class="ac">Actions</th></tr></thead><tbody>${rows.map((p) => `<tr data-id="${esc(p.id)}">${cells(p)}<td class="ac"><a class="rl" href="#${tab}" data-hopen="${esc(p.id)}">Open</a></td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${rows.length} ${contest ? "entr" + (rows.length === 1 ? "y" : "ies") : "house" + (rows.length === 1 ? "" : "s")}</span></div></div>`;
  main.querySelectorAll("[data-hopen]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); HOPEN = a.dataset.hopen; renderHouses(); }));
  go(); if (bulk) wireBulk(main);
}
function postCard(p) {
  const web = p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">${esc(p.web)}</a>` : "";
  const note = (c, t) => `<p class="meta" style="margin:0;color:var(--ink)">${t}</p>`;
  const pending = tab === "pending", dec = pending && PVIEW === "declined", ce = !!p.contest;
  if (ce) return rec({
    attrs: `data-id="${esc(p.id)}"`, title: esc(p.title), tags: [[p.status === "declined" ? "Contest entry: withdrawn or declined" : p.status === "pending" ? "Contest entry: waiting" : "Contest entry"], p.byOrganizer ? [p.linked ? "Linked by homeowner" : "Added by organizer", p.linked ? "ok" : "warn"] : ["Resident entry"]], meta: esc(p.contest),
    facts: fact("Name shown as Posted by", esc(p.biz)) + fact("Title", esc(p.title)) + fact("Contact", `<span style="user-select:all">${esc(p.contact_email || "—")}</span>`) + fact("Street address", esc(p.address || "—")) + fact("About", `<span style="white-space:pre-line">${esc(p.desc)}</span>`),
    edit: btn("ghost", "Edit", `data-editpost="${esc(p.id)}"`),
    danger: btn("danger", "Remove entry", 'data-act="delete"'),
  });
  return rec({
    attrs: `data-id="${esc(p.id)}"`, title: (pending && !dec ? `<input type="checkbox" class="rsel" data-sel="${esc(p.id)}" aria-label="Select ${esc(p.title)}">` : "") + esc(p.title), tags: [[p.kind === "installer" ? "Installer" : "Homeowner"], [dec ? "Declined" : pending ? "Waiting" : "Published", dec ? "bad" : pending ? "warn" : "ok"]], meta: esc(localTime(p.created)),
    lead: p.photos.length ? `<div class="pics">${p.photos.map((k) => `<a href="${photo(k)}" target="_blank" rel="noopener"><img src="${photo(k)}" alt="" loading="lazy"></a>`).join("")}</div>` : `<div class="meta">No photos</div>`,
    facts: fact("Name / business", esc(p.biz)) + fact("City", esc(p.city) + " · " + esc(p.county || "")) + fact("Contact", `<span style="user-select:all">${esc(p.contact_email || "—")}</span>`) + fact("Website", web || "—")
      + (p.inst && p.kind !== "installer" ? fact("Installed by", esc(p.inst.name) + (p.inst.ok ? " (confirmed)" : " (claimed by the homeowner, not confirmed)")) : "") + fact("Public phone", esc(p.phone || "—")) + fact("Street address", esc(p.address || "—") + ' <span class="meta">(shown on the map)</span>') + fact("Where", esc(p.where || "—")) + fact("About", `<span style="white-space:pre-line">${esc(p.desc)}</span>`),
    body: (p.reviewNote ? note(0, `<b>Held for a look.</b> ${esc(p.reviewNote)}`) : "") + (p.hiddenBySweep ? note(0, "<b>Not on the map.</b> You chose the sweep record for this address (Replaced records).") : "") + (p.claimed ? note(0, `<b>Says this is their home.</b> They tapped “Is this your home?” on “${esc(p.claimed.name)}”. ${p.claimed.matched ? (p.status === "pending" ? "The address matches, so approving replaces that listing." : "The address matches, so it replaces that listing on the map.") : "The addresses do not match, so it does not replace that listing. Check the street in Edit."}`) : "") + (p.replaces ? note(0, `<b>Replaces a sweep record.</b> When you approve this, the automatic listing at the same address is hidden: ${p.replaces.map((r) => esc(r.name)).join("; ")}.`) : "") + (p.nearby ? `<p class="meta" style="margin:0">Same street, different number (both stay listed): ${p.nearby.map((r) => esc(r.name + " (" + (r.address || "").split(",")[0] + ")")).join("; ")}.</p>` : ""),
    edit: btn("ghost", "Edit", `data-editpost="${esc(p.id)}"`) + btn("ghost", `Photos (${p.photos.length})`, `data-editpost="${esc(p.id)}" data-focus="photos"`),
    main: dec ? btn("main", "Restore to waiting", 'data-act="restore"') : pending ? btn("main", "Approve and publish", 'data-act="approve"') : btn("ghost", "Unpublish", 'data-act="unpublish"'),
    danger: dec ? btn("danger", "Delete", 'data-act="delete"') : pending ? btn("danger", "Decline", 'data-act="decline"') : btn("danger", "Remove from site", 'data-act="delete"'),
  });
}
// Pick several waiting houses and approve them in one go
function wireBulk(main) {
  const boxes = () => [...main.querySelectorAll("tbody tr:not([hidden]) .rsel")], picked = () => boxes().filter((b) => b.checked);
  const paint = () => { const n = picked().length; $("#selN").textContent = n ? `${n} selected` : ""; $("#bulkGo").hidden = !n; $("#bulkClear").hidden = !n; $("#bulkGo").textContent = `Approve ${n} house${n === 1 ? "" : "s"}`; $("#selAll").checked = n > 0 && n === boxes().length; };
  main.addEventListener("change", (e) => { if (e.target.matches(".rsel")) paint(); });
  const si = main.querySelector("[data-search]"); if (si) si.addEventListener("input", () => setTimeout(paint, 350)); // the count follows what the search leaves showing
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
const DONE = { approve: "Published", decline: "Declined", unpublish: "Unpublished", delete: "Removed", restore: "Back in the waiting list", video_approve: "Video approved: visitors can watch it", video_remove: "Video removed" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const card = b.closest("[data-id]"), id = card.dataset.id, act = b.dataset.act, msg = card.querySelector(".msg") || { set className(v) {}, set textContent(v) {} }, name = card.dataset.name || (card.querySelector("h3") || {}).textContent || "this house", extra = {};
  if (act === "decline") { const r = await askReason({ title: "Decline " + name, hint: "This is emailed to the person who added it. Leave it blank to send no reason." }); if (r === null) return; extra.reason = r; }
  else if ((act === "delete" || act === "unpublish") && !tap(b, act === "delete" ? "remove" : act)) return;
  const wasOpen = HOPEN === id && tab === "pending" && PVIEW === "pending" && (act === "approve" || act === "decline"), nextH = wasOpen ? nextIn(WAITH, id) : null;
  b.disabled = true; msg.className = "msg"; msg.textContent = act === "approve" ? "Publishing…" : "Working…";
  try {
    if (act === "delete") await api("/api/admin/posts/" + id, { method: "DELETE" });
    else await api("/api/admin/posts/" + id, { method: "POST", body: JSON.stringify({ action: act, ...extra }) });
    if (!act.startsWith("video_")) { HOPEN = nextH ? nextH.id : ""; setDetail(""); } // a video action keeps the record open; after a decision the next waiting house opens
    render(); refreshCounts();
    const undo = act === "decline" ? { action: "restore" } : act === "unpublish" ? { action: "approve", notify: false } : null;
    toast((DONE[act] || "Done") + (wasOpen ? nextNote(nextH) : ""), false, undo ? { undo: async () => { try { await api("/api/admin/posts/" + id, { method: "POST", body: JSON.stringify(undo) }); toast("Undone"); render(); refreshCounts(); } catch (er) { toast(er.message, true); } } } : {});
  } catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; toast(err.message, true); }
});

// An in-page window that asks for an optional reason (emailed to the person). Resolves to the text, or null when cancelled.
function askReason({ title, hint, go = "Decline" }) {
  return new Promise((done) => {
    const m = $("#modal"); m.hidden = false;
    m.innerHTML = modalFrame(title, `<form class="f" id="rsForm" novalidate>${fsec("Reason", "", ff("rs-t", "Why? (optional)", `<textarea id="rs-t" rows="3" maxlength="400" placeholder="For example: the photo is too dark to see the lights"></textarea>`, { hint: hint || "This is emailed to them. Leave it blank to send no reason." }))}<div class="mfoot"><button class="btn danger-solid" type="submit">${esc(go)}</button><button class="btn ghost" type="button" data-mcancel>Cancel</button></div></form>`);
    const end = (v) => { m.hidden = true; m.innerHTML = ""; done(v); };
    m.querySelector("#mClose").onclick = () => end(null); m.querySelector("[data-mcancel]").addEventListener("click", () => end(null), { once: true });
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
  </form>${transferBox("home", p.id)}</div>`;
  m.hidden = false; m.querySelector("#mClose").onclick = () => { close(); if (photosChanged) render(); };
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
let SUBS = [], SUBVIEW = "pending", SSORT = "new", WAITH = [], WAITS = [];
// After you decide a waiting record you were reading, the next waiting one opens, so a queue is a run of decisions (and the last one says so)
const nextIn = (list, id) => { const i = list.findIndex((r) => r.id === id); return i < 0 ? null : list[i + 1] || list[i - 1] || null; };
const nextNote = (n) => (n ? `. Next waiting: ${n.title || n.name}` : ". That was the last one waiting.");
const SSORTS = [["new", "Newest first"], ["old", "Oldest first"], ["date", "Event date, soonest first"], ["name", "Name A to Z"]];
const SBY = { new: (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")), old: (a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")), date: (a, b) => String(a.start_date || "").localeCompare(String(b.start_date || "")), name: (a, b) => String(a.name || "").localeCompare(String(b.name || "")) };
let SUBOPEN = "";
async function renderSubs() {
  const main = $("#main");
  const [waiting, live, declined] = await Promise.all([api("/api/admin/submissions?status=pending"), api("/api/admin/submissions?status=published"), api("/api/admin/submissions?status=declined")]);
  WAITS = waiting;
  SUBS = sortList(SUBVIEW === "pending" ? waiting : SUBVIEW === "declined" ? declined : live, SSORT, SBY);
  setCount("subs", waiting.length);
  const pend = SUBVIEW === "pending", all = [...waiting, ...live, ...declined], one = SUBOPEN && all.find((r) => r.id === SUBOPEN);
  if (SUBOPEN && !one) SUBOPEN = "";
  const actions = (x) => {
    const st = x.status === "pending" ? "pending" : x.status === "declined" ? "declined" : "published";
    return (st === "pending" ? btn("ghost", "Edit", `data-sedit="${esc(x.id)}"`) : "")
      + (st === "declined" ? btn("main", "Restore to waiting", 'data-sact="restore"') : st === "pending" ? btn("main", "Publish as confirmed", 'data-sact="approve" data-st="confirmed" title="You checked the dates and place with the organizer or the event page"') + btn("ghost", "Publish as expected", 'data-sact="approve" data-st="expected" title="Not checked yet: shown on the map as expected, to confirm later"') : (x.event_id && !x.event_status ? '<span class="meta" style="align-self:center">Taken off the map (deleted). Move it back to waiting to publish it again, or bring the event back under Events > Recently deleted.</span>' : x.event_id ? viewLink(x.event_id) : "") + (x.event_id && x.contact_email ? asLink("Edit as owner", "/profile", x.contact_email, "events") : "") + (x.event_id && x.event_status === "expected" ? btn("main", "Confirm dates", 'data-sact="confirm"') : "") + btn("ghost", x.event_id && !x.event_status ? "Move back to waiting" : "Unpublish", 'data-sact="unpublish"'))
      + (st === "pending" ? btn("danger", "Decline", 'data-sact="decline"') : "");
  };
  if (one) { // the full record: Back link, actions at the top right, cards
    const x = one, st = x.status === "pending" ? ["Waiting", "warn"] : x.status === "declined" ? ["Declined", "bad"] : ["Published", "ok"], kv = (pairs) => `<div class="kv">${pairs.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join("")}</div>`;
    setDetail(x.name); window.scrollTo(0, 0);
    main.innerHTML = `<div class="rpage" data-sid="${esc(x.id)}"><a class="rback" href="#subs" id="sBack"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to submitted events</a>
      <div class="pghead"><div><h2>Event detail</h2></div><div class="pgacts">${actions(x)}</div></div><span class="msg" role="status"></span>
      <section class="rcard"><h3>Overview</h3>${kv([["Name", esc(x.name)], ["Status", `<span class="tag ${st[1]}">${st[0]}</span>`], ["Season", esc(SEASONS[x.season] ? SEASONS[x.season].label : x.season)], ["Type", esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)], ["Dates", mdy(x.start_date) + (x.end_date !== x.start_date ? " to " + mdy(x.end_date) : "")], ["Hours", esc(x.hours || "no hours")], ["Price", esc(x.price || "")], ["Added", esc(localTime(x.created_at))]])}</section>
      <section class="rcard"><h3>Where</h3>${kv([["Venue", esc(x.venue)], ["Address", esc(x.address)], ["City", esc(x.city)], ["County", esc(x.county || "")], ["Pin", Number(x.lat) || Number(x.lng) ? `${Number(x.lat).toFixed(4)}, ${Number(x.lng).toFixed(4)}` : "No location yet (add the address)"]])}</section>
      <section class="rcard"><h3>Details and contact</h3>${kv([["About", esc(x.blurb)], ["Event page", x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>` : ""], ["Contact", `<span style="user-select:all">${esc(x.contact_email)}</span>`], ["Notes", esc(x.note || "")], ["Paid Featured", x.paid_plans ? `<b>${esc(x.paid_plans)}</b>` : ""]])}</section></div>`;
    $("#sBack").onclick = (e) => { e.preventDefault(); SUBOPEN = ""; setDetail(""); renderSubs(); };
    return;
  }
  setDetail("");
  const tabs = [["pending", "Waiting", waiting.length], ["published", "Live", live.length], ["declined", "Declined", declined.length]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === SUBVIEW}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>Submitted events</h2><p>Events added by organizers through the Add your event form. They go live right away unless something looks wrong; open a row to review, edit or unpublish it.</p></div><div class="pgacts">${dl("submissions")}</div></div>`;
  const bar = toolbar({ search: { placeholder: "Search events, cities" }, right: sortSelect(SSORTS, SSORT), count: String(SUBS.length) });
  const go = () => { wireToolbar(main.querySelector(".tbar"), { onSearch: (q) => filterCards(main, q), onSort: (v) => { SSORT = v; renderSubs(); } }); main.querySelectorAll(".pgtabs [data-view]").forEach((b) => (b.onclick = () => { SUBVIEW = b.dataset.view; renderSubs(); })); applyPreset(main); };
  if (!SUBS.length) { main.innerHTML = head + bar + `<div class="empty">${SUBVIEW === "pending" ? "Nothing waiting. New events go live right away; look under Live to review or unpublish them." : SUBVIEW === "declined" ? "Nothing declined." : "No submitted events are live."}</div>`; go(); return; }
  const sbulk = pend ? `<div class="bulk" id="sbulk" hidden><span class="meta" id="sSelN"></span><span class="grow"></span><button class="btn ice" type="button" id="sPubC" hidden></button><button class="btn ghost" type="button" id="sPubE" hidden></button><button class="btn ghost danger" type="button" id="sDec" hidden></button><button class="btn ghost" type="button" id="sClear" hidden>Clear</button></div>` : "";
  main.innerHTML = head + bar + sbulk + `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr>${pend ? '<th class="cb"><input type="checkbox" id="sAll" aria-label="Select all shown"></th>' : ""}<th>Event</th><th>City</th><th>Dates</th><th>Contact</th><th>Added</th><th class="ac">Actions</th></tr></thead><tbody>
    ${SUBS.map((x) => `<tr data-sid="${esc(x.id)}">${pend ? `<td class="cb"><input type="checkbox" class="rsel" data-ssel="${esc(x.id)}" aria-label="Select ${esc(x.name)}"></td>` : ""}<td>${tcell(x.cover, `<a class="rl" href="#subs" data-sopen="${esc(x.id)}">${esc(x.name)}</a><span class="sub">${esc(x.venue || "")}</span>`)}</td><td>${esc(x.city)}<span class="sub">${esc(x.county || "")}</span></td><td>${mdy(x.start_date)}${x.end_date !== x.start_date ? " to " + mdy(x.end_date) : ""}<span class="sub">${esc(x.hours || "no hours")}</span></td><td data-label="Contact">${esc(x.contact_email)}</td><td data-label="Added">${esc(localTime(x.created_at))}</td><td class="ac"><a class="rl" href="#subs" data-sopen="${esc(x.id)}">Open</a></td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${SUBS.length} event${SUBS.length === 1 ? "" : "s"}</span></div></div>`;
  main.querySelectorAll("[data-sopen]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); SUBOPEN = a.dataset.sopen; renderSubs(); }));
  go(); if (pend) wireSubsBulk(main);
}
// Pick several waiting events: publish them (confirmed or expected) or decline them in one go. A second tap confirms. Declines can be undone.
function wireSubsBulk(main) {
  const boxes = () => [...main.querySelectorAll("tbody tr:not([hidden]) .rsel")], picked = () => boxes().filter((b) => b.checked), idOf = (b) => b.dataset.ssel;
  const paint = () => { const n = picked().length, w = `${n} event${n === 1 ? "" : "s"}`; $("#sSelN").textContent = n ? `${n} selected` : ""; $("#sPubC").textContent = `Publish ${w} (confirmed)`; $("#sPubE").textContent = `Publish ${w} (expected)`; $("#sDec").textContent = `Decline ${w}`; ["sPubC", "sPubE", "sDec", "sClear"].forEach((id) => ($("#" + id).hidden = !n)); $("#sbulk").hidden = !n; $("#sAll").checked = n > 0 && n === boxes().length; };
  main.addEventListener("change", (e) => { if (e.target.matches(".rsel")) paint(); });
  $("#sAll").onchange = (e) => { boxes().forEach((b) => (b.checked = e.target.checked)); paint(); };
  $("#sClear").onclick = () => { boxes().forEach((b) => (b.checked = false)); paint(); };
  const run = async (btn, verb, body, undo) => {
    const ids = picked().map(idOf); if (!ids.length) return;
    if (body.action === "decline") { const r = await askReason({ title: `Decline ${ids.length} event${ids.length === 1 ? "" : "s"}`, hint: "This note is emailed to each person who added one. Leave it blank to send no reason. If someone paid for Featured, refund it under Orders." }); if (r === null) return; body = { ...body, reason: r }; }
    else if (!tap(btn, verb.replace("{n}", ids.length))) return;
    main.querySelectorAll("#sbulk button").forEach((b) => (b.disabled = true));
    const okIds = []; let failed = 0, skipped = 0;
    for (const [i, id] of ids.entries()) { btn.textContent = `Working ${i + 1} of ${ids.length}…`; try { await api("/api/admin/submissions/" + id, { method: "POST", body: JSON.stringify(body) }); okIds.push(id); } catch (er) { if (er.status === 409) skipped++; else failed++; } }
    const msg = `${okIds.length} event${okIds.length === 1 ? "" : "s"} ${body.action === "decline" ? "declined" : "published"}` + (skipped ? `, ${skipped} skipped (paid Featured: open each one to confirm)` : "") + (failed ? `, ${failed} could not be saved` : "");
    toast(msg, !okIds.length, undo && okIds.length ? { undo: async () => { let u = 0; for (const id of okIds) { try { await api("/api/admin/submissions/" + id, { method: "POST", body: JSON.stringify(undo) }); u++; } catch {} } toast(`Undone for ${u} event${u === 1 ? "" : "s"}`); renderSubs(); refreshCounts(); } } : {});
    renderSubs(); refreshCounts();
  };
  $("#sPubC").onclick = (e) => run(e.target, "publish {n} as confirmed", { action: "approve", status: "confirmed" }, null);
  $("#sPubE").onclick = (e) => run(e.target, "publish {n} as expected", { action: "approve", status: "expected" }, null);
  $("#sDec").onclick = (e) => run(e.target, "decline", { action: "decline" }, { action: "restore" });
  paint();
}
let photoKey = null;
document.addEventListener("keydown", (e) => photoKey && photoKey(e));
// A small edit window for records with a few plain fields (submitted events, waiting contests)
function editSimple({ title, fields, values, save }) {
  const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.hidden = false;
  const fld = (f) => ff("es-" + f.k, f.label, f.area ? `<textarea id="es-${f.k}" rows="3" maxlength="${f.max || 600}">${esc(values[f.k] || "")}</textarea>` : `<input id="es-${f.k}" type="${f.type || "text"}" maxlength="${f.max || 120}" value="${esc(values[f.k] || "")}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ""}>`, { c: f.wide ? "c6" : "c3" });
  m.innerHTML = modalFrame(title, `<form class="f" id="esForm" novalidate>${fsec("Details", "", fields.map(fld).join(""))}<div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="esMsg" role="status"></span></div></form>`, true);
  m.querySelector("#mClose").onclick = close;
  $("#esForm").onsubmit = async (e) => { e.preventDefault(); const body = {}; fields.forEach((f) => (body[f.k] = $("#es-" + f.k).value)); try { await save(body); close(); toast("Saved"); } catch (er) { const x = $("#esMsg"); x.className = "msg err"; x.textContent = er.message; } };
}
const SUBF = [{ k: "name", label: "Event name", wide: true }, { k: "venue", label: "Venue" }, { k: "address", label: "Address" }, { k: "city", label: "City" }, { k: "start_date", label: "Starts (YYYY-MM-DD)", max: 10 }, { k: "end_date", label: "Ends (YYYY-MM-DD)", max: 10 }, { k: "hours", label: "Hours" }, { k: "price", label: "Price" }, { k: "url", label: "Event page", type: "url", max: 300, wide: true }, { k: "contact_email", label: "Contact email", type: "email" }, { k: "blurb", label: "About", area: true, wide: true }];
const CONF = [{ k: "name", label: "Contest name", wide: true }, { k: "org", label: "Run by" }, { k: "city", label: "City" }, { k: "contact_email", label: "Organizer email", type: "email" }, { k: "site", label: "Website", type: "url", max: 200 }, { k: "entries_close", label: "Entries close (YYYY-MM-DD)", max: 10 }, { k: "vote_start", label: "Voting starts", max: 10 }, { k: "vote_end", label: "Voting ends", max: 10 }, { k: "descr", label: "Welcome message", area: true, wide: true, max: 1000 }];
$("#main").addEventListener("click", (e) => {
  const sb = e.target.closest("[data-sedit]"); if (sb) return editSubmission(SUBS.find((r) => r.id === sb.dataset.sedit));
  const cb = e.target.closest("[data-cedit]"); if (cb) { const x = CONTESTS.find((r) => r.id === cb.dataset.cedit); let cats = [], cd = {}; try { cats = JSON.parse(x.categories || "[]"); } catch {} try { cd = JSON.parse(x.category_desc || "{}"); } catch {}
    const catF = cats.map((k, i) => ({ k: "cd" + i, label: "About “" + k + "” (one line, shown under the category)", wide: true, max: 140 })), vals = { ...x, contact_email: x.contact_email || x.owner_email }; cats.forEach((k, i) => (vals["cd" + i] = cd[k] || ""));
    return editSimple({ title: "Edit contest", fields: [...CONF, ...catF], values: vals, save: async (b) => { const catDescs = {}; cats.forEach((k, i) => { delete b["cd" + i]; }); cats.forEach((k, i) => { const v = (vals["cd" + i] = $("#es-cd" + i).value.trim()); if (v) catDescs[k] = v; }); await api("/api/admin/contests/" + x.id, { method: "POST", body: JSON.stringify({ action: "edit", ...b, catDescs }) }); renderContests(); } }); }
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
const SDONE = { confirm: "Confirmed. The event now shows as Confirmed on the map.", approve: "Published", decline: "Declined. If they paid for Featured, refund it under Orders.", unpublish: "Unpublished", restore: "Back in the waiting list" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-sact]"); if (!b) return;
  const card = b.closest("[data-sid]"), msg = card.querySelector(".msg") || { set className(v) {}, set textContent(v) {} }, act = b.dataset.sact, id = card.dataset.sid, x = SUBS.find((r) => r.id === id) || {}, name = x.name || "this event", extra = {};
  if (act === "decline") { const r = await askReason({ title: "Decline " + name, hint: x.paid_plans ? `They already paid for Featured (${x.paid_plans}). After you decline, refund it in the Stripe dashboard (it is listed under Orders as refund due), then mark it refunded. This note is emailed to them.` : "This is emailed to the person who added it. Leave it blank to send no reason." }); if (r === null) return; extra.reason = r; }
  else if (act === "unpublish" && !tap(b, "unpublish")) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try {
    const post = (more = {}) => api("/api/admin/submissions/" + id, { method: "POST", body: JSON.stringify({ action: act, status: b.dataset.st, ...extra, ...more }) });
    try { await post(); } catch (er) { if (er.status === 409 && er.data && er.data.code === "paid_placement" && (await askBox({ title: "This event has a paid placement", message: er.message, go: "Confirm" }))) await post({ confirm: true }); else throw er; } // a paid placement needs an explicit yes
    const undo = act === "decline" ? { action: "restore" } : act === "unpublish" ? { action: "approve", status: x.verified ? "confirmed" : "expected", notify: false } : null;
    const nextS = SUBOPEN === id && SUBVIEW === "pending" && (act === "approve" || act === "decline") ? nextIn(WAITS, id) : null, wasOpenS = SUBOPEN === id && SUBVIEW === "pending" && (act === "approve" || act === "decline");
    SUBOPEN = nextS ? nextS.id : ""; toast((SDONE[act] || "Done") + (wasOpenS ? nextNote(nextS) : ""), false, undo ? { undo: async () => { try { await api("/api/admin/submissions/" + id, { method: "POST", body: JSON.stringify(undo) }); toast("Undone"); renderSubs(); refreshCounts(); } catch (er) { toast(er.message, true); } } } : {});
    renderSubs(); refreshCounts();
  } catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
});

/* ---------- event claims ("this event is mine": approving makes the person the event's manager, see functions/_lib/claimgrant.js) ---------- */
let CLVIEW = "pending";
// The event page as a short link: the host name shows, the full address is the tooltip (a long address used to stretch the whole table)
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return String(u).slice(0, 40); } };
async function renderClaims() {
  const main = $("#main"), [pend, ok, no] = await Promise.all(["pending", "approved", "declined"].map((s) => api("/api/admin/claims?status=" + s)));
  const rows = CLVIEW === "pending" ? pend : CLVIEW === "declined" ? no : ok;
  setCount("claims", pend.length); setDetail("");
  const tabs = [["pending", "Waiting", pend.length], ["approved", "Approved", ok.length], ["declined", "Declined", no.length]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === CLVIEW}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>Event claims</h2><p>Someone says an event is theirs. <b>Approving makes them the event's manager:</b> it appears in their profile under Events, where they can edit it, add a ticket link, photos and a video clip, and buy Featured for it. They are emailed once, whether you approve or decline. Declining gives no access.</p></div><div class="pgacts">${dl("claims")}</div></div>`;
  const wire = () => main.querySelectorAll(".pgtabs [data-view]").forEach((b) => (b.onclick = () => { CLVIEW = b.dataset.view; renderClaims(); }));
  if (!rows.length) { main.innerHTML = head + `<div class="empty">${CLVIEW === "pending" ? "No claims waiting." : "Nothing here."}</div>`; wire(); return; }
  const st = (x) => (x.status === "pending" ? ["Waiting", "warn"] : x.status === "approved" ? ["Approved", "ok"] : ["Declined", "bad"]);
  const how = (x) => (x.status === "pending" ? "" : x.method === "domain" ? "automatic (website match)" : x.method === "admin" ? "by Admin" : x.method ? "by " + x.method : "") + (x.decided_at ? (x.method ? " · " : "") + localTime(x.decided_at) : "");
  main.innerHTML = head + `<div class="card dtc"><div class="dtw"><table class="dtab claims"><thead><tr><th>Event</th><th>Claimed by</th><th>Event page</th><th>Added</th><th>Status</th><th class="ac">Actions</th></tr></thead><tbody>${rows.map((x) => `<tr data-clid="${esc(x.id)}"><td>${tcell(x.cover, `<b>${esc(x.name || x.event_id)}</b><span class="sub">${esc(x.city || "")}</span><span class="clst"><span class="tag ${st(x)[1]}">${st(x)[0]}</span></span>`)}</td><td class="clwho"><span style="user-select:all">${esc(x.claimant).replace("@", "@<wbr>")}</span></td><td>${x.url ? `<a class="rl clhost" href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.url)}">${esc(hostOf(x.url))}</a>` : "None"}</td><td>${esc(localTime(x.created_at))}</td><td><span class="tag ${st(x)[1]}">${st(x)[0]}</span>${how(x) ? `<span class="sub">${esc(how(x))}</span>` : ""}</td><td class="ac"><div class="racts">${x.status !== "approved" ? btn("main", "Approve", 'data-clact="approve"').replace('class="btn ice"', 'class="btn ice sm"') : ""}${x.status !== "declined" ? btn("danger", "Decline", 'data-clact="decline"').replace('class="btn ghost danger"', 'class="btn ghost danger sm"') : ""}</div></td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${rows.length} claim${rows.length === 1 ? "" : "s"}</span></div></div>`;
  wire();
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-clact]"); if (!b) return;
  if (!tap(b, b.dataset.clact)) return; // a second tap decides: the person is emailed once
  const card = b.closest("[data-clid]"); b.disabled = true;
  try { const r = await api("/api/admin/claims/" + card.dataset.clid, { method: "POST", body: JSON.stringify({ action: b.dataset.clact }) }); toast((b.dataset.clact === "approve" ? "Approved" : "Declined") + (r && r.emailed ? " and emailed" : " (no email sent)")); renderClaims(); refreshCounts(); } catch (er) { b.disabled = false; toast(er.message, true); }
});

/* ---------- Featured orders: money that needs the owner (refunds to make, disputes, placements that did not apply) ---------- */
let OVIEW = "attention", OORDER = "", OPICKED = false; // OPICKED: once the person chooses a tab, stop choosing for them
const OFLAG = { refund_due: ["Refund due", "bad"], disputed: ["Disputed", "bad"], held: ["Partial refund", "warn"], unapplied: ["Not applied", "bad"], differs: ["Placement differs", "warn"], mismatch: ["Amount differs", "warn"], note: ["See note", "warn"], cancelled: ["Event cancelled", "warn"] };
// Event plans (current: ev_*; old: pin, top, season stay for orders already paid) and what each contains. Installer plans have their own names (INST_PLAN).
const PLAN_NAME = { ev_pin: "Featured pin", ev_banner: "Banner + Featured pin", ev_top: "Top of the list + Featured pin", ev_all: "Top of the list + Banner + Featured pin", pin: "Featured pin (old plan)", top: "Top of the list (old plan)", season: "Full run (old plan)" };
const PLAN_PARTS = { ev_pin: "pin", ev_banner: "pin + banner", ev_top: "pin + top of the list", ev_all: "pin + banner + top of the list", pin: "pin", top: "pin + top of the list", season: "pin + top of the list" };
const INST_PLAN = { banner: "Banner", top: "Top of the list", banner_top: "Banner and top of the list" };
const OSTATUS = { paid: ["Paid", "ok"], refunded: ["Refunded", ""], disputed: ["Disputed", "bad"], dispute_won: ["Dispute won", ""], held: ["Held", "warn"], refund_due: ["Refund due", "bad"] };
const money = (c, cur) => (c == null ? "" : (cur && cur !== "usd" ? cur.toUpperCase() + " " : "$") + (c / 100).toFixed(2));
async function renderOrders() {
  const main = $("#main"), all = await api("/api/admin/orders"), rn = await api("/api/admin/renewals").catch(() => null), rv = await api("/api/admin/revenue?days=30").catch(() => null);
  const RG = { upcoming: ["Upcoming", "ok"], failed: ["Charge failed", "bad"], overdue: ["Overdue: run the job", "bad"], lapsed: ["Lapsed", "bad"], paused: ["Paused", "warn"], cancelled: ["Cancelled", ""] };
  if (OVIEW === "attention" && !OPICKED && !all.some((o) => o.flags.length)) OVIEW = all.length ? "all" : "attention"; // nothing needs you: open on the full list instead of an empty page
  const need = all.filter((o) => o.flags.length), rows = OVIEW === "attention" ? need : OVIEW === "paid" ? all.filter((o) => o.status === "paid") : OVIEW === "closed" ? all.filter((o) => o.status !== "paid") : all;
  setCount("orders", need.length);
  const rnRows = rn && rn.rows.length ? rn.rows : [];
  const oData = (o) => {
    const st = OSTATUS[o.status] || [o.status, ""], due = ["refund_due", "held", "disputed"].includes(o.status);
    return {
      attrs: `data-oid="${esc(o.session_id)}" data-onote="${esc(o.note || "")}"`, title: esc(o.target === "contest_pass" || o.target === "event_partner" ? orgLabelOf(o.event_id) : o.name || o.event_id), tags: [st, ...(o.target === "event_partner" ? [["Event Partner", ""]] : o.target === "contest_pass" ? [["Contest pass", ""]] : o.target === "home" ? [["Featured home", ""]] : o.target === "installer" ? [["Installer: " + (INST_PLAN[o.plan] || o.plan).toLowerCase(), ""], ...(o.renewal ? [["Auto-renewal", ""]] : [])] : []), ...o.flags.filter((f) => !(f === "refund_due" || f === "disputed" || f === "held")).map((f) => OFLAG[f] || [f, "warn"])], meta: esc(localTime(o.created_at)),
      facts: o.target === "event_partner" ? fact("Organization", `${esc(orgLabelOf(o.event_id))} · <a href="/admin/#partner">Event Partners</a>`) + fact("Plan", `Event Partner · <b>${esc(money(o.amount, o.currency))}</b>`) + fact("Season", o.applied_from ? `${esc(pdate(o.applied_from))} to ${esc(pdate(o.applied_until))}` : "") + fact("Payment", o.stripe_url ? `<a href="${esc(o.stripe_url)}" target="_blank" rel="noopener">${esc(o.payment_intent)} in Stripe</a>` : "") + fact("Note", esc(o.note || ""))
      : o.target === "contest_pass" ? fact("Organization", `${esc(orgLabelOf(o.event_id))} · <a href="/admin/#contests">Contest passes</a>`) + fact("Pass", `Up to ${esc(o.pass_cap)} contests · <b>${esc(money(o.amount, o.currency))}</b> <span class="meta">(${esc(o.pass_status || "not applied")})</span>`) + fact("Window", o.pass_from ? `${esc(pdate(o.pass_from))} to ${esc(pdate(o.pass_to))}` : "") + fact("Payment", o.stripe_url ? `<a href="${esc(o.stripe_url)}" target="_blank" rel="noopener">${esc(o.payment_intent)} in Stripe</a>` : "") + fact("Note", esc(o.note || ""))
      : fact("Plan", `${esc(o.target === "installer" ? INST_PLAN[o.plan] || o.plan : PLAN_NAME[o.plan] || o.plan)} · <b>${esc(money(o.amount, o.currency))}</b>${o.target === "event" && PLAN_PARTS[o.plan] ? ` <span class="meta">(${esc(PLAN_PARTS[o.plan])})</span>` : ""}`) + fact("Placement", o.target === "installer" ? (o.applied ? `${esc(o.applied_from || "")} to ${[o.applied_until ? `banner until ${esc(o.applied_until)}` : "", o.applied_top_until ? `top of the list until ${esc(o.applied_top_until)}` : ""].filter(Boolean).join(", ")} (installer now: banner ${esc(o.inst_banner || "off")}, top ${esc(o.inst_top || "off")})` : "not on the installer yet") : o.applied ? `level ${esc(o.applied_featured)} until ${esc(o.applied_until || "the end")}${o.applied_banner_until ? `, banner until ${esc(o.applied_banner_until)}` : ""}${o.ev_featured || o.ev_banner ? ` (${o.target === "home" ? "home" : "event"} now: level ${esc(o.ev_featured || 0)} until ${esc(o.ev_until || "the end")}${o.target === "event" ? `, banner ${esc(o.ev_banner || "off")}` : ""})` : ` (${o.target === "home" ? "home" : "event"} now: not featured)`}` : `not on the ${o.target === "home" ? "home" : "event"} yet`)
        + (o.target === "installer" ? fact("Installer", `<a href="/admin/#installers">${esc(o.name || o.event_id)}</a>${o.inst_slug ? ` · <a href="/installer/${esc(o.inst_slug)}" target="_blank" rel="noopener">public page</a>` : ""}`) : o.target === "home" ? fact("Home", esc([o.city, o.contest_name && "podium of " + o.contest_name, o.event_id].filter(Boolean).join(" · "))) : fact("Event", esc([o.city, o.start_date && o.end_date ? (o.start_date === o.end_date ? o.start_date : o.start_date + " to " + o.end_date) : "", o.notice && o.notice.toUpperCase(), String(o.event_id).startsWith("sub:") ? "waiting for approval (payment held; it switches on when you approve the event)" : o.event_id].filter(Boolean).join(" · ")))) + fact("Buyer", `<span style="user-select:all">${esc(o.email)}</span>`)
        + fact("Payment", o.stripe_url ? `<a href="${esc(o.stripe_url)}" target="_blank" rel="noopener">${esc(o.payment_intent)} in Stripe</a>` : "") + fact("Note", esc(o.note || "")),
      edit: btn("ghost", o.note ? "Edit note" : "Add note", 'data-oact="note"') + (["paid", "refund_due", "held"].includes(o.status) && o.payment_intent ? btn("danger", "Refund in Stripe", 'data-oact="refund_stripe"') : ""),
      body: due ? '<p class="meta" style="margin:0">Use <b>Mark refunded</b> only after you refunded the payment in the Stripe dashboard. The button does not refund anything.</p>' : "",
      main: due ? btn("main", "Mark refunded", 'data-oact="mark_refunded"') : o.status === "paid" && !o.applied ? btn("main", "Apply now", 'data-oact="reapply"') + (o.payment_intent ? "" : btn("ghost", "Mark refunded", 'data-oact="mark_refunded"')) : "",
    };
  };
  const oneO = OORDER && all.find((o) => o.session_id === OORDER); if (OORDER && !oneO) OORDER = "";
  const kv = (html) => `<dl class="facts">${html}</dl>`;
  if (oneO) { // the full record
    const o = oneO, d = oData(o), nm = o.target === "contest_pass" || o.target === "event_partner" ? orgLabelOf(o.event_id) : o.name || o.event_id;
    setDetail(nm);
    main.innerHTML = `<div class="rpage" data-oid="${esc(o.session_id)}" data-onote="${esc(o.note || "")}" data-name="${esc(nm)}"><a class="rback" href="#orders" id="oBack"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to orders</a>
      <div class="pghead"><div><h2>Order detail</h2></div><div class="pgacts">${d.edit}${d.main}</div></div><span class="msg" role="status"></span>
      ${d.body ? `<section class="rcard">${d.body}</section>` : ""}
      <section class="rcard"><h3>${esc(nm)}</h3><div class="rt" style="margin:0 0 10px">${d.tags.map(([l, t]) => `<span class="tag ${t || ""}">${esc(l)}</span>`).join(" ")}</div>${kv(d.facts)}<p class="meta" style="margin:10px 0 0">${d.meta}</p></section></div>`;
    window.scrollTo(0, 0); $("#oBack").onclick = (e) => { e.preventDefault(); OORDER = ""; setDetail(""); renderOrders(); };
    return;
  }
  setDetail("");
  const tabs = [["attention", "Needs attention", need.length], ["paid", "Paid", all.filter((o) => o.status === "paid").length], ["closed", "Refunded and disputed", all.filter((o) => o.status !== "paid").length], ["all", "All", all.length], ["renewals", "Renewals", rnRows.length]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === OVIEW}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>Orders</h2><p>${OVIEW === "renewals" ? "Automatic installer renewals. Read-only." + (rn ? ` ${rn.counts.upcoming} upcoming, ${rn.counts.overdue} overdue, ${rn.counts.failed} failed, ${rn.counts.lapsed} lapsed, ${rn.counts.paused} paused.` : "") : "Featured placements and passes people paid for. Open one to see the payment, mark a refund or add a note."}</p></div><div class="pgacts">${dl("orders")}</div></div>`;
  const wire = () => { wireToolbar(main, { onView: (v) => { OVIEW = v; OPICKED = true; renderOrders(); }, onSearch: (q) => filterCards(main, q) }); main.querySelectorAll("[data-oopen]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); OORDER = a.dataset.oopen; renderOrders(); })); };
  if (OVIEW === "renewals") {
    main.innerHTML = revenueStrip(rv) + head + toolbar({ search: { placeholder: "Search installers" }, count: String(rnRows.length) }) + (rnRows.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Installer</th><th>Plan</th><th>Next charge</th><th>Reminder sent</th><th>Retry</th><th>Status</th></tr></thead><tbody>${rnRows.map((r) => { const g = RG[r.group] || [r.group, ""]; return `<tr><td><b>${esc(r.name || r.installer_id)}</b><span class="sub">${esc(r.last_error || "")}</span></td><td>${esc(INST_PLAN[r.plan] || "Banner")}<span class="sub">${esc(money(r.price_cents))}</span></td><td>${esc(r.next_charge_date || "")}</td><td>${r.notice_sent_for ? "yes" : "not yet"}</td><td>${esc(r.retry_at || "")}</td><td><span class="tag ${g[1]}">${esc(g[0])}</span></td></tr>`; }).join("")}</tbody></table></div></div>` : `<div class="empty">No automatic renewals.</div>`);
    wire(); return;
  }
  const bar = toolbar({ search: { placeholder: "Search orders, emails" }, count: String(rows.length) });
  if (!rows.length) { main.innerHTML = revenueStrip(rv) + head + bar + `<div class="empty">${OVIEW === "attention" ? "Nothing needs you. Refunds you still have to make, disputes, partial refunds and placements that did not switch on show up here." : "No orders here yet."}</div>`; wire(); return; }
  const listingOf = (o) => (o.target === "event" ? "/e/" + encodeURIComponent(o.event_id) : o.target === "installer" && o.inst_slug ? "/installer/" + encodeURIComponent(o.inst_slug) : ""); // the public page this order paid for, one tap from the list
  const kind = (o) => (o.target === "event_partner" ? "Event Partner" : o.target === "contest_pass" ? "Contest pass" : o.target === "home" ? "Featured home" : o.target === "installer" ? "Installer" : "Event");
  main.innerHTML = revenueStrip(rv) + head + bar + `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Order</th><th>Type</th><th>Amount</th><th>Buyer</th><th>Status</th><th>Date</th><th class="ac">Actions</th></tr></thead><tbody>${rows.map((o) => { const d = oData(o), nm = o.target === "contest_pass" || o.target === "event_partner" ? orgLabelOf(o.event_id) : o.name || o.event_id; return `<tr data-oid="${esc(o.session_id)}" data-onote="${esc(o.note || "")}" data-name="${esc(nm)}"><td>${tcell(o.cover, `<a class="rl" href="#orders" data-oopen="${esc(o.session_id)}">${esc(nm)}</a><span class="sub">${esc(o.city || "")}</span>`)}</td><td>${kind(o)}<span class="sub">${esc(o.target === "installer" ? INST_PLAN[o.plan] || o.plan : PLAN_NAME[o.plan] || "")}</span></td><td>${esc(money(o.amount, o.currency))}</td><td><span style="user-select:all">${esc(o.email || "")}</span></td><td>${d.tags.filter((t, i) => i === 0 || o.flags.includes(t[0]) || true).slice(0, 1).map(([l, t]) => `<span class="tag ${t || ""}">${esc(l)}</span>`).join("")}${o.flags.filter((f) => !(f === "refund_due" || f === "disputed" || f === "held")).map((f) => OFLAG[f] || [f, "warn"]).map(([l, t]) => ` <span class="tag ${t}">${esc(l)}</span>`).join("")}</td><td>${esc(localTime(o.created_at))}</td><td class="ac"><div class="racts"><a class="rl" href="#orders" data-oopen="${esc(o.session_id)}">Open</a>${listingOf(o) ? `<a class="rl" href="${esc(listingOf(o))}" target="_blank" rel="noopener" aria-label="View the listing on the site (opens in a new tab)">View listing ↗</a>` : ""}${d.main.replace('class="btn ice"', 'class="btn ice sm"')}</div></td></tr>`; }).join("")}</tbody></table></div><div class="pager"><span class="meta">${rows.length} order${rows.length === 1 ? "" : "s"}</span></div></div>`;
  wire();
}
/* Transfer to another account (F-10b): by the new owner's email, two taps, logged by the server */
const transferBox = (kind, id) => `<details class="xfer" style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Transfer to another account</summary><p class="meta" style="margin:8px 0">Gives this ${kind} to the person who signs in with the email below (they need an account already). The old owner loses access.</p><div class="mfoot" style="margin-top:0"><input type="email" data-xemail aria-label="New owner's email" placeholder="name@example.com" style="flex:1;min-width:200px"><button class="btn ghost" type="button" data-xfer="${kind}|${esc(id)}">Transfer</button></div><span class="msg" role="status"></span></details>`;
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-xfer]"); if (!b) return;
  const box = b.closest(".xfer"), email = box.querySelector("[data-xemail]").value.trim(), msg = box.querySelector(".msg"), [kind, id] = b.dataset.xfer.split("|");
  if (!email) { msg.className = "msg err"; msg.textContent = "Enter the new owner's email."; return; }
  if (!tap(b, "transfer")) return;
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try { const d = await api("/api/admin/transfer", { method: "POST", body: JSON.stringify({ kind, id, email }) }); msg.textContent = "Transferred to " + d.to + "." + (d.note ? " " + d.note : ""); toast("Transferred"); }
  catch (er) { msg.className = "msg err"; msg.textContent = er.message; }
  b.disabled = false;
});
function askNote(title, value) {
  return new Promise((done) => {
    const m = $("#modal"); m.hidden = false;
    m.innerHTML = modalFrame(title, `<form class="f" id="rsForm" novalidate>${fsec("Note", "", ff("on-t", "Your note", `<textarea id="on-t" rows="4" maxlength="500">${esc(value)}</textarea>`, { hint: "Saving your own note marks an automatic warning as seen." }))}<div class="mfoot"><button class="btn ice" type="submit">Save note</button><button class="btn ghost" type="button" data-mcancel>Cancel</button></div></form>`);
    const end = (v) => { m.hidden = true; m.innerHTML = ""; done(v); };
    m.querySelector("#mClose").onclick = () => end(null); m.querySelector("[data-mcancel]").addEventListener("click", () => end(null), { once: true });
    $("#rsForm").onsubmit = (e) => { e.preventDefault(); end($("#on-t").value.trim()); }; $("#on-t").focus();
  });
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-oact]"); if (!b) return;
  const card = b.closest("[data-oid]"), act = b.dataset.oact, name = card.dataset.name || "this order", msg = card.querySelector(".msg") || { set className(v) {}, set textContent(v) {} }, body = { action: act };
  if (act === "mark_refunded" && !tap(b, "mark refunded")) return; // the card says: only after refunding in Stripe; this button refunds nothing
  if (act === "refund_stripe" && !tap(b, "refund this payment in Stripe")) return; // second tap: the whole payment goes back to the buyer through Stripe
  if (act === "note") { const v = await askNote("Note for " + name, card.dataset.onote); if (v === null) return; body.note = v; }
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try { const d = await api("/api/admin/orders/" + encodeURIComponent(card.dataset.oid), { method: "POST", body: JSON.stringify(body) }); toast(act === "mark_refunded" || act === "refund_stripe" ? (act === "refund_stripe" ? "Refunded in Stripe. " : "") + (d.placement_differs ? "Marked refunded. The placement was left on: check it" : "Marked refunded") : act === "reapply" ? "Applied" : "Note saved"); renderOrders(); refreshCounts(); }
  catch (er) { b.disabled = false; msg.className = "msg err"; msg.textContent = er.message; toast(er.message, true); }
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
  setCount("contestsAll", CONTESTS.filter((c) => c.status !== "declined").length); // the plain total beside the name, like Installers and Users
  if (!CVIEW) CVIEW = n.look ? "look" : n.live ? "live" : n.ended ? "ended" : "declined"; // only the first time: picking "Needs a look" with nothing in it shows the empty note instead of jumping away
  const list = g(CVIEW), one = COPEN && CONTESTS.find((c) => c.id === COPEN); if (COPEN && !one) COPEN = "";
  const label = (c) => (c.status === "live" ? (c.announced ? "Winners announced" : "Live") : c.status === "declined" ? "Unpublished" : c.status === "pending" ? "Waiting" : "Ended");
  const tone = (c) => (c.status === "live" ? "ok" : c.status === "declined" ? "bad" : c.status === "pending" ? "warn" : "");
  if (one && CVIEW !== "passes") { // the full record
    const c = one, kv = (pairs) => `<div class="kv">${pairs.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join("")}</div>`;
    const acts = (c.owner_email ? asLink("Edit as owner", "/c/" + c.slug + "/manage") : "") + btn("ghost", "Edit", `data-cedit="${esc(c.id)}"`) + btn("ghost", "Sponsors", `data-csp="${esc(c.id)}"`)
      + (c.status === "live" ? (flagged(c) ? btn("main", "Looks fine", 'data-cact="approve"') : "") + btn("ghost", "Unpublish", 'data-cact="decline"') : c.status === "closed" ? "" : btn("main", c.status === "pending" ? "Approve (goes on the map)" : "Make live again", 'data-cact="approve"'))
      + (c.announced ? btn("ghost", "Undo announcement", 'data-cact="unannounce"') : "")
      + btn("danger", c.entries ? `Delete with ${c.entries} ${c.entries === 1 ? "entry" : "entries"}` : "Delete", 'data-cact="delete"');
    setDetail(c.name);
    main.innerHTML = `<div class="rpage" data-cid="${esc(c.id)}" data-name="${esc(c.name)}"${c.announced ? ' data-announced="1"' : ""}><a class="rback" href="#contests" id="cBack"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to contests</a>
      <div class="pghead"><div><h2>Contest detail</h2></div><div class="pgacts">${acts}</div></div><span class="msg" role="status"></span>
      ${flagged(c) ? `<section class="rcard"><p class="meta" style="margin:0;color:var(--ink)"><b>Needs a look.</b> ${esc(c.note)}</p></section>` : ""}
      <section class="rcard"><h3>Overview</h3>${kv([["Name", esc(c.name)], ["Status", `<span class="tag ${tone(c)}">${label(c)}</span>`], ["Run by", esc(c.org) + " · " + esc(c.city)], ["Created", esc(localTime(c.created_at))]])}</section>
      <section class="rcard"><h3>Organizer</h3>${kv([["Email", `<span style="user-select:all">${esc(c.owner_email || c.contact_email || "no owner")}</span>`], ["Website", c.site ? `<a href="${esc(c.site)}" target="_blank" rel="noopener">${esc(c.site)}</a>` : "none given"]])}</section>
      <section class="rcard"><h3>Dates and activity</h3>${kv([["Dates", `Entries to ${mdy(c.entries_close)} · voting ${mdy(c.vote_start)} to ${mdy(c.vote_end)}`], ["Activity", `${fmt(c.entries)} ${c.entries === 1 ? "entry" : "entries"} · ${fmt(c.votes)} ${c.votes === 1 ? "vote" : "votes"}`], ["Pages", `<a href="/c/${esc(c.slug)}" target="_blank" rel="noopener">Public page</a> · <a href="${asUrl("/c/" + c.slug + "/manage")}" target="_blank" rel="noopener">Organizer dashboard (as the organizer)</a>`]])}</section></div>`;
    window.scrollTo(0, 0); $("#cBack").onclick = (e) => { e.preventDefault(); COPEN = ""; setDetail(""); renderContests(); };
    return;
  }
  setDetail("");
  const tabs = [["look", "Needs a look", n.look], ["live", "Live", n.live], ["ended", "Ended", n.ended], ["declined", "Unpublished", n.declined], ["passes", "Contest passes", 0]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === CVIEW}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>${CVIEW === "passes" ? "Contest passes" : "Contests"}</h2><p>${CVIEW === "passes" ? "Passes and comps per organization." : "Contests start right away. One needs a look when the organizer's email could not be matched to a website. Open a row for the details."}</p></div>${CVIEW === "passes" ? "" : `<div class="pgacts">${dl("contests")}</div>`}</div>`;
  const bar = CVIEW === "passes" ? "" : toolbar({ search: { placeholder: "Search contests, organizers", value: CSEARCH }, count: String(list.length) });
  const wire = () => { wireToolbar(main.querySelector(".tbar") || main, { onSearch: (q) => { CSEARCH = q; filterCards(main, q); } }); main.querySelectorAll(".pgtabs [data-view]").forEach((b) => (b.onclick = () => { CVIEW = b.dataset.view; COPEN = ""; if ((CVIEW === "passes") !== (tab === "passes")) return setTab(CVIEW === "passes" ? "passes" : "contests"); renderContests(); })); if (CSEARCH) filterCards(main, CSEARCH); applyPreset(main); };
  if (CVIEW === "passes") { main.innerHTML = head + `<div id="passes">Loading…</div>`; wire(); return renderPasses(); }
  if (!list.length) { main.innerHTML = head + bar + `<div class="empty">${CVIEW === "look" ? "Nothing needs a look. New contests go live right away. One shows here when the organizer's email could not be matched to a website." : "No contests here."}</div>`; wire(); return; }
  main.innerHTML = head + bar + `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Contest</th><th>Organizer</th><th>Dates</th><th>Activity</th><th>Status</th><th class="ac">Actions</th></tr></thead><tbody>${list.map((c) => `<tr data-cid="${esc(c.id)}"><td><a class="rl" href="#contests" data-copen="${esc(c.id)}">${esc(c.name)}</a><span class="sub">${esc(c.org)} · ${esc(c.city)}</span></td><td><span style="user-select:all">${esc(c.owner_email || c.contact_email || "no owner")}</span></td><td>Entries to ${mdy(c.entries_close)}<span class="sub">voting ${mdy(c.vote_start)} to ${mdy(c.vote_end)}</span></td><td>${fmt(c.entries)} ${c.entries === 1 ? "entry" : "entries"}<span class="sub">${fmt(c.votes)} ${c.votes === 1 ? "vote" : "votes"}</span></td><td><span class="tag ${tone(c)}">${label(c)}</span>${flagged(c) ? ' <span class="tag warn">Needs a look</span>' : ""}</td><td class="ac"><div class="racts"><a class="rl" href="#contests" data-copen="${esc(c.id)}">Open</a>${c.owner_email ? `<a class="rl" href="${asUrl("/c/" + c.slug + "/manage")}" target="_blank" rel="noopener">Edit as owner ↗</a>` : ""}</div></td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${list.length} contest${list.length === 1 ? "" : "s"}</span></div></div>`;
  main.querySelectorAll("[data-copen]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); COPEN = a.dataset.copen; renderContests(); }));
  wire();
}
/* ---------- Contest passes: usage per organization, comps (free for a founding partner), passes bought, "more than 20" leads ---------- */
const pdate = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
let PD = null; // the last /api/admin/passes answer, so a detail view can open without another request
const grantFields = (pre, withTarget) => fsec(withTarget ? "Grant a comp" : "Grant a comp to this organization", "A comp lets an organization run contests without paying for a pass. It never shows a price to the organizer: they see \"Founding partner: free through the date\". Nothing is granted until you click Grant.",
  (withTarget ? ff(pre + "Target", "Website domain or organizer email", `<input id="${pre}Target" maxlength="120" placeholder="covinaca.gov" autocomplete="off">`, { c: "c6" }) : "")
  + ff(pre + "Allowed", "Contests allowed per 12-month window", `<input id="${pre}Allowed" type="number" min="1" max="1000" value="5" inputmode="numeric">`, { c: "c3" })
  + ff(pre + "Unl", "Unlimited", `<label class="chk"><input id="${pre}Unl" type="checkbox"> No limit while the comp runs</label>`, { c: "c3" })
  + ff(pre + "Until", "Valid until", `<input id="${pre}Until" type="date">`, { c: "c3" })
  + ff(pre + "Badge", "Founder city badge", `<label class="chk"><input id="${pre}Badge" type="checkbox"> Show a Founder city badge</label>`, { c: "c3", hint: "A small label on this organization's contests while the comp runs. It never affects votes or results." })
  + ff(pre + "BadgeUntil", "Badge until (optional)", `<input id="${pre}BadgeUntil" type="date">`, { c: "c3", hint: "Blank = the valid-until date. The badge can outlast the free contests." })
  + ff(pre + "Note", "Note (only you see it)", `<input id="${pre}Note" maxlength="300" placeholder="Founding partner: Covina">`, { c: "c6" }))
  + `<div class="mfoot grantfoot"><button class="btn ice" type="button" id="${pre}Go">Grant comp</button><span class="msg" id="${pre}Msg" role="status"></span></div>`;
// Wires one grant form; key = the organization it belongs to ("" = the form asks for it). onDone runs after a successful grant.
function wireGrant(root, pre, key, onDone) {
  const q = (id) => root.querySelector("#" + pre + id);
  q("Unl").onchange = (e) => { q("Allowed").disabled = e.target.checked; };
  q("Go").onclick = async () => {
    const m = q("Msg"); m.className = "msg"; m.textContent = "Working…";
    const target = key || q("Target").value;
    try { await api("/api/admin/passes", { method: "POST", body: JSON.stringify({ action: "grant", name: target, target, allowed: q("Unl").checked ? "unlimited" : Number(q("Allowed").value), until: q("Until").value, badge: q("Badge").checked, badge_until: q("BadgeUntil").value, note: q("Note").value }) }); toast("Comp granted"); await onDone(); }
    catch (er) { m.className = "msg err"; m.textContent = er.message; }
  };
}
const orgStatus = (o) => (o.free ? ["Free domain", "ok"] : o.over ? ["Over its limit", "bad"] : o.comp ? ["Comp", "ok"] : o.cap ? ["Pass", "ok"] : ["Needs a pass", ""]);
function orgRow(o) {
  const [t, tone] = orgStatus(o), cap = o.unlimited ? "unlimited" : o.cap;
  const sub = `${o.used} of ${cap} contest${cap === 1 ? "" : "s"}${o.comp && !o.free ? ` · comp through ${pdate(o.comp.until)}` : ""}${o.windowStart ? ` · window to ${pdate(o.windowEnd)}` : ""}`;
  return rec({ compact: true, attrs: `data-pkey="${esc(o.key)}"`, title: esc(o.label), tags: [[t, tone]], lead: `<span class="sub">${esc(sub)}</span>`, main: btn("ghost", "Open", 'data-popen="1"') });
}
async function reloadPasses() { await renderPasses(); }
function openGrant() {
  const m = $("#modal"); m.hidden = false; m.innerHTML = modalFrame("Grant a comp", `<div class="f">${grantFields("pg", true)}</div>`, true);
  const close = () => { m.hidden = true; m.innerHTML = ""; }; m.querySelector("#mClose").onclick = close;
  wireGrant(m, "pg", "", async () => { close(); await reloadPasses(); });
}
function openOrg(key) {
  const o = PD.orgs.find((x) => x.key === key); if (!o) return;
  const m = $("#modal"); m.hidden = false;
  const comps = PD.comps.filter((c) => c.org_key === key), passes = PD.passes.filter((x) => x.org_key === key), [t, tone] = orgStatus(o);
  const compCards = comps.length ? comps.map((c) => rec({ attrs: `data-pcomp="${esc(c.id)}"`, title: c.allowed < 0 ? "Unlimited contests" : `${c.allowed} contests per window`, tags: [[c.running ? "Running" : c.revoked ? "Ended by you" : "Expired", c.running ? "ok" : ""], ...(c.badge ? [[c.badge_running ? "Founder city badge" : "Founder city badge (not showing)"]] : [])], meta: esc(c.created_at.slice(0, 10)),
    facts: fact("Valid until", esc(pdate(c.valid_until))) + (c.badge ? fact("Badge until", esc(pdate(c.badge_until || c.valid_until))) : "") + fact("Note", esc(c.note)) + fact("Granted by", esc(c.created_by)), danger: c.running ? btn("danger", "End this comp now", 'data-pact="revoke_comp"') : "" })).join("") : `<div class="empty">No comps for this organization.</div>`;
  const passCards = passes.length ? passes.map((x) => rec({ attrs: `data-ppass="${esc(x.session_id)}"`, title: "Up to " + x.cap + " contests", tags: [[x.status === "active" ? "Active" : "Revoked", x.status === "active" ? "ok" : ""]], meta: esc(x.created_at.slice(0, 10)),
    facts: fact("Window", `${esc(pdate(x.window_start))} to ${esc(pdate(x.window_end))}`) + fact("Paid", esc(money(x.amount, "usd"))) + fact("Buyer", esc(x.email || "")) + fact("Order", esc(x.order_status || "")), main: x.status === "active" ? btn("ghost", "Revoke this pass", 'data-pact="revoke_pass"') : "" })).join("") : `<div class="empty">No passes bought. Passes also show in Orders.</div>`;
  const contests = o.contests.length ? `<ul class="plist">${o.contests.map((c) => `<li><a href="${asUrl("/c/" + c.slug + "/manage")}" target="_blank" rel="noopener">${esc(c.name)}</a> <span class="meta">${esc(c.live_at)}${c.status === "live" ? "" : ", " + esc(c.status)}</span></li>`).join("")}</ul>` : `<div class="empty">No contest has gone live under this organization yet.</div>`;
  m.innerHTML = modalFrame(o.label, `<p class="meta">${esc(o.key)} <span class="tag ${tone}">${esc(t)}</span></p>
    <dl class="facts">${fact("This window", o.windowStart ? `${esc(pdate(o.windowStart))} to ${esc(pdate(o.windowEnd))}` : "no window running (the next contest needs a pass)")}${fact("Contests counted", `<b>${o.used}</b> of ${o.unlimited ? "unlimited" : o.cap}`)}${o.free ? fact("Free domain", "Contests are free for this domain. It is set in the code (FREE_DOMAINS), so it is not a comp you can end here.") : ""}</dl>
    <h3 class="dh">Contests</h3>${contests}
    <h3 class="dh">Comps</h3><div class="cards">${compCards}</div>
    <details class="pgrant"><summary>Grant a comp to this organization</summary><div class="f">${grantFields("po", false)}</div></details>
    <h3 class="dh">Passes bought</h3><p class="meta">Revoking a pass leaves the contests that are already live live, and refunds nothing (refund in Stripe, then mark it refunded under Orders).</p><div class="cards">${passCards}</div>
    <h3 class="dh">Other</h3><div class="ra" style="margin:0">${btn("ghost", "Merge into another key", 'data-pact="merge"')}<span class="msg" id="poMsgTop" role="status"></span></div>
    <p class="meta">Merging counts this organization's past and future contests, passes and comps under another key (a domain like covinaca.gov, or an email address).</p>`, true);
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  m.querySelector("#mClose").onclick = close;
  wireGrant(m, "po", key, async () => { await reloadPasses(); openOrg(key); });
  m.querySelectorAll("[data-pact]").forEach((b) => (b.onclick = async () => {
    const act = b.dataset.pact, body = { action: act };
    if (act === "merge") { const to = await askBox({ title: "Merge into another key", message: "Count this organization's contests under which key?", go: "Merge", input: { label: "Website domain or email address", placeholder: "covinaca.gov", hint: "A website domain (covinaca.gov) or an email address." } }); if (!to) return; body.from = key; body.to = to; }
    else if (act === "revoke_comp") { if (!tap(b, "end this comp")) return; body.id = b.closest("[data-pcomp]").dataset.pcomp; }
    else if (act === "revoke_pass") { if (!tap(b, "revoke this pass")) return; body.session_id = b.closest("[data-ppass]").dataset.ppass; }
    try { await api("/api/admin/passes", { method: "POST", body: JSON.stringify(body) }); toast(act === "merge" ? "Merged" : "Done"); await reloadPasses(); if (act === "merge") close(); else openOrg(key); } catch (er) { toast(er.message, true); }
  }));
}
async function renderPasses() {
  const box = $("#passes"); let d;
  try { d = await api("/api/admin/passes"); } catch (er) { box.innerHTML = `<div class="empty">${esc(er.message)}</div>`; return; }
  PD = d;
  const leads = d.leads.length ? `<details class="pleads"><summary>Requests for more than 20 contests (${d.leads.length})</summary><div class="cards">${d.leads.map((l) => rec({ title: esc(l.email), tags: [["More than 20", "warn"]], meta: esc(mdy(l.created_at)), facts: fact("Organization", esc(l.label)) + fact("Note", esc(l.note)) })).join("")}</div></details>` : "";
  box.innerHTML = `<div class="dhrow"><h2 class="dh">Organizations (${d.orgs.length})</h2>${btn("main", "Grant a comp", 'id="pcNew"')}</div>
    <p class="meta">Every organization with a contest, a pass or a comp. Open one for its contests, comps, passes and merge options.</p>
    ${d.orgs.length ? `<div class="cards">${d.orgs.map(orgRow).join("")}</div>` : `<div class="empty">No organization has a contest live yet.</div>`}${leads}`;
  $("#pcNew").onclick = openGrant;
  box.querySelectorAll("[data-pkey]").forEach((card) => (card.onclick = (e) => { if (e.target.closest("a")) return; openOrg(card.dataset.pkey); }));
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
    m.querySelector("#mClose").onclick = close;
    m.querySelectorAll("[data-cf]").forEach((b) => (b.onclick = async () => { try { await api("/api/admin/sponsors", { method: "POST", body: JSON.stringify({ action: b.dataset.cf, contest: cid, name: d.contest.name }) }); toast("Done"); openSponsors(cid); } catch (er) { toast(er.message, true); } }));
    m.querySelectorAll("[data-sh]").forEach((b) => (b.onclick = async () => { try { await api("/api/admin/sponsors", { method: "POST", body: JSON.stringify({ action: b.dataset.sh, id: b.closest("[data-sid]").dataset.sid, name: d.contest.name }) }); toast(b.dataset.sh === "hide" ? "Hidden" : "Shown again"); openSponsors(cid); } catch (er) { toast(er.message, true); } }));
  } catch (er) { m.innerHTML = modalFrame("Sponsors", `<p>${esc(er.message)}</p>`); m.querySelector("#mClose").onclick = close; }
}
$("#main").addEventListener("click", (e) => { const b = e.target.closest("[data-csp]"); if (b) openSponsors(b.dataset.csp); });
const orgLabelOf = (k) => (String(k).startsWith("d:") ? String(k).slice(2) : String(k).startsWith("u:") ? String(k).slice(2) : String(k));
const CDONE = { approve: "Contest is live", decline: "Contest unpublished", delete: "Contest deleted", unannounce: "Announcement undone: the results are unlocked" };
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cact]"); if (!b) return;
  const card = b.closest("[data-cid]"), msg = card.querySelector(".msg") || { set className(v) {}, set textContent(v) {} }, act = b.dataset.cact;
  const cname = card.dataset.name || "this contest", extra = {};
  if (act === "decline") { const r = await askReason({ title: "Unpublish " + cname, hint: "This is emailed to the organizer. Leave it blank to send no reason.", go: "Unpublish" }); if (r === null) return; extra.reason = r; }
  else if (act === "unannounce") { const r = await askReason({ title: "Undo the announcement of " + cname, hint: "Unlocks the contest and drops the published results. Results emails already sent can't be recalled; announcing again emails everyone the new results. This reason goes in the organizer's change log; nobody is emailed about the undo.", go: "Undo announcement" }); if (r === null) return; extra.reason = r || ""; }
  else if (act === "delete") {
    const typed = await askBox({ title: "Delete " + cname, message: `This removes its entries, photos, votes, sponsors and judges${card.dataset.announced ? " and the published winners page" : ""}, and can't be undone. The organizer is not emailed, so tell them first.`, go: "Delete for good", input: { label: "Type the contest name to confirm", placeholder: cname, hint: "" } });
    if (typed === null || typed === undefined) return; if (String(typed).trim().toLowerCase() !== cname.trim().toLowerCase()) { toast("The name didn't match, so nothing was deleted.", true); return; }
  }
  b.disabled = true; msg.className = "msg"; msg.textContent = "Working…";
  try {
    const res = await api("/api/admin/contests/" + card.dataset.cid, act === "delete" ? { method: "DELETE" } : { method: "POST", body: JSON.stringify({ action: act, ...extra }) });
    toast(CDONE[act] + (res && res.alreadyEmailed ? `. ${res.alreadyEmailed} results email${res.alreadyEmailed === 1 ? " was" : "s were"} already sent` : "") + (res && res.overCap ? `. Heads up: ${res.overCap.org} is now over its contest limit (${res.overCap.used} of ${res.overCap.cap}); see Contest passes` : ""), false, act === "decline" ? { undo: async () => { try { await api("/api/admin/contests/" + card.dataset.cid, { method: "POST", body: JSON.stringify({ action: "approve", notify: false }) }); toast("Undone"); renderContests(); refreshCounts(); } catch (er) { toast(er.message, true); } } } : {});
    COPEN = ""; renderContests(); refreshCounts(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; toast(err.message, true); }
});

/* ---------- labels on every table ---------- */
// On a phone a table turns into one card per row and its header row is hidden, so each cell takes its column's name as a label (admin.css prints it in front of the value).
// Done here once for every table, whichever page built it. The first column is the row's title and the Actions column is buttons, so neither gets one.
function labelTables(root) {
  (root || document).querySelectorAll("table.dtab").forEach((t) => {
    const heads = [...t.querySelectorAll("thead th")].map((h) => (h.classList.contains("cb") || h.classList.contains("ac") ? "" : h.textContent.trim()));
    const title = heads.findIndex(Boolean); if (title < 0) return; // the first named column is the row's title: no label
    t.querySelectorAll("tbody tr").forEach((tr) => [...tr.children].forEach((td, i) => { if (i > title && heads[i] && !td.hasAttribute("data-label") && !td.classList.contains("cb") && !td.classList.contains("ac")) td.setAttribute("data-label", heads[i]); }));
  });
}
// A table wider than its box scrolls sideways (tablets): the card gets data-more="start end" so the CSS can fade the right edge and shade the pinned name column.
function tableCues(root) {
  (root || document).querySelectorAll(".dtc").forEach((c) => {
    const w = c.querySelector(".dtw"); if (!w) return; const max = w.scrollWidth - w.clientWidth, x = w.scrollLeft;
    const v = max > 2 ? (x > 2 ? "start " : "") + (x < max - 2 ? "end" : "") : ""; if ((c.dataset.more || "") !== v.trim()) { if (v.trim()) c.dataset.more = v.trim(); else delete c.dataset.more; }
  });
}
// Phones: every row tick-box sits in a 44px square so it is easy to hit (the box itself stays its normal size), and a table row opens its record when tapped anywhere that is not a button or link.
function bigChecks(root) {
  if (!phone()) return;
  (root || document).querySelectorAll('input.rsel[type="checkbox"], td.cb input[type="checkbox"]').forEach((i) => {
    if (i.closest("label")) return;
    const l = document.createElement("label"); l.className = "cbhit"; i.replaceWith(l); l.appendChild(i);
  });
}
let labelRaf = 0;
new MutationObserver(() => { cancelAnimationFrame(labelRaf); labelRaf = requestAnimationFrame(() => { labelTables($("#main")); bigChecks($("#main")); tableCues($("#main")); }); }).observe($("#main"), { childList: true, subtree: true });
$("#main").addEventListener("scroll", (e) => { if (e.target.classList && e.target.classList.contains("dtw")) tableCues($("#main")); }, true);
addEventListener("resize", () => tableCues($("#main")));
$("#main").addEventListener("click", (e) => {
  if (!phone()) return;
  const tr = e.target.closest("table.dtab tbody tr"); if (!tr || e.target.closest("a,button,input,label,select,textarea,summary")) return;
  if (e.target.closest("td.cb")) { const i = tr.querySelector("td.cb input[type=checkbox]"); if (i) i.click(); return; }
  const go = tr.querySelector('a.rl[href^="#"]'); if (go) go.click();
});

/* ---------- events ---------- */
let EVQ = "", EVLIMIT = 0, EVSORT = "date", EVSTATUS = "", EVCOUNTY = "", EVHEALTH = "", EVVIEW = ""; // EVVIEW: "", "grok" or "ended" (the other tabs use EVSTATUS)
const EVSEL = new Set(); // ids ticked for a bulk action; kept across pages, filters and searches until an action runs or Clear is tapped
const evPage = () => (phone() ? PAGE_PHONE : 60);
const priceNum = (e) => { if (e.free) return 0; const m = String(e.p || "").match(/\$\s*(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 1e9; };
const EVSORTS = [["date", "Date, soonest first"], ["name", "Name A to Z"], ["city", "City A to Z"], ["updated", "Recently updated"], ["price", "Price, lowest first"]];
const EVCMP = {
  date: (a, b) => a.s.localeCompare(b.s) || a.n.localeCompare(b.n), name: (a, b) => a.n.localeCompare(b.n), city: (a, b) => a.city.localeCompare(b.city) || a.n.localeCompare(b.n),
  updated: (a, b) => String(b.lc || "").localeCompare(String(a.lc || "")) || a.n.localeCompare(b.n), price: (a, b) => priceNum(a) - priceNum(b) || a.n.localeCompare(b.n),
};
// The event's public card (opens in a new tab)
// "Do it as the owner": the person's own page, opened as an Admin (docs/admin-parity.md); every button there works for them and the Admin log records it.
const asUrl = (to, as = "", hash = "") => `/admin/as?to=${encodeURIComponent(to)}${as ? "&as=" + encodeURIComponent(as) : ""}${hash ? "&hash=" + hash : ""}`;
const asLink = (label, to, as, hash) => `<a class="btn ghost" href="${asUrl(to, as, hash)}" target="_blank" rel="noopener">${label}</a>`;
const viewLink = (id) => `<a class="btn ghost" href="/e/${encodeURIComponent(id)}" target="_blank" rel="noopener" aria-label="View this event on the site (opens in a new tab)">View card</a>`;
// The event as the edit form would send it, with some fields changed (used by the bulk actions and their Undo)
const evBody = (e, over = {}) => ({ id: e.id, season: e.sn || "christmas", name: e.n, county: e.c, city: e.city, type: e.t, start: e.s, end: e.e, status: e.st === "c" ? "confirmed" : "expected", free: !!e.free, price: e.p, hours: e.h, lat: e.lat, lng: e.lng, blurb: e.b, url: e.u, venue: e.v, address: e.a, ...over });
const evFiltered = () => {
  const w = EVQ.toLowerCase().split(/\s+/).filter(Boolean), test = healthTest(EVHEALTH);
  return EVENTS.filter((e) => (evSeason === "all" || (e.sn || "christmas") === evSeason) && (!EVSTATUS || e.st === EVSTATUS) && (EVVIEW !== "grok" || String(e.id).startsWith("grok-")) && (EVVIEW !== "paid" || (placeInfo(e.id) || {}).on) && (EVVIEW !== "video" || (PLACE.clips && PLACE.clips[e.id] === 0)) && (EVVIEW !== "nophoto" || EVQ2.nophoto.has(e.id)) && (EVHEALTH !== "recheck" || (EVQ2.stale && EVQ2.stale.has(e.id))) && (EVVIEW !== "ended" || e.e < TODAY) && (!EVCOUNTY || e.c === EVCOUNTY) && (!test || test(e, TODAY)) && w.every((x) => (e.n + " " + e.city + " " + (e.p || "") + " " + e.c).toLowerCase().includes(x))).sort(EVCMP[EVSORT] || EVCMP.date);
};
// The event editor's Purchases section: every order recorded for this event (plan, amount, status, date), with a link to Orders.
async function paintEvBuys(ev) {
  const box = $("#evBuys"); if (!box) return;
  try { if (!PLACE.events[ev.id] && !PLACE.loaded) { PLACE = { ...(await api("/api/admin/placements")), loaded: true }; } } catch { /* the list below says so */ }
  const x = PLACE.events[ev.id], list = x ? x.orders : [];
  box.innerHTML = list.length ? `<div class="dtw"><table class="dtab"><thead><tr><th>What they bought</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${list.map((o) => { const st = OSTATUS[o.status] || [o.status, ""]; return `<tr><td>${esc(PLAN_NAME[o.plan] || o.plan)}</td><td>${esc(money(o.cents))}</td><td><span class="tag ${st[1]}">${esc(st[0])}</span></td><td>${esc(pdate(o.at))}</td></tr>`; }).join("")}</tbody></table></div><p class="meta" style="margin:8px 0 0"><a href="#orders" data-tab="orders">Open Orders</a> for the payment details and refunds.</p>` : '<p class="meta" style="margin:0">Nothing bought for this event.</p>';
}
// The event editor's Organizer updates section: when an organizer took over this listing ("This is my event"), the old row was saved; the button puts it back (POST /api/admin/events/revert). Tap twice.
function paintEvRev(ev, p, done) {
  const box = $("#evRev"); if (!box) return; const x = p.last_edit;
  if (!x) { box.innerHTML = '<p class="meta" style="margin:0">No organizer has replaced this listing\'s details.</p>'; return; }
  box.innerHTML = `<p class="meta" style="margin:0 0 8px">${esc(x.by || "An organizer")} replaced this listing's details on ${esc(localTime(x.at))}. The old details were saved.</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ghost danger" type="button" data-evrev="keep">Revert the last organizer update</button><button class="btn ghost danger" type="button" data-evrev="unlink">Revert and remove their access</button></div>`;
  box.querySelectorAll("[data-evrev]").forEach((b) => (b.onclick = async () => {
    if (!tap(b, "revert")) return;
    b.disabled = true;
    try { await api("/api/admin/events/revert", { method: "POST", body: JSON.stringify({ id: ev.id, action: "revert", unlink: b.dataset.evrev === "unlink" }) }); toast("Reverted to the previous details"); done(); } catch (e) { b.disabled = false; toast(e.message, true); }
  }));
}
// The event editor's Photos section: the owner photos (up to 4). Photos are shrunk in the browser first (a phone photo can be 10 MB), then saved at once.
async function shrinkPhoto(file) {
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.86)); return blob && blob.size < file.size ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}
function paintEvPhotos(ev, p) {
  const box = $("#evPh"); if (!box) return; const keys = p.photos || [];
  box.innerHTML = (p.linked_image ? `<p class="meta" style="margin:0 0 8px">The picture found on the event's own page shows when no photo is added here${keys.length ? "; the photos below show first" : ""}.</p>` : "")
    + (keys.length ? `<div class="evthumbs">${keys.map((k, i) => `<div class="evph"><img src="/api/photo/${esc(k)}" alt="Photo ${i + 1}" loading="lazy">${i === 0 ? "<em>Cover</em>" : `<button type="button" class="btn ghost sm" data-evph="cover" data-key="${esc(k)}">Make cover</button>`}<button type="button" class="btn ghost danger sm" data-evph="remove" data-key="${esc(k)}">Remove</button></div>`).join("")}</div>` : '<p class="meta" style="margin:0 0 8px">No photos added here yet.</p>')
    + (keys.length < 4 ? `<label class="btn ghost" for="evPhIn">Add photos</label><input id="evPhIn" type="file" accept="image/*" multiple hidden><span class="meta" id="evPhMsg" role="status" style="margin-left:10px"></span>` : '<p class="meta" style="margin:8px 0 0">That is the limit of 4 photos. Remove one to add another.</p>');
  const again = async () => paintEvPhotos(ev, await api("/api/admin/events/" + encodeURIComponent(ev.id), { cache: "no-store" }));
  box.querySelectorAll("[data-evph]").forEach((b) => (b.onclick = async () => {
    if (b.dataset.evph === "remove" && !tap(b, "remove the photo")) return;
    b.disabled = true;
    try { await api("/api/admin/event-photos", { method: "POST", body: JSON.stringify({ id: ev.id, action: b.dataset.evph, key: b.dataset.key }) }); toast(b.dataset.evph === "remove" ? "Photo removed" : "Cover changed"); await again(); } catch (x) { b.disabled = false; toast(x.message, true); }
  }));
  const inp = $("#evPhIn"); if (inp) inp.onchange = async (x) => {
    const files = [...x.target.files].slice(0, 4 - keys.length); x.target.value = ""; if (!files.length) return; const say = (t) => ($("#evPhMsg").textContent = t);
    say("Uploading…");
    try {
      const fd = new FormData(); fd.append("id", ev.id); for (const f of files) fd.append("photos", await shrinkPhoto(f));
      const r = await fetch("/api/admin/event-photos", { method: "POST", body: fd }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "That didn't work.");
      toast(files.length === 1 ? "Photo added" : "Photos added"); await again();
    } catch (e) { say(e.message); }
  };
}
// The event editor's "Merge a duplicate" section (audit F-30). This event is the one that stays. Step 1: find the duplicate (suggestions from the loaded list, or a search). Step 2: GET /api/admin/events/merge shows a preview:
// which fields differ, which the duplicate would win by default (its organizer's details), what moves, and any reason the merge is refused (orders, claims). Step 3: a two-tap button posts the merge.
function paintEvMerge(ev, done) {
  const box = $("#evMerge"); if (!box) return;
  const words = (n) => new Set(String(n).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !["annual", "event", "festival", "holiday", "holidays", "lights", "christmas"].includes(w)));
  const mine = words(ev.n), km = (a, b) => { const r = (x) => (x * Math.PI) / 180, d = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(d)); };
  const row = (o) => `<button type="button" class="btn ghost mgpick" data-mgpick="${esc(o.id)}"><b>${esc(o.n)}</b><span class="sub">${esc(o.city)} · ${mdy(o.s)}${o.e !== o.s ? " to " + mdy(o.e) : ""} · ${esc(o.id)}</span></button>`;
  const similar = EVENTS.filter((o) => o.id !== ev.id && o.e >= TODAY && (o.city === ev.city || km(o, ev) < 1.5) && ((n) => n >= 2 || (n >= 1 && km(o, ev) < 0.5))([...words(o.n)].filter((w) => mine.has(w)).length)).slice(0, 5);
  const start = () => {
    box.innerHTML = `${similar.length ? `<p class="meta" style="margin:0 0 6px">Possible duplicates (same area, similar name or very close):</p><div class="mglist">${similar.map(row).join("")}</div>` : '<p class="meta" style="margin:0 0 6px">No likely duplicates found. Search for the other listing:</p>'}
      <div class="row" style="gap:8px;margin-top:8px"><input type="search" id="mgQ" placeholder="Search by name, city, address or id" aria-label="Find the duplicate" style="flex:1;min-width:0"></div><div class="mglist" id="mgRes" style="margin-top:6px"></div><div id="mgPrev"></div>`;
    $("#mgQ").oninput = (x) => { const w = x.target.value.toLowerCase().split(/\s+/).filter(Boolean); $("#mgRes").innerHTML = w.length ? EVENTS.filter((o) => o.id !== ev.id && w.every((t) => (o.n + " " + o.city + " " + (o.a || "") + " " + o.id).toLowerCase().includes(t))).slice(0, 8).map(row).join("") || '<p class="meta" style="margin:0">Nothing matches that.</p>' : ""; wirePick(); };
    wirePick();
  };
  const wirePick = () => box.querySelectorAll("[data-mgpick]").forEach((b) => (b.onclick = () => load(b.dataset.mgpick)));
  const dmy = (t) => String(t || "").replace(/\d{4}-\d{2}-\d{2}/g, (d) => mdy(d));
  async function load(dupId) {
    const out = $("#mgPrev"); out.innerHTML = '<p class="meta">Loading the comparison…</p>';
    let p; try { p = await api("/api/admin/events/merge?keep=" + encodeURIComponent(ev.id) + "&duplicate=" + encodeURIComponent(dupId), { cache: "no-store" }); } catch (x) { out.innerHTML = `<p class="msg err">${esc(x.message)}</p>`; return; }
    const diff = p.groups.filter((g) => g.differs && g.has_duplicate_value), same = p.groups.filter((g) => !g.differs && (g.keep || g.duplicate)).map((g) => g.label);
    const who = { duplicate: "The duplicate has the organizer's submission, so its details are ticked.", keep: "This event has the organizer's submission, so only its blanks are ticked.", both: "Both listings have an organizer.", neither: "Neither listing has an organizer; only blank fields are ticked." }[p.managed];
    out.innerHTML = `<div class="mgbox">
      <p style="margin:0 0 4px"><b>Keep:</b> ${esc(p.keep.name)} <span class="sub">${esc(p.keep.city)} · ${mdy(p.keep.start)}${p.keep.end !== p.keep.start ? " to " + mdy(p.keep.end) : ""}</span></p>
      <p style="margin:0 0 8px"><b>Remove:</b> ${esc(p.duplicate.name)} <span class="sub">${esc(p.duplicate.city)} · ${mdy(p.duplicate.start)}${p.duplicate.end !== p.duplicate.start ? " to " + mdy(p.duplicate.end) : ""} · ${esc(p.duplicate.id)}</span> <button type="button" class="btn ghost sm" id="mgBack">Pick another</button></p>
      ${p.blockers.map((b) => `<p class="msg err" role="alert" style="margin:0 0 8px">${esc(b)}</p>`).join("")}${p.warnings.map((w) => `<p class="mgwarn">${esc(w)}</p>`).join("")}
      <p class="meta" style="margin:0 0 6px">${esc(who)} Untick anything that should stay as it is on this event.</p>
      ${diff.length ? `<div class="mgrows">${diff.map((g) => `<div class="mgrow"><label class="chk"><input type="checkbox" data-mgf="${esc(g.key)}" aria-label="Take ${esc(g.label)} from the duplicate" ${g.default ? "checked" : ""}> <b>${esc(g.label)}</b> <span class="sub">take the duplicate's</span></label><div class="mgcmp"><span><em>This event now</em>${esc(dmy(g.keep)) || '<i>empty</i>'}</span><span><em>The duplicate has</em>${esc(dmy(g.duplicate))}</span></div></div>`).join("")}</div>` : '<p class="meta" style="margin:0 0 8px">The two listings have no different details.</p>'}
      ${same.length ? `<p class="meta" style="margin:8px 0 0">Already the same: ${esc(same.join(", "))}.</p>` : ""}
      <p class="meta" style="margin:8px 0 10px">${p.moves.submissions ? `${p.moves.submissions} submission${p.moves.submissions === 1 ? "" : "s"} from the duplicate's organizer will be pointed at this event. ` : "No organizer submission moves. "}The duplicate's page, photos and clip files are kept; Undo (shown after) brings it back.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost danger" id="mgGo" ${p.can_merge ? "" : "disabled"}>Merge and remove the duplicate</button><span class="msg" id="mgMsg" role="status"></span></div></div>`;
    $("#mgBack").onclick = () => start();
    $("#mgGo").onclick = async (x) => {
      const b = x.target; if (!tap(b, "merge")) return;
      const fields = [...out.querySelectorAll("[data-mgf]")].filter((c) => c.checked).map((c) => c.dataset.mgf); b.disabled = true;
      try {
        const r = await api("/api/admin/events/merge", { method: "POST", body: JSON.stringify({ id: ev.id, keep: ev.id, duplicate: dupId, fields, action: "merge" }) });
        toast(`Merged: ${p.duplicate.name} was removed`, false, { undo: () => restoreEvents([dupId]) }); done(r);
      } catch (er) { b.disabled = false; b.textContent = "Merge and remove the duplicate"; const m = $("#mgMsg"); m.className = "msg err"; m.textContent = er.message; }
    };
  }
  start();
}
// The event editor's "Check the event's page" section: the last result, and a button that fetches the page again (POST /api/admin/events/recheck). It only reports; nothing about the event changes.
function paintEvCheck(ev, p) {
  const box = $("#evChk"); if (!box) return;
  const last = p.checked_at ? `<p style="margin:0 0 8px">Last re-checked ${esc(localTime(p.checked_at))}. ${esc(p.check_note || "")}</p>` : `<p class="meta" style="margin:0 0 8px">${p.check_note ? esc(p.check_note) + " " : ""}This event's page has never been re-checked from here.</p>`;
  box.innerHTML = `${last}${ev.u ? `<div class="row" style="gap:10px;flex-wrap:wrap"><button type="button" class="btn ghost" id="evChkGo">Re-check this event's page</button><a class="btn ghost" href="${esc(ev.u)}" target="_blank" rel="noopener">Open the page</a></div><div id="evChkOut" role="status" style="margin-top:10px"></div>` : '<p class="meta" style="margin:0">There is no event website on this event. Add one in Details, save, then come back.</p>'}`;
  const go = $("#evChkGo"); if (!go) return;
  go.onclick = async () => {
    go.disabled = true; const out = $("#evChkOut"); out.textContent = "Reading the page… this can take up to 20 seconds."; out.className = "meta";
    try {
      const r = await api("/api/admin/events/recheck", { method: "POST", body: JSON.stringify({ id: ev.id, action: "recheck" }) });
      const yn = (v) => (v ? '<span class="tag ok">Yes</span>' : '<span class="tag bad">No</span>');
      out.className = "";
      out.innerHTML = r.read ? `<div class="chkrow"><span>Still mentions the event name</span>${yn(r.still_mentions_name)}</div><div class="chkrow"><span>Still mentions ${esc(r.year)}</span>${yn(r.still_mentions_year)}</div><div class="chkrow"><span>Says cancelled, postponed or rescheduled</span>${r.cancel_words ? '<span class="tag warn">Yes: read the page</span>' : '<span class="tag ok">No</span>'}</div><p class="meta" style="margin:8px 0 0">Saved on the event ${esc(localTime(r.checked_at))}. Nothing about the event was changed.</p>`
        : `<p style="margin:0"><span class="tag warn">Could not read the page</span> ${esc(r.note)}</p><p class="meta" style="margin:6px 0 0">Open the page yourself. It stays on the "not re-checked" list.</p>`;
      toast(r.read ? "Page re-checked" : "The page could not be read");
    } catch (x) { out.className = "msg err"; out.textContent = x.message; }
    go.disabled = false;
  };
}
// The event editor's Video section: the uploaded clip (watch it, Approve, Remove) or the link.
function paintEvVid(ev, p) {
  const box = $("#evVid"); if (!box) return;
  const file = p.video_file, link = p.video, rm = '<button type="button" class="btn ghost danger" data-evvid="remove">Remove video</button>';
  box.innerHTML = file ? `<video controls playsinline preload="metadata" src="/api/admin/photo/${esc(file)}" style="display:block;max-width:420px;width:100%;border-radius:10px;background:#000;margin:0 0 8px"></video><p class="meta" style="margin:0 0 8px">${p.video_ok ? "Approved: visitors can watch it." : "Waiting for your approval. Visitors cannot see it yet."}</p>${p.video_ok ? "" : '<button type="button" class="btn ice" data-evvid="approve">Approve video</button> '}${rm}`
    : link ? `<p style="margin:0 0 8px">Link (shown at once): <a href="${esc(link)}" target="_blank" rel="noopener">${esc(link)}</a></p>${rm}` : '<p class="meta" style="margin:0">No video.</p>';
  box.insertAdjacentHTML("beforeend", `<div style="margin-top:10px"><label class="btn ghost" for="evVidIn">${file || link ? "Replace with a clip" : "Upload a clip"}</label><input id="evVidIn" type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden><span class="meta" id="evVidMsg" role="status" style="margin-left:10px">MP4, MOV or WebM, up to 40 MB. A clip you add here is approved at once.</span></div>`);
  $("#evVidIn").onchange = async (x) => {
    const f = x.target.files[0]; x.target.value = ""; if (!f) return; const say = (t) => ($("#evVidMsg").textContent = t);
    if (f.size > 40 * 1048576) return say(`That video is ${Math.round(f.size / 1048576)} MB. The limit is 40 MB.`);
    say("Uploading… this can take a minute.");
    try { const r = await fetch("/api/admin/event-video?id=" + encodeURIComponent(ev.id), { method: "PUT", headers: { "content-type": f.type || "video/mp4" }, body: f }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "That didn't work."); toast("Video added and approved"); paintEvVid(ev, await api("/api/admin/events/" + encodeURIComponent(ev.id), { cache: "no-store" })); } catch (e) { say(e.message); }
  };
  box.querySelectorAll("[data-evvid]").forEach((b) => (b.onclick = async () => {
    if (b.dataset.evvid === "remove" && !tap(b, "remove the video")) return;
    b.disabled = true;
    try { await api("/api/admin/event-video", { method: "POST", body: JSON.stringify({ id: ev.id, action: b.dataset.evvid }) }); toast(b.dataset.evvid === "approve" ? "Video approved" : "Video removed"); paintEvVid(ev, await api("/api/admin/events/" + encodeURIComponent(ev.id), { cache: "no-store" })); refreshCounts(); }
    catch (x) { b.disabled = false; toast(x.message, true); }
  }));
}
// What each event has bought (pin, top of the list, banner) from /api/admin/placements; "active" means today is on or before the last day.
let PLACE = { today: "", events: {} };
// The two Events work queues (GET /api/admin/event-queues): upcoming events with no photo at all, and upcoming confirmed events whose page was not re-checked in 30 days.
let EVQ2 = { nophoto: new Set(), stale: null, checked: {} };
const placeInfo = (id) => {
  const x = PLACE.events[id]; if (!x) return null; const t = PLACE.today;
  const pin = x.level >= 1 && (!x.until || x.until >= t), top = x.level >= 2 && pin, ban = !!x.banner && x.banner >= t;
  const paid = x.orders.filter((o) => ["paid", "held", "refund_due", "disputed"].includes(o.status));
  return { pin, top, ban, on: pin || top || ban, until: [pin || top ? x.until : "", ban ? x.banner : ""].filter(Boolean).sort().pop() || "", orders: x.orders, paid, cents: paid.reduce((n, o) => n + (o.cents || 0), 0) };
};
const placeCell = (id) => {
  const p = placeInfo(id); if (!p) return '<span class="sub">None</span>';
  if (p.on) return [p.pin && "Pin", p.top && "Top of list", p.ban && "Banner"].filter(Boolean).map((t) => `<span class="tag ok">${t}</span>`).join(" ") + `<span class="sub">until ${esc(pdate(p.until) || "season end")}${p.cents ? " · " + usdOf(p.cents) + " paid" : ""}</span>`;
  return p.orders.length ? `<span class="tag">Ended</span><span class="sub">${p.orders.length} past purchase${p.orders.length === 1 ? "" : "s"}</span>` : '<span class="sub">None</span>';
};
async function renderEvents() {
  if (PVIEW === "video") { EVVIEW = "video"; EVSTATUS = ""; PVIEW = "pending"; } // the Dashboard card "event videos waiting"
  const [evs, pl, qu] = await Promise.all([fetch("/api/admin/events", { cache: "no-store" }).then((r) => r.json()), api("/api/admin/placements").catch(() => null), api("/api/admin/event-queues").catch(() => null)]);
  EVENTS = evs; if (pl) PLACE = pl;
  if (qu) EVQ2 = { nophoto: new Set(qu.nophoto || []), stale: qu.stale ? new Set(qu.stale) : null, checked: qu.checked || {} };
  const main = $("#main");
  const sel = (id, label, opts, cur) => `<select id="${id}" aria-label="${label}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${k === cur ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const seasonSel = sel("evSeason", "Season", [["all", "All seasons"], ...Object.entries(SEASONS).map(([k, v]) => [k, v.label])], evSeason);
  const filters = seasonSel + sel("evCounty", "County", [["", "All counties"], ...COUNTIES.map((c) => [c, c + " County"])], EVCOUNTY)
    + sel("evHealth", "Needs a look", [["", "Everything"], ...HEALTH.map(([k, l]) => [k, l]), ...(EVQ2.stale ? [["recheck", `Page not re-checked in 30 days (${EVQ2.stale.size})`]] : [])], EVHEALTH) + sortSelect(EVSORTS, EVSORT);
  const paidN = EVENTS.filter((e) => (placeInfo(e.id) || {}).on).length, vidN = EVENTS.filter((e) => PLACE.clips && PLACE.clips[e.id] === 0).length, evTabs = [["", "All events"], ["e", "Expected"], ["c", "Confirmed"], ["paid", "Paid placements" + (paidN ? " " + paidN : "")], ["video", "Videos waiting" + (vidN ? " " + vidN : "")], ["nophoto", "No photo" + (EVQ2.nophoto.size ? " " + EVQ2.nophoto.size : "")], ["grok", "From Grok"], ["ended", "Ended"]], evOn = () => EVVIEW || EVSTATUS;
  main.innerHTML = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show events">${evTabs.map(([k, l]) => `<button type="button" data-view="${k || "all"}" aria-pressed="${k === evOn()}">${l}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>Events</h2><p>Every event on the public map. Open a row to see and edit the full record.</p></div><div class="row" style="gap:8px"><button type="button" class="btn ghost" id="evDeleted">Recently deleted</button><button type="button" class="btn ice" id="addEv">Add an event</button></div></div>`
    + toolbar({ search: { placeholder: "Search events, cities", value: EVQ }, right: `<details class="fbox" id="evFbox" open><summary>Filters</summary>${filters}<a class="btn ghost" id="evDl" href="/api/admin/export?type=events${evSeason === "all" ? "" : "&season=" + evSeason}" download>Download CSV</a></details>`, count: "" })
    + `<div class="bulk" id="evBulk"><label class="chk"><input type="checkbox" id="evAll"> <span id="evAllL">Select all</span></label><span class="grow"></span><span class="meta" id="evSelN"></span>
      <button class="btn ice" type="button" id="evSetC" hidden></button><button class="btn ghost" type="button" id="evSetE" hidden></button>
      <select id="evMoveTo" aria-label="Move to season" hidden>${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select><button class="btn ghost" type="button" id="evMove" hidden></button>
      <button class="btn ghost danger" type="button" id="evDel" hidden></button><button class="btn ghost" type="button" id="evClear" hidden>Clear</button></div><div id="evlist"></div>`;
  $("#evDeleted").onclick = async () => {
    const m = $("#modal"), close = () => { m.hidden = true; m.innerHTML = ""; }; let rows = [];
    try { rows = await api("/api/admin/events/deleted"); } catch (er) { return toast(er.message, true); }
    m.hidden = false;
    m.innerHTML = modalFrame("Recently deleted events", rows.length ? `<div class="list">${rows.map((r) => `<div class="rowi" style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 0"><div><b>${esc(r.name || r.id)}</b><br><span class="meta">${esc([r.city, r.start].filter(Boolean).join(" · "))} · deleted ${when(r.deleted_at)}</span></div><button class="btn ice" type="button" data-bring="${esc(r.id)}">Bring back</button></div>`).join("")}</div>` : `<p class="meta">Nothing has been deleted lately.</p>`);
    m.querySelector("#mClose").onclick = close;
    m.querySelectorAll("[data-bring]").forEach((b) => (b.onclick = async () => { b.disabled = true; await restoreEvents([b.dataset.bring]); close(); }));
  };
  if (phone()) $("#evFbox").open = false; // on a phone the filters fold behind one button
  if (!EVLIMIT) EVLIMIT = evPage();
  let shown = [];
  const paintBulk = () => {
    const n = EVSEL.size, all = evFiltered(), on = n > 0, plural = `${n} event${n === 1 ? "" : "s"}`;
    $("#evSelN").textContent = on ? `${n} selected` : ""; $("#evAllL").textContent = `Select all ${all.length} shown by the filters`;
    $("#evAll").checked = all.length > 0 && all.every((e) => EVSEL.has(e.id)); $("#evBulk").hidden = !on; const ah = $("#evAllH"); if (ah) ah.checked = $("#evAll").checked;
    $("#evSetC").textContent = `Set ${plural} to confirmed`; $("#evSetE").textContent = `Set ${plural} to expected`; $("#evMove").textContent = "Move to season"; $("#evDel").textContent = `Delete ${plural}`;
    ["evSetC", "evSetE", "evMoveTo", "evMove", "evDel", "evClear"].forEach((id) => ($("#" + id).hidden = !on));
  };
  const paint = () => {
    const all = evFiltered(); shown = all.slice(0, EVLIMIT);
    main.querySelector("[data-tcount]") ? 0 : main.querySelector(".tbar .grow").insertAdjacentHTML("afterend", '<span class="meta tcount" data-tcount></span>');
    main.querySelector("[data-tcount]").textContent = `${all.length} event${all.length === 1 ? "" : "s"}` + (evSeason !== "all" ? ` in this season, ${fmt(EVENTS.length)} in all seasons` : "");
    const srcOf = (id) => (String(id).startsWith("grok-") ? "Grok" : String(id).startsWith("u-") ? "Organizer" : String(id).startsWith("hcontest-") ? "Contest" : "Sweep");
    $("#evlist").innerHTML = all.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th class="cb"><input type="checkbox" id="evAllH" aria-label="Select all ${all.length} shown by the filters" ${all.length > 0 && all.every((e) => EVSEL.has(e.id)) ? "checked" : ""}></th><th>Event</th><th>City</th><th>Dates</th><th>Status</th><th>Paid placement</th><th class="ac">Actions</th></tr></thead><tbody>${shown.map((e) => `<tr class="${e.e < TODAY ? "past" : ""}" data-eid="${esc(e.id)}"><td class="cb"><input type="checkbox" class="rsel" data-esel="${esc(e.id)}" aria-label="Select ${esc(e.n)}" ${EVSEL.has(e.id) ? "checked" : ""}></td>
      <td>${tcell(e.img, `<a class="rl" href="#events/${encodeURIComponent(e.id)}" data-edit="${esc(e.id)}">${esc(e.n)}</a><span class="sub">${esc(e.v || "")}</span>`)}</td><td>${esc(e.city)}<span class="sub">${esc(e.c)}</span></td><td>${mdy(e.s)}${e.e !== e.s ? " to " + mdy(e.e) : ""}<span class="sub">${esc(e.h || e.p || "")}</span></td>
      <td><span class="tag ${e.st === "c" ? "ok" : "warn"}">${e.st === "c" ? "Confirmed" : "Expected"}</span>${e.e < TODAY ? ' <span class="tag">Ended</span>' : ""}${PLACE.clips && PLACE.clips[e.id] === 0 ? ' <span class="tag warn">Video waiting</span>' : ""}<span class="sub">Source: ${srcOf(e.id)}${EVHEALTH === "recheck" ? " · page " + (EVQ2.checked[e.id] ? "last re-checked " + mdy(EVQ2.checked[e.id][0]) : "never re-checked") : ""}</span></td><td>${placeCell(e.id)}</td><td class="ac"><div class="racts"><a class="rl" href="#events/${encodeURIComponent(e.id)}" data-edit="${esc(e.id)}">Edit</a>${EVQ2.nophoto.has(e.id) ? `<a class="rl addph" href="#events/${encodeURIComponent(e.id)}" data-edit="${esc(e.id)}" data-focus="photos">Add photo</a>` : ""}<a class="rl" href="/e/${encodeURIComponent(e.id)}" target="_blank" rel="noopener">View card ↗</a></div></td></tr>`).join("")}</tbody></table></div>${all.length > shown.length ? `<div class="pager"><span class="meta">Showing ${shown.length} of ${all.length}</span><button class="btn ghost" type="button" id="evMore">Show ${evPage()} more</button></div>` : `<div class="pager"><span class="meta">${all.length} event${all.length === 1 ? "" : "s"}</span></div>`}</div>` : `<div class="empty">${EVVIEW === "nophoto" && !EVQ ? "Every upcoming event in this view has a photo." : EVQ || EVSTATUS || EVVIEW || EVCOUNTY || EVHEALTH ? "Nothing matches that." : "No events in this season."}</div>`;
    $("#evlist").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = (x) => { x.preventDefault(); editEvent(EVENTS.find((y) => y.id === b.dataset.edit), b.dataset.focus); }));
    $("#evlist").querySelectorAll("[data-esel]").forEach((b) => (b.onchange = () => { b.checked ? EVSEL.add(b.dataset.esel) : EVSEL.delete(b.dataset.esel); paintBulk(); }));
    if ($("#evAllH")) $("#evAllH").onchange = (x) => { $("#evAll").checked = x.target.checked; $("#evAll").onchange({ target: $("#evAll") }); };
    if ($("#evMore")) $("#evMore").onclick = () => { EVLIMIT += evPage(); paint(); };
    paintBulk();
  };
  paint();
  wireToolbar(main.querySelector(".tbar"), { onSearch: (q) => { EVQ = q; EVLIMIT = evPage(); paint(); } });
  const refilter = () => { EVLIMIT = evPage(); $("#evDl").href = "/api/admin/export?type=events" + (evSeason === "all" ? "" : "&season=" + evSeason); paint(); };
  $("#evSeason").onchange = (x) => { evSeason = x.target.value; refilter(); };
  main.querySelectorAll(".pgtabs [data-view]").forEach((b) => (b.onclick = () => { const k = b.dataset.view === "all" ? "" : b.dataset.view; EVSTATUS = k === "e" || k === "c" ? k : ""; EVVIEW = k === "grok" || k === "ended" || k === "paid" || k === "video" || k === "nophoto" ? k : ""; main.querySelectorAll(".pgtabs [data-view]").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); refilter(); }));
  $("#evCounty").onchange = (x) => { EVCOUNTY = x.target.value; refilter(); };
  $("#evHealth").onchange = (x) => { EVHEALTH = x.target.value; refilter(); };
  main.querySelector("[data-sort]").onchange = (x) => { EVSORT = x.target.value; refilter(); };
  $("#addEv").onclick = () => editEvent(null);
  // ---- bulk actions: a second tap confirms; status, season changes and deletes can be undone (a delete from its tombstone) ----
  $("#evAll").onchange = (x) => { const all = evFiltered(); if (x.target.checked && all.length > BULK_MAX) { x.target.checked = false; return toast(`Pick at most ${BULK_MAX} at a time. Narrow the filters first.`, true); } all.forEach((e) => (x.target.checked ? EVSEL.add(e.id) : EVSEL.delete(e.id))); paint(); };
  $("#evClear").onclick = () => { EVSEL.clear(); paint(); };
  const run = async (btn, verb, fn, undoable, restorable) => {
    const ids = [...EVSEL]; if (!ids.length || !tap(btn, verb.replace("{n}", ids.length))) return;
    document.querySelectorAll("#evBulk button, #evBulk select").forEach((b) => (b.disabled = true));
    const list = ids.map((id) => EVENTS.find((e) => e.id === id)).filter(Boolean), before = list.map((e) => ({ ...e })), okIds = []; let failed = 0, skipped = 0;
    for (const [i, e] of list.entries()) { btn.textContent = `Working ${i + 1} of ${list.length}…`; try { await fn(e); okIds.push(e.id); } catch (er) { if (er.status === 409) skipped++; else failed++; } }
    EVSEL.clear(); const done = okIds.length, bad = failed + skipped;
    const msg = `${done} event${done === 1 ? "" : "s"} done` + (skipped ? `, ${skipped} skipped (a paid Featured order is running: open each one to confirm)` : "") + (failed ? `, ${failed} could not be saved` : "");
    toast(msg, !!bad && !done, restorable && done ? { undo: () => restoreEvents(okIds) } : undoable && done ? { undo: async () => { let u = 0; for (const e of before.filter((b) => okIds.includes(b.id))) { try { await api("/api/admin/events", { method: "POST", body: JSON.stringify(evBody(e)) }); u++; } catch {} } toast(`Undone for ${u} event${u === 1 ? "" : "s"}`); renderEvents(); refreshCounts(); } } : {});
    renderEvents(); refreshCounts();
  };
  const post = (e, over) => api("/api/admin/events", { method: "POST", body: JSON.stringify(evBody(e, over)) });
  $("#evSetC").onclick = (x) => run(x.target, "set {n} to confirmed", (e) => post(e, { status: "confirmed" }), true);
  $("#evSetE").onclick = (x) => run(x.target, "set {n} to expected", (e) => post(e, { status: "expected" }), true);
  $("#evMove").onclick = (x) => { const to = $("#evMoveTo").value; run(x.target, `move {n} to ${SEASONS[to].short || SEASONS[to].label}`, (e) => post(e, { season: to, type: SEASONS[to].types[e.t] ? e.t : Object.keys(SEASONS[to].types)[0] }), true); };
  $("#evDel").onclick = (x) => run(x.target, "delete {n} (Undo is offered afterwards)", (e) => api("/api/admin/events/" + encodeURIComponent(e.id), { method: "DELETE" }), false, true);
}
const BULK_MAX = 200;
// Brings deleted events back from their tombstones (the Undo on a delete)
const restoreEvents = async (ids) => { try { const r = await api("/api/admin/events/restore", { method: "POST", body: JSON.stringify({ action: "restore", ids }) }); toast(`Brought back ${r.restored.length} event${r.restored.length === 1 ? "" : "s"}` + (r.skipped.length ? `, ${r.skipped.length} could not be restored` : ""), !r.restored.length); } catch (er) { toast(er.message, true); } if (tab === "events") renderEvents(); else render(); refreshCounts(); };
function editEvent(ev, focus) {
  const e = ev || { id: "", n: "", c: "Orange", city: "", t: Object.keys((SEASONS[evSeason] || SEASONS.christmas).types)[0], s: TODAY, e: TODAY, st: "expected", free: true, p: "Free", h: "", lat: 33.68, lng: -117.83, b: "", u: "", sn: SEASONS[evSeason] ? evSeason : "christmas" };
  const typeOpts = (sn, cur) => Object.entries(SEASONS[sn].types).map(([v, l]) => `<option value="${v}" ${v === cur ? "selected" : ""}>${l}</option>`).join("");
  const main = $("#main"), title = ev ? "Event detail" : "Add an event";
  setDetail(ev ? ev.n : "New event"); window.scrollTo(0, 0);
  main.innerHTML = `<div class="rpage evpage"><a class="rback" href="#events" id="evBack"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to ${tab === "events" ? "events" : "the list"}</a>
  <div class="pghead"><div><h2>${title}</h2></div><div class="pgacts">${ev ? viewLink(ev.id) : ""}${ev ? `<button class="btn ghost danger" type="button" id="eDel">Delete event</button>` : ""}</div></div>
  <form class="f" id="evForm" novalidate>
    <div class="evl">${fsec("Event", "", ff("eN", "Name", `<input id="eN" value="${esc(e.n)}" maxlength="120" required>`)
      + ff("eSn", "Season", `<select id="eSn">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === (e.sn || "christmas") ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>`, { c: "c3" }) + ff("eT", "Type", `<select id="eT">${typeOpts(e.sn || "christmas", e.t)}</select>`, { c: "c3" })
      + ff("eSt", "Dates are", `<select id="eSt"><option value="confirmed" ${e.st === "c" ? "selected" : ""}>Confirmed for this season</option><option value="expected" ${e.st !== "c" ? "selected" : ""}>Expected (based on last year)</option></select>`, { hint: "Expected events show a note that visitors should check the event's website." }))}
    ${fsec("When and price", "", ff("eS", "Starts", `<input id="eS" type="date" value="${esc(e.s)}">`, { c: "c3" }) + ff("eE", "Ends", `<input id="eE" type="date" value="${esc(e.e)}">`, { c: "c3" }) + ff("eH", "Hours", `<input id="eH" value="${esc(e.h)}" maxlength="200" placeholder="6 to 10 pm nightly">`)
      + ff("eP", "Price shown", `<input id="eP" value="${esc(e.p)}" maxlength="80" placeholder="Free, From $19…">`, { c: "c4" }) + `<div class="ff c2"><label class="chk" for="eF"><input type="checkbox" id="eF" ${e.free ? "checked" : ""}> Free event</label></div>`)}
    ${fsec("Where", "Directions use the street address. The pin sets where the event appears on the map.", ff("eCity", "City or area", `<input id="eCity" value="${esc(e.city)}" maxlength="60" required>`, { c: "c4" }) + ff("eC", "County", `<select id="eC">${COUNTIES.map((c) => `<option ${c === e.c ? "selected" : ""}>${c}</option>`).join("")}</select>`, { c: "c2" })
      + ff("eV", "Venue", `<input id="eV" value="${esc(e.v || "")}" maxlength="120" placeholder="Crown Valley Community Park">`, { c: "c3" }) + ff("eA", "Street address", `<input id="eA" data-addr autocomplete="off" value="${esc(e.a || "")}" maxlength="200" placeholder="29751 Crown Valley Pkwy, Laguna Niguel, CA 92677">`, { c: "c3" })
      + `<div class="ff c6"><div class="row" style="margin-bottom:8px"><button class="btn ghost" type="button" id="eGeo">Place pin from address</button><span class="meta" id="geoMsg">Or click the map, or drag the pin.</span></div><div id="pick"></div><div class="meta dates" id="ll" style="margin-top:4px"></div></div>`)}
    ${fsec("Details", "", ff("eB", "Description", `<textarea id="eB" maxlength="600" rows="4">${esc(e.b)}</textarea>`) + ff("eU", "Event website", `<input id="eU" type="url" value="${esc(e.u)}" maxlength="300" placeholder="https://">`) + ff("eVid", "Video (YouTube or Vimeo link)", `<input id="eVid" type="url" value="${esc(e.vid || "")}" maxlength="300" placeholder="https://www.youtube.com/watch?v=...">`, { c: "c6" }))}
    </div><div class="evr">${ev ? fsec("Paid placement", "Featured: 1 is the gold pin and badge, 2 also lists the event first. Banner: the event is a pill labeled Featured in the strip at the top of the map list. Organizers buy these themselves at /feature (see Orders). A level or date set here can never be lower or earlier than a paid order that is still running. Leave a date empty for no end date (Featured) or to keep the banner off.",
      ff("eFl", "Featured level", `<select id="eFl" disabled><option value="0">Off</option><option value="1">1: pin and badge</option><option value="2">2: also listed first</option></select>`, { c: "c2" }) + ff("eFu", "Featured until", `<input id="eFu" type="date" disabled>`, { c: "c2" }) + ff("eBu", "Banner until", `<input id="eBu" type="date" disabled>`, { c: "c2", hint: "Loading…" })) : ""}
    ${ev ? fsec("Photos", "Up to 4 photos, the first is the cover and shows before the picture found on the event's own page. Add one an organizer emailed you; it is saved at once, no need to tap Save.", `<div class="ff c6" id="evPh"><p class="meta" style="margin:0">Loading…</p></div>`) : ""}
    ${ev ? `<details class="more evadv"><summary>More: purchases, organizer updates, merge, page check, video</summary>${ev ? fsec("Purchases", "What this event paid for: the Featured pin, the banner and top of the list. The dates it runs are in Paid placement above; refunds are handled in Orders.", `<div class="ff c6" id="evBuys"><p class="meta" style="margin:0">Loading…</p></div>`) : ""}${ev ? fsec("Organizer updates", "When an organizer uses \"This is my event\" on an existing listing, the old details are saved. Revert puts them back (the paid placement, photos and video are not touched).", `<div class="ff c6" id="evRev"><p class="meta" style="margin:0">Loading…</p></div>`) : ""}${ev ? fsec("Merge a duplicate", "The same event listed twice? Pick the other listing here. This event stays; the other one is removed after its details you choose are copied over, and its organizer's submission is pointed at this event. You see exactly what changes first, and Undo brings the duplicate back.", `<div class="ff c6" id="evMerge"></div>`) : ""}${ev ? fsec("Check the event's page", "Looks at the event's website again (politely, like our other checks) and says whether it still mentions the event and its year. It only reports: the event is never changed, hidden or set back to expected by this.", `<div class="ff c6" id="evChk"><p class="meta" style="margin:0">Loading…</p></div>`) : ""}${ev ? fsec("Video", "A YouTube or Vimeo link shows at once. An uploaded clip is hidden from visitors until you approve it here. Organizers add them from Your profile (Edit the event).", `<div class="ff c6" id="evVid"><p class="meta" style="margin:0">Loading…</p></div>`) : ""}</details>` : ""}
    <div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="eMsg" role="status" style="flex-basis:100%"></span></div>
  </form>${ev ? transferBox("event", e.id) : ""}</div>`;
  if (ev && tab !== "events") $("#evBack").lastChild.textContent = "Back";
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
  const close = () => { pm.remove(); setDetail(""); };
  const back = (x) => { if (x) x.preventDefault(); close(); if (tab === "events") renderEvents(); else render(); };
  $("#evBack").onclick = back; main.querySelector("[data-mcancel]").onclick = back;
  if (ev) paintEvMerge(ev, () => { close(); if (tab === "events") renderEvents(); else render(); refreshCounts(); });
  let placed = false; // the paid placement fields are sent only once they have loaded, so a failed load can never wipe a placement
  if (ev) api("/api/admin/events/" + encodeURIComponent(ev.id), { cache: "no-store" }).then((p) => { if (!$("#eFl")) return; $("#eFl").value = String(p.featured || 0); $("#eFu").value = p.featured_until || ""; $("#eBu").value = p.banner_until || ""; ["eFl", "eFu", "eBu"].forEach((i) => ($("#" + i).disabled = false)); const h = $("#eBu").closest(".ff").querySelector(".hint, small"); if (h) h.textContent = p.floor && (p.floor.banner_until || p.floor.featured_until) ? `Paid orders still running: Featured to ${p.floor.featured_until || "n/a"}, banner to ${p.floor.banner_until || "n/a"}. These cannot be set lower.` : "No paid order is running."; placed = true; paintEvVid(ev, p); paintEvBuys(ev); paintEvRev(ev, p, () => { close(); if (tab === "events") renderEvents(); else render(); }); paintEvPhotos(ev, p); paintEvCheck(ev, p); if (focus === "photos") { const ph = $("#evPh") && $("#evPh").closest("fieldset"); if (ph) { ph.scrollIntoView({ block: "start" }); ph.classList.add("flash"); setTimeout(() => ph.classList.remove("flash"), 2200); } } }).catch(() => { const h = $("#eBu") && $("#eBu").closest(".ff").querySelector(".hint, small"); if (h) h.textContent = "Could not load the placement; it is left as it is."; });
  if (ev) $("#eDel").onclick = async (x) => { const b = x.target; if (!tap(b, "delete")) return; const del = "/api/admin/events/" + encodeURIComponent(ev.id); try { await api(del, { method: "DELETE" }); } catch (er) { if (er.status === 409 && er.data && er.data.code === "paid_placement" && (await askBox({ title: "This event has a paid placement", message: er.message, go: "Delete anyway", danger: true }))) await api(del + "?confirm=1", { method: "DELETE" }); else { b.textContent = b.dataset.label || "Delete"; return toast(er.message, true); } } close(); toast("Event deleted", false, { undo: () => restoreEvents([ev.id]) }); if (tab === "events") renderEvents(); else render(); };
  $("#evForm").onsubmit = async (x) => {
    x.preventDefault(); const msg = $("#eMsg");
    const id = ev ? ev.id : $("#eN").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 6);
    const body = { id, season: $("#eSn").value, name: $("#eN").value, county: $("#eC").value, city: $("#eCity").value, type: $("#eT").value, start: $("#eS").value, end: $("#eE").value, status: $("#eSt").value, video: $("#eVid").value, free: $("#eF").checked, price: $("#eP").value, hours: $("#eH").value, lat, lng, blurb: $("#eB").value, url: $("#eU").value, venue: $("#eV").value, address: $("#eA").value };
    if (ev && placed) body.placement = { featured: Number($("#eFl").value), featured_until: $("#eFu").value, banner_until: $("#eBu").value };
    try { await api("/api/admin/events", { method: "POST", body: JSON.stringify(body) }); close(); toast("Saved"); if (tab === "events") renderEvents(); else render(); }
    catch (err) { msg.className = "msg err"; msg.textContent = err.message; }
  };
}

(async () => {
  try { const me = await api("/api/admin/me"); $("#who").textContent = me.email; $("#whoi").textContent = (me.email || "?")[0].toUpperCase(); $("#pmi").textContent = (me.email || "?")[0].toUpperCase(); $("#pme").textContent = me.email || ""; const hp = location.hash.slice(1).split("/"), h = hp[0]; try { DEEP = hp[1] ? decodeURIComponent(hp[1]) : ""; } catch { DEEP = ""; } setTab(TABS.includes(h) ? h : "dashboard", false); }
  catch (e) { $("#who").textContent = ""; $("#main").innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
})();


/* ---------- users (everyone who made a profile) ---------- */
let USERS = { q: "", status: "", offset: 0 };
const when = (s) => (s ? esc(localTime(s)) : "never");
const ago = (s) => { if (!s) return "never"; const d = Math.floor((Date.now() - new Date(String(s).replace(" ", "T") + "Z")) / 86400000); return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago"; };
async function renderUsers() {
  const main = $("#main");
  if (UOPEN) { const id = UOPEN; UOPEN = ""; return openUser(id); }
  const qs = new URLSearchParams({ q: USERS.q, status: USERS.status, offset: USERS.offset });
  const d = await api("/api/admin/users?" + qs);
  setCount("users", d.all); setDetail("");
  const tabs = [["", "All", d.all], ["active", "Active", 0], ["suspended", "Suspended", d.suspended]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === USERS.status}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>Users</h2><p>People with a profile. Open one for their homes, events, contests and account actions.</p></div><div class="pgacts"><a class="btn ghost" href="/api/admin/users?format=csv&q=${encodeURIComponent(USERS.q)}&status=${USERS.status}" download>Download CSV</a></div></div>`;
  const bar = toolbar({ search: { placeholder: "Search name or email", value: USERS.q }, count: `${d.total}` });
  const num = (u, n, sec) => `<a class="rl" href="#users" data-open="${esc(u.id)}" data-sec="${sec}">${n}</a>`;
  main.innerHTML = head + bar + (d.users.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Person</th><th>Joined</th><th>Last sign-in</th><th>Homes and entries</th><th>Events</th><th>Contests</th><th>Purchases</th><th>Votes</th><th>Status</th><th class="ac">Actions</th></tr></thead><tbody>${d.users.map((u) => `<tr data-uid="${esc(u.id)}"><td><a class="rl" href="#users" data-open="${esc(u.id)}">${esc(u.name || "(no name)")}</a><span class="sub">${esc(u.email)}${u.google ? " · Google" : ""}</span></td><td>${esc(mdy(u.created_at))}</td><td>${ago(u.last_login)}</td><td>${num(u, u.homes + u.entries + (u.added || 0), "posts")}${u.added ? `<span class="sub">${u.added} added as organizer</span>` : ""}</td><td>${num(u, u.events || 0, "events")}</td><td>${num(u, u.contests, "contests")}</td><td>${u.buys ? num(u, `${money(u.spent) || "$0.00"} · ${u.buys}`, "buys") : "None"}</td><td>${num(u, u.votes, "votes")}</td><td>${u.status === "suspended" ? '<span class="tag bad">Suspended</span>' : '<span class="tag ok">Active</span>'}</td><td class="ac"><a class="rl" href="#users" data-open="${esc(u.id)}">Open</a></td></tr>`).join("")}</tbody></table></div>${pager({ offset: d.offset, shown: d.users.length, total: d.total, page: d.page, idPrev: "uPrev", idNext: "uNext" })}</div>` : `<div class="empty">${USERS.q || USERS.status ? "Nothing matches that." : "Nobody has made a profile yet."}</div>`);
  wireToolbar(main, { onView: (v) => { USERS.status = v; USERS.offset = 0; renderUsers(); }, onSearch: (q) => { USERS.q = q; USERS.offset = 0; renderUsers().then(() => { const i = $("[data-search]"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); } });
  if ($("#uPrev")) $("#uPrev").onclick = () => { USERS.offset = Math.max(0, USERS.offset - d.page); renderUsers(); };
  if ($("#uNext")) $("#uNext").onclick = () => { USERS.offset += d.page; renderUsers(); };
  main.querySelectorAll("[data-open]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); openUser(b.dataset.open, b.dataset.sec); }));
}
// What this person bought: Featured events, homes, installer placements, contest passes, Event Partner plans (each with its status), and the free contest passes Admin granted. Details live in Orders.
const BUYKIND = { event_partner: "Event Partner plan", contest_pass: "Contest pass", home: "Featured home", installer: "Installer placement" };
function buysSection(p) {
  p = p || { rows: [], comps: [], paid_cents: 0 };
  const what = (o) => (o.target === "event_partner" ? "" : o.target === "contest_pass" ? (o.pass_cap ? `up to ${o.pass_cap} contests, ${mdy(o.window_start)} to ${mdy(o.window_end)}` : "") : o.target === "installer" ? INST_PLAN[o.plan] || o.plan : PLAN_NAME[o.plan] || o.plan);
  const rows = p.rows.map((o) => { const st = OSTATUS[o.status] || [o.status || "", ""];
    return `<li><a class="dli" href="#orders">${dico("card")}<span class="dt"><b>${esc(BUYKIND[o.target] || "Featured event")}${o.name ? " · " + esc(o.name) : ""}</b><small>${esc([what(o), money(o.amount, o.currency), mdy(o.created_at)].filter(Boolean).join(" · "))}${o.note ? " · " + esc(String(o.note).replace(/^\[auto\]\s*/, "")) : ""}</small></span><span class="tag ${st[1]}">${esc(st[0])}</span><span aria-hidden="true" class="chev">›</span></a></li>`; }).join("")
    + p.comps.map((c) => `<li><div class="dli">${dico("card")}<span class="dt"><b>Free contest passes (granted by Admin)</b><small>${c.allowed < 0 ? "Unlimited" : "Up to " + c.allowed} contests · until ${esc(mdy(c.valid_until))}${c.note ? " · " + esc(c.note) : ""}</small></span><span class="tag ${c.revoked ? "bad" : "ok"}">${c.revoked ? "Revoked" : "Active"}</span></div></li>`).join("");
  const n = p.rows.length + p.comps.length;
  return psec("Purchases", n, rows, "Nothing bought yet.", "buys") + (p.rows.length ? `<p class="meta" style="margin:6px 0 14px">Paid and kept: <b>${esc(money(p.paid_cents) || "$0.00")}</b> across ${p.rows.length} order${p.rows.length === 1 ? "" : "s"}. Refunds are made in Stripe; open <a href="#orders">Orders</a> for the full record.</p>` : "");
}
async function openUser(id, sec = "") {
  const m = pageHost("users", renderUsers), close = () => { m.hidden = true; m.innerHTML = ""; };
  m.hidden = false; m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><div class="empty">Loading…</div></div>`;
  let d; try { d = await api("/api/admin/users/" + id); } catch (e) { m.innerHTML = `<div class="card"><p>${esc(e.message)}</p><button class="btn ghost" type="button" id="mClose">Close</button></div>`; m.querySelector("#mClose").onclick = close; return; }
  const u = d.user, sus = u.status === "suspended";
  m.innerHTML = `<div class="card wide" role="dialog" aria-modal="true"><div class="mh"><h2>${esc(u.name || u.email)}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    ${sus ? `<p class="msg err" style="margin:6px 0">Suspended ${when(u.suspended_at)}. They can't sign in, vote or enter contests.</p>` : ""}
    <dl class="facts"><dt>Email</dt><dd><span style="user-select:all">${esc(u.email)}</span></dd><dt>Signs in with</dt><dd>${u.google ? "Google or an emailed code" : "An emailed code"}</dd>
    <dt>Joined</dt><dd>${when(u.created_at)}</dd><dt>Last sign-in</dt><dd>${when(u.last_login)} · ${d.sessions} signed-in device${d.sessions === 1 ? "" : "s"}</dd>
    <dt>Address</dt><dd>${esc([u.street, u.city, u.zip].filter(Boolean).join(", ")) || "not given"}</dd><dt id="ps-votes" tabindex="-1">Votes cast</dt><dd>${d.votes}</dd></dl>
    <p style="margin:8px 0">${asLink("Open their profile as them", "/profile", u.id)} <span class="meta">Their drafts, homes, events (with photos), contests, badges and account, exactly as they see them. Recorded in the Admin log.</span></p>
    ${buysSection(d.purchases)}
    ${d.installers.length ? psec("Installer profiles they own", d.installers.length, d.installers.map((i) => prow(`data-pf-inst="${esc(i.id)}"`, "⚒", i.name, "Installer profile", [i.status === "hidden" ? "Hidden" : "Active", i.status === "hidden" ? "bad" : "ok"])).join("")) : ""}
    ${psec("Homes and contest entries", d.posts.length, d.posts.map((p) => prow(`data-pf-post="${esc(p.id)}"`, p.contest_id ? "★" : "⌂", p.title || p.biz, `${p.city || ""} · ${p.contest_id ? "contest entry" : p.season} · ${ago(p.created_at)}`, [p.status === "approved" ? "Live" : p.status === "pending" ? "Waiting" : p.status, p.status === "approved" ? "ok" : p.status === "pending" ? "warn" : ""])).join(""), "None.", "posts")}
    ${psec("Events they submitted", d.events.length, d.events.map((e) => prow(`data-pf-sub="${esc(e.name)}" data-pf-subid="${esc(e.id || "")}" data-pf-view="${e.status === "published" ? "published" : e.status === "declined" ? "declined" : "pending"}"`, "◷", e.name, `${e.city || ""} · ${e.start_date || ""}`, [e.status === "published" ? "Live" : e.status === "pending" ? "Waiting" : e.status, e.status === "published" ? "ok" : e.status === "pending" ? "warn" : ""])).join(""), "None.", "events")}
    ${psec("Contests they run", d.contests.length, d.contests.map((c) => `<li><a class="dli" href="/c/${esc(c.slug)}" target="_blank" rel="noopener">${dico("trophy")}<span class="dt"><b>${esc(c.name)}</b><small>${esc(c.city)}${c.announced ? " · winners announced" : ""}</small></span><span class="tag ${c.status === "live" ? "ok" : c.status === "pending" ? "warn" : ""}">${esc(c.status)}</span><span aria-hidden="true" class="chev">↗</span></a></li>`).join(""), "None.", "contests")}
    ${d.history.length ? `<h3 class="psec">Admin history</h3><ul class="meta" style="margin:0;padding-left:18px">${d.history.map((h) => `<li>${when(h.at)} · ${esc(h.admin || "admin")} ${esc(VERB[h.action] || h.action)}</li>`).join("")}</ul>` : ""}
    <form class="f" id="uForm" novalidate style="margin-top:6px">${fsec("Edit person", "", ff("uName", "Name", `<input id="uName" maxlength="80" value="${esc(u.name)}">`, { hint: "Shown on their entries and in emails to them." }) + ff("uNote", "Private note", `<textarea id="uNote" rows="3" maxlength="1000">${esc(u.admin_note)}</textarea>`, { hint: "Only you see this." }))}
    <div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="uMsg" role="status"></span></div></form>
    <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn ghost" type="button" data-ua="signout">Sign out everywhere</button>
    <button class="btn ghost" type="button" data-ua="${sus ? "unsuspend" : "suspend"}">${sus ? "Reactivate" : "Suspend account"}</button></div>
    <details style="margin-top:14px"><summary style="cursor:pointer;color:#c0392b;font-weight:700">Delete this account</summary>
    <p class="meta" style="margin:8px 0">This permanently removes their sign-ins, drafts, picture, contest entries and votes, closes the contests they run, and clears their email from homes and events they posted. It can't be undone. Type their email to confirm.</p>
    <div class="row"><input id="uDel" placeholder="${esc(u.email)}" style="flex:1;padding:10px 12px;border:1px solid var(--line2);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit"><button class="btn ghost" type="button" data-ua="delete" style="color:#c0392b">Delete</button></div></details></div>`;
  m.querySelector("#mClose").onclick = close;
  if (sec) { const t = m.querySelector("#ps-" + sec); if (t) { t.scrollIntoView({ block: "start" }); t.focus({ preventScroll: true }); } } // a count chip on the list opens the profile at that section
  const msg = (t, bad) => { const e = $("#uMsg"); e.className = bad ? "msg err" : "msg"; e.textContent = t; };
  $("#uForm").onsubmit = async (e) => { e.preventDefault(); try { await api("/api/admin/users/" + id, { method: "POST", body: JSON.stringify({ action: "rename", name: $("#uName").value }) }); await api("/api/admin/users/" + id, { method: "POST", body: JSON.stringify({ action: "note", note: $("#uNote").value }) }); msg("Saved."); renderUsers(); } catch (er) { msg(er.message, true); } };
  m.querySelectorAll("[data-ua]").forEach((b) => (b.onclick = async () => {
    const a = b.dataset.ua;
    if (a === "suspend" && !tap(b, "suspend")) return;
    try { const rr = await api("/api/admin/users/" + id, { method: "POST", body: JSON.stringify({ action: a, confirm: a === "delete" ? $("#uDel").value : undefined }) }); if (a === "suspend" && rr && rr.live && (rr.live.contests || rr.live.homes)) toast(`Suspended. Still live: ${rr.live.contests} contest${rr.live.contests === 1 ? "" : "s"}, ${rr.live.homes} home${rr.live.homes === 1 ? "" : "s"}. Review them under Contests and Published.`); if (a === "delete") { close(); renderUsers(); } else if (a === "signout") { msg("Signed out on every device."); } else { await openUser(id); } } catch (er) { msg(er.message, true); }
  }));
}


/* ---------- activity log (what the admin tools were used for) ---------- */
const VERB = { merge: "merged a duplicate into", recheck: "re-checked the page of", restore: "restored", photo_remove: "removed a photo from", photo_move: "reordered the photos of", dismiss: "dismissed", approve: "approved", decline: "declined", edit: "edited", delete: "deleted", add: "added", suspend: "suspended", unsuspend: "reactivated", signout: "signed out everywhere", rename: "renamed", note: "updated the private note on", start_voting: "started voting on", keep: "showed both records for", hide: "chose the person's record for", pick_post: "chose the person's own record for", pick_both: "chose to show both records for", pick_sweep: "chose the sweep record for", reset: "reset to default" };
const AREA = { users: "account", posts: "house", events: "event", contests: "contest", submissions: "submitted event", overlaps: "sweep record", installers: "installer", reports: "report", removals: "home removal", normalize: "data check", emails: "email template" };
let LOG = { area: "", offset: 0 };
// An edit's changed fields as "field: before to after" lines
const logDetail = (j) => { let d; try { d = j ? JSON.parse(j) : null; } catch { d = null; } return d ? Object.entries(d).map(([k, v]) => (Array.isArray(v) ? `<span class="sub">${esc(k)}: <s>${esc(v[0] || "none")}</s> &rarr; ${esc(v[1] || "none")}</span>` : `<span class="sub">${esc(k.replace(/_/g, " "))}: ${esc(v)}</span>`)).join("") : ""; };
async function renderLog() {
  const main = $("#main");
  const d = await api("/api/admin/log?" + new URLSearchParams(LOG));
  const opt = (v, l) => `<option value="${v}" ${LOG.area === v ? "selected" : ""}>${l}</option>`;
  setDetail("");
  main.innerHTML = `<div class="pghead"><div><h2>Activity log</h2><p>What the Admins did: approving, declining, editing, deleting, suspending and similar actions.</p></div></div>` + toolbar({ right: `<select id="lga" aria-label="Show">${opt("", "Everything")}${opt("users", "Accounts")}${opt("posts", "Houses")}${opt("events", "Events")}${opt("submissions", "Submitted events")}${opt("contests", "Contests")}${opt("installers", "Installers")}${opt("reports", "Reports")}</select>`, count: `${d.total} action${d.total === 1 ? "" : "s"} recorded` })
    + (d.entries.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>When</th><th>Who</th><th>What they did</th></tr></thead><tbody>${d.entries.map((e) => `<tr><td>${when(e.at)}</td><td>${esc(e.admin || "admin")}</td><td>${esc(VERB[e.action] || e.action)} ${esc(AREA[e.area] || e.area)} <b>${esc(e.label || e.target_id || "")}</b>${logDetail(e.detail)}</td></tr>`).join("")}</tbody></table></div>${pager({ offset: d.offset, shown: d.entries.length, total: d.total, page: d.page, idPrev: "lgPrev", idNext: "lgNext" })}</div>`
    : `<div class="empty">Nothing recorded yet. Approving, declining, editing, deleting, suspending and similar actions will show up here.</div>`);
  $("#lga").onchange = (e) => { LOG.area = e.target.value; LOG.offset = 0; renderLog(); };
  if ($("#lgPrev")) $("#lgPrev").onclick = () => { LOG.offset = Math.max(0, LOG.offset - d.page); renderLog(); };
  if ($("#lgNext")) $("#lgNext").onclick = () => { LOG.offset += d.page; renderLog(); };
}


/* ---------- replaced records: a house or installer post replaces the sweep-made listing at the same address ---------- */
const CHOICES = [["pick_post", "post", "Their record"], ["pick_both", "both", "Both"], ["pick_sweep", "sweep", "Sweep record"]];
const choiceButtons = (r) => `<div class="row" style="gap:0;flex-wrap:nowrap" role="group" aria-label="Which record visitors see">${CHOICES.map(([a, c, l], i) => `<button type="button" data-ov="${a}" data-eid="${esc(r.event.id)}" aria-pressed="${r.event.choice === c}" class="btn ${r.event.choice === c ? "ice" : "ghost"}" style="border-radius:${i === 0 ? "10px 0 0 10px" : i === 2 ? "0 10px 10px 0" : "0"};padding-inline:12px;white-space:nowrap">${l}</button>`).join("")}</div>`;
let OVV = "replaced";
async function renderOverlaps() {
  const main = $("#main"), d = await api("/api/admin/overlaps");
  setCount("overlaps", d.replaced.length); setDetail("");
  const who = (p) => `<a class="rl" href="#" data-gopost="${esc(p.id)}" data-name="${esc(p.title)}">${esc(p.title)}</a><span class="sub">${p.kind === "installer" ? "installer" : "homeowner"}, ${esc(p.biz)}</span>`;
  const tabs = [["replaced", "Replaced", d.replaced.length], ["near", "Same street", d.near.length]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === OVV}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>`;
  let body;
  if (OVV === "replaced") {
    body = `<div class="pghead"><div><h2>Replaced records</h2><p>When an approved house or installer post has the same street address as a record the sweeps made, the person's own record is shown and the sweep record is hidden. Choose which one visitors see for each address. Nothing is deleted, and the person's post stays approved.</p></div></div>`
      + (d.replaced.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Sweep record</th><th>The person's record</th><th>Win on their listing</th><th>Showing</th><th>Visitors see</th></tr></thead><tbody>${d.replaced.map((r) => `<tr data-ovid="${esc(r.event.id)}"><td><b>${esc(r.event.name)}</b><span class="sub">${esc(r.event.address)}</span></td><td>${who(r.post)}</td><td>${esc(r.event.win || "")}</td><td><span class="tag ${r.event.choice === "post" ? "ok" : ""}">${r.event.choice === "sweep" ? "Sweep record" : r.event.choice === "both" ? "Both" : "Their record"}</span></td><td>${choiceButtons(r)}</td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${d.replaced.length} replaced</span></div></div>` : '<div class="empty">Nothing replaced yet.</div>');
  } else {
    body = `<div class="pghead"><div><h2>Same street, different number</h2><p>Both records stay listed.</p></div></div>`
      + (d.near.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Sweep record</th><th>The person's record</th><th>Their street</th></tr></thead><tbody>${d.near.map((r) => `<tr><td><b>${esc(r.event.name)}</b><span class="sub">${esc(r.event.address)}</span></td><td>${who(r.post)}</td><td>${esc(r.post.street)}, ${esc(r.post.city)}</td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${d.near.length} pair${d.near.length === 1 ? "" : "s"}</span></div></div>` : '<div class="empty">None.</div>');
  }
  main.innerHTML = head + body;
  main.querySelectorAll(".pgtabs [data-view]").forEach((b) => (b.onclick = () => { OVV = b.dataset.view; renderOverlaps(); }));
  main.querySelectorAll("[data-ov]").forEach((b) => (b.onclick = async () => { main.querySelectorAll("[data-ov]").forEach((x) => (x.disabled = true)); try { await api("/api/admin/overlaps", { method: "POST", body: JSON.stringify({ action: b.dataset.ov, event_id: b.dataset.eid }) }); toast("Saved"); renderOverlaps(); refreshCounts(); } catch (e) { renderOverlaps(); toast(e.message, true); } }));
  main.querySelectorAll("[data-gopost]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); PRESET = a.dataset.name; setTab("approved"); }));
}


/* ---------- installers: edit a profile, hide it, or merge two spellings of one company ---------- */
let INST = [];
// The cities an installer serves can run to a dozen: the list shows the first three and "+N more" (the full list is in its tooltip and on the record page).
const areasShort = (v) => { const a = String(v || "").split(/\s*,\s*/).filter(Boolean); return a.length > 3 ? `${esc(a.slice(0, 3).join(", "))} <span class="more" title="${esc(a.join(", "))}">+${a.length - 3} more</span>` : esc(a.join(", ")); };
async function renderInstallers() {
  const main = $("#main");
  if (INSTOPEN) { const id = INSTOPEN; INSTOPEN = ""; return openInstaller(id); }
  INST = await api("/api/admin/installers"); setDetail("");
  setCount("installers", INST.length);
  const head = `<div class="pghead"><div><h2>Installers</h2><p>Installer profiles. One appears when an installer posts a display or a homeowner names the company that installed their lights. Open one for its homes, quote requests and edit form.</p></div><div class="pgacts">${dl("installers")}</div></div>`;
  if (!INST.length) { main.innerHTML = head + `<div class="empty">No installer profiles yet. One appears when an installer posts a display or a homeowner names the company that installed their lights.</div>`; return; }
  main.innerHTML = head + toolbar({ search: { placeholder: "Search installers" }, count: String(INST.length) }) + `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Installer</th><th>Homes</th><th>Contact</th><th>Owner</th><th>Status</th><th class="ac">Actions</th></tr></thead><tbody>${INST.map((i) => `<tr data-iid="${esc(i.id)}"><td><a class="rl" href="#installers" data-iedit="${esc(i.id)}">${esc(i.name)}</a><span class="sub">${areasShort(i.area)}</span></td><td>${i.homes}${i.unconfirmed ? `<span class="sub">${i.unconfirmed} not confirmed</span>` : ""}</td><td>${esc(i.phone || "")}<span class="sub">${esc(i.web || "")}</span></td><td>${esc(i.owner_email || "")}</td><td><span class="tag ${i.status === "hidden" ? "bad" : "ok"}">${i.status === "hidden" ? "Hidden" : "Active"}</span></td><td class="ac"><div class="racts"><a class="rl" href="#installers" data-iedit="${esc(i.id)}">Open</a><a class="rl" href="/installer/${esc(i.slug)}" target="_blank" rel="noopener">View public page ↗</a><a class="rl" href="${asUrl("/installer/" + i.slug + "/manage")}" target="_blank" rel="noopener">Edit as owner ↗</a>${btn("ghost", i.status === "hidden" ? "Show" : "Hide", `data-iact="${i.status === "hidden" ? "show" : "hide"}"`).replace('class="btn ghost"', 'class="btn ghost sm"')}</div></td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${INST.length} installer${INST.length === 1 ? "" : "s"}</span></div></div>`;
  wireToolbar(main, { onSearch: (q) => filterCards(main, q) }); applyPreset(main);
}
const instAct = async (id, body) => api("/api/admin/installers/" + id, { method: "POST", body: JSON.stringify(body) });
// ---- shared pieces of the Installer and User profile windows
const psec = (title, n, rows, empty = "None.", key = "") => `<h3 class="psec"${key ? ` id="ps-${key}" tabindex="-1"` : ""}>${esc(title)} <span class="meta">(${n})</span></h3>` + (n ? `<ul class="dl">${rows}</ul>` : `<p class="meta" style="margin:0">${empty}</p>`);
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
  else if ((b = q("[data-pf-sub]"))) { $("#modal").hidden = true; $("#modal").innerHTML = ""; SUBOPEN = b.dataset.pfSubid || ""; PRESET = SUBOPEN ? "" : b.dataset.pfSub; SUBVIEW = b.dataset.pfView || "pending"; setTab("subs"); } // the exact submission when we have its id (the list with the name typed in was the old behavior)
});

// The installer's profile: who they are, everything linked to them, then the edit form
async function openInstaller(id) {
  const m = pageHost("installers", renderInstallers), close = () => { m.hidden = true; m.innerHTML = ""; };
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
    ${fsec("Map banner and top of the list", "Banner: a thin labeled strip on the map. Top of the list: a labeled company card at the top of the list, behind Featured events. The banner plus top plan gets both, so set both dates. Installers can now buy these themselves at /sponsor; a paid order sets these dates (see Orders), and a date here can never be set earlier than a paid order that is still running. Leave a date empty to keep them off. Needs a phone number or website.", ff("if-ban", "Banner until", `<input id="if-ban" data-f="banner_until" type="date" value="${esc(i.banner_until || "")}">`, { c: "c3", hint: `Last 30 days: shown ${d.banner.imp}, company link ${d.banner.click}, phone ${d.banner.call}.` }) + ff("if-top", "Top of the list until", `<input id="if-top" data-f="top_until" type="date" value="${esc(i.top_until || "")}">`, { c: "c3", hint: `Last 30 days: shown ${d.banner.lst_imp}, taps on the card ${d.banner.lst_click + d.banner.lst_call}.` }))}
    ${fsec("Contacts", "These are private. They never appear on the public page.", ff("if-email", "Email for confirmations", `<input id="if-email" data-f="email" type="email" value="${esc(i.email || "")}" maxlength="120">`, { c: "c3", hint: "Where we send requests to confirm a home." }) + ff("if-owner", "Owner email", `<input id="if-owner" data-f="owner" type="email" value="${esc(i.owner_email || "")}" maxlength="120">`, { c: "c3", hint: "This person can edit the profile after signing in." }))}
    <div class="mfoot sticky"><button class="btn ice" type="submit">Save</button><button class="btn ghost" type="button" data-mcancel>Cancel</button><span class="msg" id="iMsg" role="status"></span></div></form>
    ${transferBox("installer", i.id)}
    <details style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Merge into another profile</summary>
    <p class="meta" style="margin:8px 0">Moves every home to the profile you keep and removes this one. Use it when one company was typed two ways.</p>
    <div class="mfoot" style="margin-top:0"><select id="iMerge" aria-label="Merge ${esc(i.name)} into" style="flex:1;min-width:200px"><option value="">Choose the profile to keep…</option>${INST.filter((o) => o.id !== i.id).map((o) => `<option value="${esc(o.id)}">${esc(o.name)} (${o.homes})</option>`).join("")}</select><button class="btn ghost danger" type="button" id="iMergeGo">Merge</button></div></details>
    <details class="mdet"><summary>Delete this profile</summary><p class="meta">Removes the profile, its quote requests and its page counts. Homes that named it stay, with no installer. Needs the name typed. No email is sent.</p><div class="mfoot" style="margin-top:0"><input id="iDelName" placeholder="Type ${esc(i.name)}" aria-label="Type the installer name to delete" style="flex:1;min-width:200px"><button class="btn ghost danger" type="button" id="iDelGo">Delete profile</button></div></details>`, true);
  wireAreas(m); m.querySelector("#mClose").onclick = close;
  const msg = (t, bad) => { const e = $("#iMsg"); e.className = bad ? "msg err" : "msg"; e.textContent = t; };
  $("#iForm").onsubmit = async (e) => { e.preventDefault(); const body = { action: "edit" }; m.querySelectorAll("[data-f]").forEach((el) => (body[el.dataset.f] = el.value)); try { await instAct(i.id, body); toast("Saved"); await openInstaller(i.id); refreshCounts(); } catch (er) { msg(er.message, true); } };
  $("#iDelGo").onclick = async () => { try { await instAct(i.id, { action: "delete", confirm: $("#iDelName").value }); close(); toast("Profile deleted"); renderInstallers(); refreshCounts(); } catch (er) { msg(er.message, true); } };
  $("#iMergeGo").onclick = async (e) => { const into = $("#iMerge").value; if (!into) return msg("Choose the profile to keep.", true); if (!tap(e.target, "merge")) return; try { await instAct(i.id, { action: "merge", into }); close(); toast("Merged"); renderInstallers(); refreshCounts(); } catch (er) { msg(er.message, true); } };
}
$("#main").addEventListener("click", async (e) => {
  const ed = e.target.closest("[data-iedit]"); if (ed) return openInstaller(ed.dataset.iedit);
  const b = e.target.closest("[data-iact]"); if (!b) return;
  const card = b.closest("[data-iid]"), msg = card.querySelector(".msg") || { set className(v) {}, set textContent(v) {} };
  b.disabled = true;
  try { await instAct(card.dataset.iid, { action: b.dataset.iact }); toast(b.dataset.iact === "hide" ? "Hidden from the site" : "Shown on the site"); renderInstallers(); refreshCounts(); }
  catch (err) { b.disabled = false; msg.className = "msg err"; msg.textContent = err.message; toast(err.message, true); }
});


/* ---------- data check: tidy every stored phone, website, email, ZIP, street and name ---------- */
async function renderData(res) {
  const main = $("#main");
  main.innerHTML = `<p class="loading">Checking every saved record…</p>`;
  const d = res || (await api("/api/admin/normalize"));
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  setDetail("");
  const fieldRows = d.fields.map((f) => `<tr><td><b>${esc(f.table)}</b><span class="sub">${esc(f.field)}</span></td><td><span class="tag ${f.changed ? "warn" : "ok"}">${d.dry ? `${plural(f.changed, "value")} would change` : `${plural(f.changed, "value")} changed`}</span>${f.attention ? ` <span class="tag bad">${f.attention} need a person</span>` : ""}</td><td>${f.examples.map((x) => `<div class="sub"><b>${esc(x.record)}</b>: <s>${esc(x.old)}</s> &rarr; ${esc(x.new)}</div>`).join("")}</td></tr>`).join("");
  const attnRows = d.attention.map((a) => `<tr><td><b>${esc(a.table)}</b><span class="sub">${esc(a.field)}</span></td><td>${esc(a.record)}</td><td>${esc(a.value)}</td></tr>`).join("");
  main.innerHTML = `<div class="pghead"><div><h2>Data check</h2><p>Phones become (310) 555-0123, websites https://example.com/, emails lowercase, ZIPs five digits, streets "123 Main St", names tidy capitals. Anything that can't be fixed automatically is left alone and listed below. New entries are tidied as they are typed, so this only cleans up older records.</p></div><div class="pgacts"><button class="btn ghost" type="button" id="dc-check">Check again</button>${d.dry && d.changed ? `<button class="btn ice" type="button" id="dc-fix">Tidy ${plural(d.changed, "value")}</button>` : ""}</div></div>
   <div class="dcsum"><div class="stat"><b>${d.changed}</b><span>${d.dry ? "values would change" : "values changed"}</span></div><div class="stat"><b>${d.needsPerson || 0}</b><span>need a person</span></div><div class="dcact"><span class="meta">${d.dry ? "Check only: nothing has been changed." : "Done."}</span><span class="msg" id="dc-msg" role="status"></span></div></div>
   <h2 class="dh">Fields</h2>${d.fields.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Table and field</th><th>Result</th><th>Examples</th></tr></thead><tbody>${fieldRows}</tbody></table></div></div>` : `<div class="empty">Everything is already tidy.</div>`}
   ${d.attention.length ? `<h2 class="dh" style="margin-top:28px">Needs a person (left as they are)</h2><div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Table and field</th><th>Record</th><th>Value</th></tr></thead><tbody>${attnRows}</tbody></table></div></div>` : ""}`;
  $("#dc-check").onclick = () => renderData();
  const fx = $("#dc-fix"); if (fx) fx.onclick = async () => { if (!tap(fx, "change " + plural(d.changed, "value"))) return; fx.disabled = true; $("#dc-msg").textContent = "Working…"; try { const r = await api("/api/admin/normalize", { method: "POST", body: JSON.stringify({ apply: true }) }); toast("Records tidied"); renderData(r); } catch (e) { fx.disabled = false; $("#dc-msg").className = "msg err"; $("#dc-msg").textContent = e.message; } };
}


/* ---------- dashboard: what needs you, today's numbers, what is live, what just happened ---------- */
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const agoShort = (s) => { const t = Date.parse(String(s || "").replace(" ", "T") + (/Z|\+/.test(String(s)) ? "" : "Z")); if (!t) return ""; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " hr ago" : Math.round(m / 1440) + " d ago"; };
const shortDate = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(new Date())) % 24;
const DI = {
  event: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/>', pro: '<path d="M14 7l3-3 3 3-3 3M17 7l-9.5 9.5a2 2 0 0 1-3-3L14 4"/><path d="M4 20h6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>', edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>', check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', chev: '<path d="M9 6l6 6-6 6"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
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
// Data health: counts of the checks in public/admin/health.js; a row opens the Events tab already filtered to those events
function healthCard(h) {
  if (!h) return "";
  const m = h.map || {};
  return `<h2 class="dh">Data health</h2><section class="hcard" aria-label="Data health"><p class="meta" style="margin:0 0 10px"><b>${fmt(m.total)}</b> events are on the public map now (${fmt(m.confirmed)} confirmed, ${fmt(m.expected)} expected, ${m.total ? Math.round((m.expected / m.total) * 100) : 0}% still expected). ${fmt(h.stored)} rows are stored in all, including past seasons. Tap a row to see those events.</p>
    <div class="hlist">${HEALTH.map(([k, label, why]) => `<button type="button" class="hrow ${h[k] ? "bad" : "ok"}" data-hfilter="${k}" title="${esc(why)}"><b>${fmt(h[k])}</b><span>${esc(label)}</span><i aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DI.chev}</svg></i></button>`).join("")}</div>
    <p class="meta" style="margin:10px 0 0">Not counted here: cities with no events (see docs/coverage-cities.md) and whether a photo shows the right place.</p></section>`;
}
const usdOf = (c) => "$" + (Number(c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Orders added up for the last 30 days, by product (Orders tab and dashboard). Stripe is the source of truth.
function revenueStrip(r, link = false) {
  if (!r) return "";
  if (r.error) return `<h2 class="dh">Revenue, last ${r.days || 30} days</h2><p class="meta">The orders could not be read: ${esc(r.error)}</p>`;
  const t = r.total, anyRefund = t.refunded > 0 || t.atRisk > 0; // refund columns only appear once someone has actually asked for a refund
  return `<h2 class="dh">Revenue, last ${r.days} days</h2><section class="hcard" aria-label="Revenue, last ${r.days} days">
    <div class="stats"><div class="stat"><b>${usdOf(t.net)}</b><span>${anyRefund ? "revenue after refunds" : "revenue"}</span></div><div class="stat"><b>${fmt(t.orders)}</b><span>${t.orders === 1 ? "order" : "orders"}</span></div>${t.refunded > 0 ? `<div class="stat"><b>${usdOf(t.refunded)}</b><span>refunded</span></div>` : ""}${t.atRisk > 0 ? `<div class="stat"><b>${usdOf(t.atRisk)}</b><span>refunds to handle (due, held or disputed)</span></div>` : ""}</div>
    ${r.rows.length ? `<div class="dtw" style="margin-top:12px"><table class="dtab"><thead><tr><th scope="col">Product</th><th scope="col">Orders</th><th scope="col">${anyRefund ? "Collected" : "Revenue"}</th>${anyRefund ? '<th scope="col">Refunded</th><th scope="col">Left after refunds</th>' : ""}</tr></thead><tbody>${r.rows.map((x) => `<tr><td>${esc(x.label)}</td><td>${fmt(x.orders)}</td><td>${usdOf(x.gross)}</td>${anyRefund ? `<td>${usdOf(x.refunded)}</td><td>${usdOf(x.net)}</td>` : ""}</tr>`).join("")}</tbody></table></div>` : `<p class="meta" style="margin:10px 0 0">No orders in the last ${r.days} days.</p>`}
    <p class="meta" style="margin:10px 0 0">What people paid us, from the orders this site recorded${anyRefund ? ", with refunds taken off" : ""}. The Stripe dashboard is the record of money. ${r.otherCurrency ? `${r.otherCurrency} order(s) in another currency are left out. ` : ""}${link ? 'Details and refunds: <a href="#orders" data-tab="orders">Orders</a>.' : ""}</p></section>`;
}
const agoLong = (s) => { const t = Date.parse(String(s || "").replace(" ", "T") + (/Z|\+/.test(String(s)) ? "" : "Z")); if (!t) return ""; const m = Math.max(0, Math.round((Date.now() - t) / 60000)), u = (n, w) => n + " " + w + (n === 1 ? "" : "s") + " ago"; return m < 1 ? "just now" : m < 60 ? u(m, "minute") : m < 1440 ? u(Math.round(m / 60), "hour") : u(Math.round(m / 1440), "day"); };
// "Errors, last 7 days": one status line (a check, or how many errors need a look), one row per kind of error with plain-word timing, and the alerts we emailed apart (they are not errors).
function errorsCard(e) {
  if (!e) return "";
  const row = (title, sub, tag) => `<li><div class="dli" style="cursor:default"><span class="dt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${tag}</div></li>`;
  const rows = [...e.groups.map((g) => row(g.label, `${agoLong(g.last)}${g.example ? " · " + g.example : ""}`, g.n > 1 ? `<span class="tag bad">${fmt(g.n)} times</span>` : "")),
    ...(e.mailFailed ? [row("Emails that failed for good", "Still in the send queue as failed", `<span class="tag bad">${fmt(e.mailFailed)}</span>`)] : []),
    ...e.failedJobs.map((j) => row(`${j.label}: last run failed`, agoLong(j.last), ""))];
  const alerts = (e.alerts || []).map((a) => row(a.text, `${agoLong(a.last)}${a.n > 1 ? " · " + a.n + " times" : ""}`, '<span class="tag">Alert sent</span>'));
  const status = e.error ? `<span class="wic" aria-hidden="true">!</span><div><b>${esc(e.error)}</b></div>` : e.total ? `<span class="wic" aria-hidden="true">!</span><div><b>${fmt(e.total)} ${e.total === 1 ? "error needs" : "errors need"} a look</b></div>` : `<span class="okic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><div><b>No errors in the last 7 days</b></div>`;
  return `<h2 class="dh">Errors, last 7 days</h2><div class="calm ${e.total ? "warnbox" : ""}">${status}</div>${rows.length ? `<ul class="dl">${rows.join("")}</ul>` : ""}${alerts.length ? `<h3 class="psec">Alerts we sent you</h3><ul class="dl">${alerts.join("")}</ul>` : ""}${(e.activity || []).length ? `<p class="meta" style="margin:8px 0 0">Logged but not errors: ${e.activity.map((a) => `${esc(a.label)} ${fmt(a.n)}`).join(" · ")}.</p>` : ""}<p class="meta" style="margin:8px 0 0">Counted as errors: failed emails, payment webhook problems, limits hit and failed scheduled jobs. ${esc(e.notStored[0] || "")}</p>`;
}
function runsCard(r) {
  if (!r) return "";
  const tag = (w) => (w.failed ? ["bad", "failed"] : w.stale ? ["bad", "late"] : w.status === "none" ? ["", "no report"] : ["ok", "ok"]);
  return `<h2 class="dh">Last run of each job</h2><ul class="dl">${r.workflows.map((w) => { const [c, t] = tag(w); return `<li><div class="dli" style="cursor:default"><span class="dt"><b>${esc(w.label)}</b><small>every ${esc(w.every)} · ${w.last ? "last report " + esc(agoShort(w.last)) : "never reported"}</small></span><span class="tag ${c}">${t}</span></div></li>`; }).join("")}
    <li><div class="dli" style="cursor:default"><span class="dt"><b>Last Stripe event received</b><small>${r.stripe ? esc(r.stripe.type) + " · " + esc(agoShort(r.stripe.at)) : "none yet (payments reach the site once a real purchase or test event arrives)"}</small></span></div></li>
    <li><div class="dli" style="cursor:default"><span class="dt"><b>Event data last published</b><small>${r.migration ? esc(r.migration.name) + " · applied " + esc(agoShort(r.migration.at)) : "not available"}</small></span></div></li></ul><p class="meta" style="margin:8px 0 0">${esc(r.notRecorded.join(" "))}</p>`;
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-hfilter]"); if (b) { evSeason = "all"; EVHEALTH = b.dataset.hfilter; EVQ = ""; EVSTATUS = ""; EVVIEW = ""; EVCOUNTY = ""; EVLIMIT = 0; setTab("events"); } });
async function renderDashboard() {
  const main = $("#main"), d = await api("/api/admin/dashboard"); setDetail("");
  const a = d.attention, todo = [
    ["pending", a.waitHomes, "house", "waiting for your review"], ["subs", a.waitEvents, "event", "submitted, waiting for review"], ["contests", a.waitContests, "contest", "waiting for approval"],
    ["reports", a.reports, "report", "from visitors this week"], ["installers", a.claims, "installer claim", "on a home, to confirm"],
    ["claims", a.eventClaims, "event claim", "waiting for a decision"], ["grok", a.grokHeld, "Grok item", "held for your review"], ["approved", a.waitVideos, "home video", "waiting for approval", "videos"], ["events", a.waitEventVideos, "event video", "waiting for approval", "video"],
  ].filter((t) => t[1] > 0);
  const tile = (k, n, l, more = "") => `<div class="stat"><b>${fmt(n)}</b><span>${l}</span>${more ? `<small class="meta">${more}</small>` : ""}</div>`;
  const kindTab = { home: "pending", event: "subs" };
  main.innerHTML = `
    <div class="pghead"><div><h2>${hour < 5 ? "Hello" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}</h2><p>${todo.length ? "Here is what needs you." : "Nothing is waiting on you."}</p></div></div>
    ${d.staleJobs && d.staleJobs.length ? `<details class="limitbanner stale" role="alert"><summary><b>${d.staleJobs.length === 1 ? "A scheduled job has stopped reporting in." : d.staleJobs.length + " scheduled jobs have stopped reporting in."}</b><span class="stmore">Details</span></summary>${d.staleJobs.slice(0, 5).map((j) => `<span>${esc(j.line)}</span>`).join("")}${d.staleJobs.length > 5 ? `<span>and ${d.staleJobs.length - 5} more (see Last run of each job).</span>` : ""}<span>GitHub runs scheduled jobs late or skips them. Run the workflow by hand from GitHub > Actions, or see docs/runbooks/monitoring.md.</span></details>` : ""}
    ${d.limits && d.limits.length ? `<button type="button" class="limitbanner" data-tab="usage"><b>A Cloudflare or email limit was hit at ${esc(localTime(d.limits[0].at))}.</b><span>${esc(String(d.limits[0].detail).slice(0, 140))} Open Cloudflare usage to see which one and what to do.</span></button>` : ""}
    <section aria-label="Needs your attention">${todo.length ? `<div class="todo">${todo.map(([k, n, w, l, pv]) => `<button type="button" class="tcard" data-tab="${k}"${pv ? ` data-pview="${pv}"` : ""}><b>${fmt(n)}</b><span>${w}${n === 1 ? "" : "s"} ${l}</span><i aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DI.chev}</svg></i></button>`).join("")}</div>` : `<div class="calm">${dico("check", "okic")}<div><b>All caught up</b><p class="meta" style="margin:2px 0 0">No houses, events, contests, reports, event claims or Grok rows are waiting.</p></div></div>`}</section>
    <h2 class="dh">Today</h2>
    <div class="stats">${tile("h", d.today.homes, "new houses")}${tile("e", d.today.events, "events submitted")}${tile("c", d.today.entries, "contest entries")}${tile("l", d.people.litToday, "lights switched on")}</div>
    <h2 class="dh">On the site now</h2>
    <div class="stats">${tile("h", d.live.homes, "published houses")}${tile("e", d.live.events, "map events", `${fmt(d.live.eventsConfirmed)} confirmed · ${fmt(d.live.eventsExpected)} expected`)}${tile("c", d.live.contests, "contests running")}${tile("i", d.live.installers, "installers")}</div>
    ${healthCard(d.health)}
    ${revenueStrip(d.revenue, true)}
    <div class="dcols">
      <section class="dbox" aria-label="Errors, last 7 days">${errorsCard(d.errors)}</section>
      <section class="dbox" aria-label="Last run of each job">${runsCard(d.runs)}</section>
    </div>
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
  collapseDash(main);
}
// On a phone the Dashboard was 7,500px of scrolling. The reference sections (traffic, job history, site usage) fold behind one tap each; what needs a decision (Needs you, Today, Revenue, Errors) stays open.
const DASH_FOLD = ["On the site now", "Data health", "Last run of each job", "People, last 7 days", "Last 14 days", "Most visited pages, last 14 days", "How people use the site", "Taps on links and buttons"];
function collapseDash(main) {
  if (!phone()) return;
  [...main.querySelectorAll("h2.dh")].forEach((h) => { // also the ones inside the two-column boxes
    const name = h.textContent.trim(); if (!DASH_FOLD.includes(name)) return;
    const det = document.createElement("details"), sum = document.createElement("summary"), move = [];
    det.className = "dcoll"; sum.textContent = name; det.appendChild(sum);
    for (let n = h.nextSibling; n && !(n.nodeType === 1 && n.matches("h2.dh, .dcols")); n = n.nextSibling) move.push(n);
    h.replaceWith(det); move.forEach((x) => det.appendChild(x));
  });
  // Everything below Today and Errors goes behind one "More detail" fold: the phone opens on what needs you, today's numbers and the errors
  const kids = [...main.children], todayAt = kids.findIndex((k) => k.matches("h2.dh") && /^today$/i.test(k.textContent.trim())), errAt = kids.findIndex((k) => k.classList.contains("dcols") && /errors, last 7 days/i.test(k.textContent));
  if (todayAt >= 0 && errAt > todayAt + 1) {
    const more = document.createElement("details"), sum = document.createElement("summary"); more.className = "dcoll dmore"; sum.textContent = "More detail: the site, revenue, traffic, newest submissions, activity"; more.appendChild(sum);
    kids.forEach((k, i) => { if (i > todayAt + 1 && i !== errAt) more.appendChild(k); });
    main.appendChild(more);
  }
}

/* ---------- Cloudflare usage, plan-aware: Workers Paid (monthly included amounts, extra charges) or free (daily hard limits). Read-only. ---------- */
const U_BYTES = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : fmt(n) + " B");
const U_NUM = (m, n) => (m.unit === "bytes" ? U_BYTES(n) : fmt(n));
const U_TAG = { ok: ["ok", "OK"], watch: ["warn", "Watch"], warning: ["bad", "Warning"], limit: ["bad", "Limit reached"], unknown: ["", "No data"] };
const U_RESET = { day: "Resets at 00:00 UTC (4 pm Pacific in winter, 5 pm in summer)", now: "Current size" };
const U_USD = (n) => (n > 0 && n < 0.01 ? "under $0.01" : "$" + Number(n || 0).toFixed(2));
function usageCard(m, u) {
  const paid = u.plan === "paid", billed = m.hardStop === false; // billed: going over costs money but does not stop the site
  const [cls, lab0] = U_TAG[m.level] || U_TAG.unknown, lab = m.level === "limit" && billed ? "Extra charges start" : lab0, pct = m.pct == null ? 0 : Math.min(100, m.pct);
  const incl = billed ? (m.period === "month" ? " included this month" : " included") : "";
  const reset = m.period === "month" ? (paid ? `Billing month from ${mdy(u.periodStart)} (UTC)` : "Month to date (calendar month, UTC)") : U_RESET[m.period];
  const trend = m.trend && m.trend.length ? `<details class="utrend"><summary>Last 7 days ${usageSpark(m.trend)}</summary><table><thead><tr><th scope="col">UTC day</th><th scope="col">${m.period === "month" ? "That day" : "Used"}</th></tr></thead><tbody>${m.trend.map((p) => `<tr><td>${esc(p.d)}</td><td>${fmt(p.v)}</td></tr>`).join("")}</tbody></table></details>` : "";
  const extra = m.used != null && billed && m.over > 0 ? `<p class="meta uover"><b>Estimated extra charge: ${U_USD(m.overUsd)}</b> (${U_NUM(m, m.over)} past the included amount at ${esc(m.priceText)}). The site keeps working.</p>` : "";
  const today = m.used != null && m.period === "month" && m.today != null ? `<p class="meta" style="margin:2px 0 0">Today (UTC): ${U_NUM(m, m.today)}</p>` : "";
  return `<article class="ucard u-${esc(m.level)}" aria-label="${esc(m.label)}">
    <div class="uh"><h3>${esc(m.label)}</h3><span class="tag ${cls}">${lab}</span></div>
    ${m.used == null ? `<p class="meta" style="margin:6px 0 0">${esc(m.why || "No data")}</p>` : `<p class="unum"><b>${U_NUM(m, m.used)}</b> of ${U_NUM(m, m.limit)}${incl} <span class="meta">(${m.pct}%)</span></p>
    <div class="ubar" role="progressbar" aria-label="${esc(m.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-valuetext="${m.pct}% of the ${billed ? "included amount" : "limit"}"><i style="width:${pct}%"></i></div>`}
    ${today}${extra}
    <p class="meta ures">${reset} · ${billed ? "included" : "limit"} ${U_NUM(m, m.limit)} ${m.verified ? "" : '<span class="tag">unverified</span>'} · <a href="${esc(m.source)}" target="_blank" rel="noopener">source</a></p>
    ${trend}
    <details class="utrend"><summary>${billed ? "What happens past the included amount" : "What happens at the limit"}</summary><p class="meta" style="margin:6px 0 0">${esc(m.breaks)}${!paid && m.paid ? ` On a paid plan: ${esc(m.paid)}.` : ""}</p></details>
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
  const grp = (title, keys) => { const ms = u.metrics.filter((m) => keys.includes(m.key)); return `<h2 class="dh">${title}</h2>` + (u.connected ? `<div class="ugrid">${ms.map((m) => usageCard(m, u)).join("")}</div>` : `<div class="card ucompact"><ul>${ms.map((m) => `<li><span>${esc(m.label)}</span><span class="meta">${m.unit === "bytes" ? "included" : "included"} ${U_NUM(m, m.limit)}${m.period === "month" ? " a month" : m.period === "day" ? " a day" : ""}</span></li>`).join("")}</ul></div>`); }, paid = u.plan === "paid";
  const worst = u.top ? `${esc(u.top.label)} at ${u.top.pct}%` : "no numbers yet";
  const steps = `<section class="ucard u-ok" aria-label="Connect Cloudflare analytics"><div class="uh"><h3>Not connected</h3><span class="tag">Cloudflare numbers off</span></div>
    <p class="meta" style="margin:6px 0">${u.error ? esc(u.error) : "This page needs two secrets so it can read Cloudflare's usage numbers (read-only). Email counts and logged limit errors work without them."}</p>
    <details class="more"><summary>Show the setup steps</summary><ol class="usteps"><li>Cloudflare dashboard &gt; avatar (top right) &gt; My Profile &gt; API Tokens &gt; Create Token &gt; Custom token &gt; Get started.</li><li>Permission: Account / Account Analytics / Read. Account resources: Include / this account. Continue to summary &gt; Create Token. Copy the token once.</li><li>Account ID: Workers &amp; Pages overview, right-hand column (it is also the long code in the dashboard address after /).</li><li>Workers &amp; Pages &gt; socal-lights &gt; Settings &gt; Variables and Secrets &gt; Add. Type: Secret, name <code>CF_ANALYTICS_TOKEN</code>, paste the token. Add again: Secret <code>CF_ACCOUNT_ID</code>. Environment: Production. Save.</li><li>Redeploy (Deployments &gt; the latest &gt; Retry deployment), then reload this page.</li></ol></details>
    <p class="meta" style="margin:0">Full steps: docs/runbooks/cloudflare-limits.md</p></section>`;
  const asOf = u.connected && u.fetchedAt ? `Cloudflare numbers as of ${esc(localTime(u.fetchedAt))} (cached up to 5 minutes).` : "";
  const tile = (k, v, sub = "") => `<div class="ustat"><span>${k}</span><b>${v}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const hi = tile("Highest right now", u.top ? `${u.top.pct}%` : "No numbers yet", u.top ? esc(u.top.label) : "");
  const tiles = paid
    ? tile("Plan", "Workers Paid", `$${u.planBaseUsd} a month`) + tile("Billing month", `Since ${esc(mdy(u.periodStart))}`, "UTC. Included amounts are for the month, not per day") + tile("Extra charges so far", U_USD(u.estimatedOverageUsd), `Beyond the $${u.planBaseUsd}. An estimate, not the invoice`) + hi
    : tile("Plan", "Cloudflare Free", "Daily limits") + tile("Today", `UTC day ${esc(mdy(u.utcDay))}`, "Resets at 00:00 UTC and the site stops until then") + hi;
  const note = paid
    ? `Passing an included amount is <b>not</b> a stop: extra use is billed. The charge figure is an estimate from Cloudflare's analytics, so check Billing for the real number. Prices checked ${esc(mdy(u.pricingVerified))}.`
    : "";
  const planBar = `<div class="ustats">${tiles}</div>
    <div class="uhbar"><div class="ulegend" aria-label="Colors"><span class="tag warn">Watch</span><span class="meta">from 70%</span><span class="tag bad">Warning</span><span class="meta">from 90%</span><span class="tag bad">${paid ? "Extra charges start" : "Limit reached"}</span><span class="meta">at 100%${paid ? " of the included amount" : ""}</span></div></div>
    <p class="meta ufoot">${note} Read-only: this page cannot change anything.${asOf ? " " + asOf : ""}</p>`;
  setDetail("");
  main.innerHTML = `<div class="pghead"><div><h2>Cloudflare usage</h2><p>How much of Cloudflare's limits the site is using. Read-only.</p></div><div class="pgacts"><button type="button" class="btn ghost" id="urefresh">Refresh now</button></div></div>${planBar}
    ${u.limitHits.length ? `<div class="limitbanner" role="alert"><b>Limit hit at ${esc(localTime(u.limitHits[0].at))}${u.limitHits.length > 1 ? ` (${u.limitHits.length} times in 24 hours)` : ""}.</b><span>${esc(String(u.limitHits[0].detail).slice(0, 200))}</span></div>` : ""}
    ${u.connected && !u.error ? "" : steps}
    ${u.missing.length ? `<p class="msg err">Cloudflare would not give some numbers: ${u.missing.map((x) => esc(x.what) + (x.permission ? ` (needs ${esc(x.permission)})` : "")).join("; ")}.</p>` : ""}
    ${grp(paid ? "This billing month (with today)" : "Today (UTC)", ["d1_rows_read", "d1_rows_written", "requests"])}
    ${u.cpu ? `<p class="meta">Today's Function CPU: ${fmt(u.cpu.exceeded)} requests stopped for using too much CPU, ${fmt(u.cpu.failed)} failed in all, of ${fmt(u.cpu.requests)}. ${paid ? "Workers Paid allows 30 seconds of CPU per request by default (and includes 30 million CPU milliseconds a month, then $0.02 per extra million; not tracked here)." : "The free plan allows 10 ms of CPU per request."}</p>` : ""}
    ${grp(paid ? "R2, this billing month" : "This month", ["r2_class_a", "r2_class_b"])}
    ${grp("Storage", ["d1_storage", "r2_storage"])}
    ${grp("Email (Resend, counted by this site)", ["email_day", "email_month"])}
    <p class="meta">Email is on the Resend free plan (100 a day, 3,000 a month), separate from Cloudflare, and those limits do stop email. Email counts only emails this site sent through Resend (one send each); Resend's own total also counts received mail. Check the Resend dashboard if the numbers disagree.</p>`;
  const b = $("#urefresh"); if (b) b.onclick = () => { main.dataset.urefresh = "1"; renderUsage(); };
}

/* ---------- Outreach: reconcile Grok's sent log against the app, results by segment and step, the do-not-contact list, API health. Hashes and counts only. ---------- */
const ORSTATUS = { registered: "Registered", listing: "Has a listing", review: "Review", suppressed: "Suppressed", clear: "Clear" };
const ORTAG = { registered: "bad", listing: "bad", review: "warn", suppressed: "bad", clear: "ok" };
const csvCell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; // a leading = + - @ would be run as a formula in a spreadsheet
const parseEmails = (text) => { const seen = new Set(), out = []; for (const t of String(text).split(/[\s,;"<>()\[\]]+/)) { const e = t.trim(); if (e.includes("@") && !seen.has(e.toLowerCase())) { seen.add(e.toLowerCase()); out.push(e); } } return out; };
async function renderOutreach() {
  const main = $("#main"), d = await api("/api/admin/outreach");
  const a = d.api, w = a.week, t = d.totals;
  const when = (s) => (s ? esc(localTime(s)) : "never");
  const apiCard = `<article class="ucard ${a.configured ? "u-ok" : "u-warning"}" aria-label="API health"><div class="uh"><h3>API health</h3><span class="tag ${a.configured ? "ok" : "bad"}">${a.configured ? "Key set" : "No key: API is off"}</span></div>
    <p class="meta" style="margin:8px 0 0">Last check: <b>${when(a.lastCheckAt)}</b>${a.lastCheck ? ` (${fmt(a.lastCheck.emails)} addresses: ${fmt(a.lastCheck.clear)} clear, ${fmt(a.lastCheck.registered + a.lastCheck.listing + a.lastCheck.review + a.lastCheck.suppressed)} not)` : ""}</p>
    <p class="meta" style="margin:4px 0 0">Last 7 days: ${fmt(w.calls)} calls, ${fmt(w.emails)} addresses: ${fmt(w.clear)} clear, ${fmt(w.registered)} registered, ${fmt(w.listing)} listing, ${fmt(w.review)} review, ${fmt(w.suppressed)} suppressed.</p>
    <p class="meta" style="margin:4px 0 0">Last failure: ${when(a.lastFailureAt)}. ${a.configured ? "" : "Set the OUTREACH_API_KEY secret (docs/CHECKLIST.md) to turn it on."}</p></article>`;
  const supRows = d.suppression.last.length ? d.suppression.last.map((x) => `<tr><td><code>${esc(x.prefix)}</code></td><td>${esc(x.reason)}</td><td>${esc(x.source)}</td><td>${esc(x.date)}</td></tr>`).join("") : `<tr><td colspan="4" class="meta">Nothing on the list yet.</td></tr>`;
  const quietSteps = d.results.filter((c) => !(c.sent || c.replies || c.bounces || c.complaints || c.unsubscribes || c.registered || c.listed)).length; // steps with nothing yet stay out of the table
  const resRows = d.results.filter((c) => c.sent || c.replies || c.bounces || c.complaints || c.unsubscribes || c.registered || c.listed).map((c) => `<tr><td>${esc(c.segment.replace("_", " "))}</td><td>${c.step === 0 ? "Original" : "Follow-up " + c.step}</td><td>${fmt(c.sent)}</td><td>${fmt(c.replies)}</td><td>${fmt(c.bounces)}</td><td>${fmt(c.complaints)}</td><td>${fmt(c.unsubscribes)}</td><td>${fmt(c.registered)}</td><td>${fmt(c.listed)}</td></tr>`).join("");
  setDetail("");
  main.innerHTML = `<div class="pghead"><div><h2>Outreach</h2><p>Grok checks the app before every send through a narrow, key-protected API that returns only a status word. Nothing here shows a name or an address, and nothing you paste below is stored.</p></div></div>
    <h2 class="dh">Status</h2><div class="ugrid">${apiCard}
      <article class="ucard u-ok" aria-label="Suppression list"><div class="uh"><h3>Do-not-contact list</h3><span class="tag">${fmt(d.suppression.count)} hashed</span></div><p class="meta" style="margin:8px 0 0">One-way hashes only. Added by Grok (replies, bounces, complaints, unsubscribes), by the app (any marketing unsubscribe, deleted accounts) or by hand below.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><input id="orsupEmail" type="email" placeholder="name@example.com" aria-label="Email address" style="flex:1;min-width:180px"><button type="button" class="btn ghost sm" id="orsupAdd">Do not contact</button><button type="button" class="btn ghost danger sm" id="orsupDel">Allow contact again</button></div><span class="msg" id="orsupMsg" role="status"></span></article></div>
    <h2 class="dh">Reconcile a sent log</h2>
    <p class="meta" style="margin:0 0 8px">Paste up to 500 addresses (one per line, or a whole export: any text with addresses in it) or choose a .csv or .txt file. You get counts by status and a CSV for your records. Computed now, not stored.</p>
    <label for="orlog" class="meta">Addresses</label><textarea id="orlog" rows="6" style="width:100%;box-sizing:border-box;font:inherit;background:transparent;color:var(--ink);border:1px solid var(--line2);border-radius:10px;padding:10px" spellcheck="false" autocomplete="off"></textarea>
    <p style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:10px 0"><button type="button" class="btn ice" id="orrun">Check these addresses</button><label class="btn ghost" for="orfile" style="cursor:pointer">Choose a file</label><input type="file" id="orfile" accept=".csv,.txt,text/plain,text/csv" hidden><span class="meta" id="ornote" role="status"></span></p>
    <div id="orout"></div>
    <h2 class="dh">Release overdue follow-ups</h2>
    <p class="meta" style="margin:0 0 8px">A follow-up more than 14 days late stays held until you release it. Releasing lets the next send go out for that one step. It does not override a reply, unsubscribe, bounce, complaint, suppression, registration, listing or a finished sequence, and it never adds a third follow-up. Nothing is emailed from this page. Preview changes nothing.</p>
    <p style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:10px 0"><label for="orseg" class="meta">Segment</label><select id="orseg" style="font:inherit;background:transparent;color:var(--ink);border:1px solid var(--line2);border-radius:10px;padding:8px"><option value="contest">Contest organizers</option><option value="installer">Installers</option><option value="event_host">Seasonal-event hosts</option></select><button type="button" class="btn ghost" id="orpreview">Preview</button><button type="button" class="btn ice" id="orrelease" hidden>Release this segment</button><span class="meta" id="orrelnote" role="status"></span></p>
    <h2 class="dh">Results by segment and step</h2>
    <div class="card dtc"><div class="dtw" tabindex="0" role="region" aria-label="Results by segment and step"><table class="dtab"><caption class="meta" style="text-align:left;padding:0 0 6px">Counted from what Grok reported. “Registered” and “Listed” are people who created an account or a listing after being emailed, credited to the latest step sent before that (not opens).${d.capped ? " Some very large tables were capped." : ""}</caption>
      <thead><tr><th scope="col">Segment</th><th scope="col">Step</th><th scope="col">Sent</th><th scope="col">Replies</th><th scope="col">Bounces</th><th scope="col">Complaints</th><th scope="col">Unsubscribes</th><th scope="col">Registered after</th><th scope="col">Listed after</th></tr></thead>
      <tbody>${resRows}<tr><th scope="row">All</th><td></td><td><b>${fmt(t.sent)}</b></td><td><b>${fmt(t.replies)}</b></td><td><b>${fmt(t.bounces)}</b></td><td><b>${fmt(t.complaints)}</b></td><td><b>${fmt(t.unsubscribes)}</b></td><td><b>${fmt(t.registered)}</b></td><td><b>${fmt(t.listed)}</b></td></tr></tbody></table></div></div>${quietSteps ? `<p class="meta" style="margin:6px 0 0">${quietSteps} segment/step combination${quietSteps === 1 ? "" : "s"} with no activity yet ${quietSteps === 1 ? "is" : "are"} left out.</p>` : ""}
    <h2 class="dh">Last 20 on the do-not-contact list</h2>
    <div class="card dtc"><div class="dtw" tabindex="0" role="region" aria-label="Last 20 on the do-not-contact list"><table class="dtab"><thead><tr><th scope="col">Hash (first 8)</th><th scope="col">Reason</th><th scope="col">Source</th><th scope="col">Date</th></tr></thead><tbody>${supRows}</tbody></table></div></div>`;
  let list = [];
  const note = $("#ornote"), out = $("#orout");
  $("#orfile").onchange = async (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; if (f.size > 2e6) { note.textContent = "That file is too big."; return; } $("#orlog").value = await f.text(); note.textContent = `${fmt(parseEmails($("#orlog").value).length)} addresses found.`; };
  const supAct = async (action, btnEl) => {
    const m = $("#orsupMsg"), email = $("#orsupEmail").value.trim(); m.className = "msg";
    if (!email) { m.className = "msg err"; m.textContent = "Type the email address first."; return; }
    if (action === "unsuppress" && !tap(btnEl, "allow contact again")) return;
    try { const r = await api("/api/admin/outreach", { method: "POST", body: JSON.stringify({ action, email }) }); m.textContent = action === "suppress" ? `Added (${r.prefix}).` : `Removed (${r.prefix}). It can be contacted again.`; $("#orsupEmail").value = ""; }
    catch (er) { m.className = "msg err"; m.textContent = er.message; }
  };
  $("#orsupAdd").onclick = (e) => supAct("suppress", e.target); $("#orsupDel").onclick = (e) => supAct("unsuppress", e.target);
  $("#orrun").onclick = async (e) => {
    list = parseEmails($("#orlog").value); out.innerHTML = "";
    if (!list.length) { note.textContent = "Paste some addresses first."; return; }
    if (list.length > 500) { note.textContent = `That is ${fmt(list.length)} addresses; the limit is 500. Split the log and run it twice.`; return; }
    const b = e.target; b.disabled = true; note.textContent = "Checking…";
    try {
      const r = await api("/api/admin/outreach", { method: "POST", body: JSON.stringify({ action: "reconcile", emails: list }) });
      note.textContent = "";
      const held = r.rows.filter((x) => x.sequence.reason === "overdue_hold");
      out.innerHTML = `<div class="ugrid" style="margin:8px 0">${Object.keys(ORSTATUS).map((k) => `<article class="ucard"><div class="uh"><h3>${ORSTATUS[k]}</h3><span class="tag ${ORTAG[k]}">${k === "clear" ? "send ok" : "do not send"}</span></div><p class="unum"><b>${fmt(r.counts[k])}</b> <span class="meta">of ${fmt(r.total)}</span></p></article>`).join("")}</div>
        <p class="meta" style="margin:6px 0"><b>Due to send today</b> (status clear, step due now or at most 14 days overdue): original <b>${fmt(r.due[0])}</b>, follow-up 1 <b>${fmt(r.due[1])}</b>, follow-up 2 <b>${fmt(r.due[2])}</b>. Taken from the sends Grok reported; nothing is sent from here.</p>
        <p style="margin:6px 0"><button type="button" class="btn ghost" id="orcsv">Download CSV</button> <span class="meta">One row per address: address, status, reasons, and the next step with its due date. Review means the website domain matches a registered installer, organizer or account: check by hand.</span></p>
        ${held.length ? `<p style="margin:6px 0"><button type="button" class="btn ice" id="orrelmail">Release ${fmt(held.length)} overdue in this list</button> <span class="meta" id="orrelmailnote">Only addresses on the 14-day hold. Everyone else in the list stays as they are. Tap twice.</span></p>` : ""}`;
      $("#orcsv").onclick = () => {
        const csv = "email,status,reasons,next_step,due,due_on,sequence_reason\r\n" + r.rows.map((x) => [list[x.i], x.status, x.reasons.join(" "), x.sequence.next_step === null ? "" : x.sequence.next_step, x.sequence.due ? "yes" : "no", x.sequence.due_on || "", x.sequence.reason].map(csvCell).join(",")).join("\r\n") + "\r\n";
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "outreach-reconcile.csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
      const relMail = $("#orrelmail");
      if (relMail) relMail.onclick = async (ev) => {
        const btn = ev.target;
        if (!tap(btn, `release ${held.length}`)) return;
        btn.disabled = true;
        try {
          const outR = await api("/api/admin/outreach", { method: "POST", body: JSON.stringify({ action: "release", emails: held.map((x) => list[x.i]), dry_run: false }) });
          const note2 = $("#orrelmailnote"); if (note2) note2.textContent = `Released ${fmt(outR.released)}. The next check marks that step due.`;
          btn.hidden = true;
        } catch (x) { const note2 = $("#orrelmailnote"); if (note2) note2.textContent = x.message; btn.disabled = false; }
      };
    } catch (x) { note.textContent = x.message; } finally { b.disabled = false; }
  };
  let heldPreview = null;
  const relBtn = $("#orrelease"), relNote = $("#orrelnote");
  const segName = (s) => (s === "contest" ? "contest organizer" : s === "event_host" ? "event host" : "installer");
  const disarm = (b) => { clearTimeout(b._t); b.dataset.armed = ""; b.classList.remove("armed"); };
  $("#orseg").onchange = () => { heldPreview = null; disarm(relBtn); relBtn.hidden = true; relNote.textContent = ""; };
  $("#orpreview").onclick = async (e) => {
    const segment = $("#orseg").value, b = e.target;
    disarm(relBtn); b.disabled = true; relNote.textContent = "Checking…"; relBtn.hidden = true; heldPreview = null;
    try {
      const r = await api("/api/admin/outreach", { method: "POST", body: JSON.stringify({ action: "release", segment, dry_run: true }) });
      heldPreview = r;
      const n = r.overdue, who = segName(segment);
      relNote.textContent = n
        ? `${fmt(n)} overdue ${who} ${n === 1 ? "sequence" : "sequences"}: follow-up 1 ${fmt(r.by_step[1])}, follow-up 2 ${fmt(r.by_step[2])}.${r.already_released ? ` ${fmt(r.already_released)} already released.` : ""}${r.skipped_suppressed ? ` ${fmt(r.skipped_suppressed)} suppressed, left held.` : ""}${r.skipped_undeliverable ? ` ${fmt(r.skipped_undeliverable)} undeliverable, left held.` : ""} Nothing changed.`
        : `No overdue ${who} sequences. Nothing changed.`;
      if (n) { relBtn.hidden = false; relBtn.textContent = `Release ${fmt(n)}`; }
    } catch (x) { relNote.textContent = x.message; } finally { b.disabled = false; }
  };
  relBtn.onclick = async (e) => {
    const segment = $("#orseg").value;
    if (!heldPreview || heldPreview.segment !== segment || !heldPreview.overdue) return;
    const b = e.target;
    if (!tap(b, `release ${heldPreview.overdue}`)) return;
    b.disabled = true;
    try {
      const r = await api("/api/admin/outreach", { method: "POST", body: JSON.stringify({ action: "release", segment, dry_run: false }) });
      heldPreview = null; b.hidden = true;
      relNote.textContent = `Released ${fmt(r.released)}. The next check marks that step due. A later follow-up is held again when it is more than 14 days late.`;
    } catch (x) { relNote.textContent = x.message; b.disabled = false; }
  };
}

/* ---------- Ads: what Grok reported for the Facebook and Instagram ads, against the $300 budget. Read-only; copy and status change only by migration. ---------- */
const usd = (c) => "$" + (Number(c || 0) / 100).toFixed(2);
const ADPILL = { draft: "", in_review: "warn", active: "ok", paused: "", disapproved: "bad", ended: "" };
const ADWARN = { over_total_budget: "Over $300", over_loaded_budget: "Over $280", campaign_over_budget: "Campaign over budget", not_in_launch_set: "Not in launch set", active_after_dec8: "Running past Dec 8", past_campaign_end: "Past campaign end", disapproved: "Disapproved", stale_report: "No report in 48 hours", spend_decreased: "Spend went down" };
// The ads table, built with the DOM and textContent only (no HTML from data). Each ad id links to the ad Grok reported; a button expands the approved copy.
const adEl = (tag, text, cls, attrs = {}) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const adSafeUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : ""; } catch { return ""; } };
function adRows(tbody, ads, campaigns) {
  const when = (t) => (t ? localTime(t) : "");
  ads.forEach((a, n) => {
    const r = a.report, tr = adEl("tr"), id = "adx-" + n, c = campaigns.find((x) => x.audience === a.audience) || {};
    const idc = adEl("td"), btn = adEl("button", "Details", "btn ghost", { type: "button", "aria-expanded": "false", "aria-controls": id });
    btn.style.cssText = "padding:2px 8px;font-size:12px;margin-right:6px";
    const url = r && adSafeUrl(r.ad_url);
    idc.append(btn);
    if (url) { const l = adEl("a", a.id, null, { href: url, target: "_blank", rel: "noopener noreferrer" }); const code = adEl("code"); code.append(l); idc.append(code); }
    else { idc.append(adEl("code", a.id)); if (a.status === "approved") idc.append(adEl("span", " link not reported yet", "meta")); }
    idc.append(adEl("br"), adEl("span", a.headline, "meta"));
    const st = a.status === "approved" ? (r ? adEl("span", r.status.replace("_", " "), "tag " + (ADPILL[r.status] || "")) : adEl("span", "no report", "tag")) : adEl("span", a.status.replace(/_/g, " "), "tag");
    const cell = (v) => adEl("td", v);
    const stc = adEl("td"); stc.append(st);
    tr.append(idc, stc, cell(r ? usd(r.spend_cents) : ""), cell(r ? fmt(r.impressions) : ""), cell(r ? fmt(r.clicks) : ""), cell(a.status === "approved" ? fmt(a.landings) : ""), cell(r ? when(r.received_at) : ""));
    const dt = adEl("tr", null, null, { id, hidden: "" }), dc = adEl("td", null, null, { colspan: "7" });
    const line = (k, v) => { const p = adEl("p", null, "meta"); p.style.margin = "4px 0"; p.append(adEl("b", k + ": "), document.createTextNode(v || "(none)")); return p; };
    dc.append(line("Headline", a.headline), line("Text", a.primary_text), line("Description", a.description), line("Button", a.cta), line("Tracked link", a.landing_url),
      line("Files expected", a.asset_id ? a.asset_id + " (see /api/ads/assets)" : "none yet"),
      line("Campaign", `${(c.name || a.audience)}, budget ${usd(a.budget_cents)}, ${a.starts} to ${a.ends}`),
      line("Last status message", r ? `${r.status}${r.disapproval_reason ? ": " + r.disapproval_reason : ""} (as of ${r.as_of})` : "No report yet"));
    dt.append(dc);
    btn.onclick = () => { const open = btn.getAttribute("aria-expanded") === "true"; btn.setAttribute("aria-expanded", String(!open)); dt.hidden = open; };
    tbody.append(tr, dt);
  });
}
// Creative files: every file in /ad-assets/manifest.json, grouped by asset id, with the ads that use it. DOM and textContent only.
function adCreative(box, c) {
  box.textContent = "";
  box.append(adEl("p", "These files are public if someone knows the address; the site does not link to them and asks search engines not to index them.", "meta"));
  const groups = new Map();
  for (const f of c.files) (groups.get(f.asset_id) || groups.set(f.asset_id, []).get(f.asset_id)).push(f);
  if (!groups.size) box.append(adEl("p", "No creative files are published yet.", "meta"));
  for (const [id, list] of groups) {
    const g = adEl("section", null, "ucard"); g.style.margin = "10px 0";
    const used = [...new Set(list.flatMap((f) => f.ad_ids))];
    g.append(adEl("h3", id), adEl("p", used.length ? "Used by: " + used.join(", ") : "Not used by an ad (Page images or spare)", "meta"));
    for (const f of list) {
      const row = adEl("div"); row.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;margin:10px 0;padding-top:10px;border-top:1px solid var(--line2)";
      const isVid = /^video\//.test(f.content_type), thumb = f.url ? f.url.replace(/^https?:\/\/[^/]+/, "") : "";
      let media;
      if (isVid) media = adEl("video", null, null, { controls: "", preload: "metadata", src: thumb, "aria-label": f.path });
      else media = adEl("img", null, null, { loading: "lazy", src: thumb, alt: "Preview of " + f.path });
      media.style.cssText = "width:120px;max-height:150px;object-fit:contain;background:var(--tile);border-radius:8px";
      const info = adEl("div"); info.style.cssText = "flex:1 1 240px;min-width:0;overflow-wrap:anywhere";
      const line = (k, v) => { const p = adEl("p", null, "meta"); p.style.margin = "2px 0"; p.append(adEl("b", k + ": "), document.createTextNode(v)); return p; };
      const name = f.path.split("/").pop();
      info.append(adEl("b", name), line("Size", `${f.width && f.height ? f.width + " x " + f.height : "unknown"}${f.ratio ? " (" + f.ratio + ")" : ""}, ${Math.max(1, Math.round(f.bytes / 1024)).toLocaleString("en-US")} KB, ${f.content_type}`), line("Ads", f.ad_ids.length ? f.ad_ids.join(", ") : "none"));
      const sp = adEl("p", null, "meta"); sp.style.margin = "2px 0"; sp.append(adEl("b", "sha256: "), adEl("code", (f.sha256 || "").slice(0, 12) + "...", null, { title: f.sha256 || "" })); info.append(sp);
      const up = adEl("p", f.url, "meta"); up.style.cssText = "margin:4px 0;font-family:monospace;font-size:12px"; info.append(up);
      const acts = adEl("p"); acts.style.margin = "4px 0";
      const copy = adEl("button", "Copy", "btn ghost", { type: "button" });
      copy.onclick = async () => { try { await navigator.clipboard.writeText(f.url); copy.textContent = "Copied"; } catch { copy.textContent = "Copy failed"; } setTimeout(() => (copy.textContent = "Copy"), 1500); };
      const open = adEl("a", "Open", "btn ghost", { href: f.url, target: "_blank", rel: "noopener noreferrer" });
      acts.append(copy, document.createTextNode(" "), open); info.append(acts);
      row.append(media, info); g.append(row);
    }
    box.append(g);
  }
  if (c.missing.length || c.no_asset.length) {
    const g = adEl("section", null, "ucard u-warning"); g.style.margin = "10px 0"; g.append(adEl("h3", "Not published yet"));
    for (const m of c.missing) g.append(adEl("p", `${m.ad_id}: ${m.asset_id} not published yet`, "meta"));
    for (const id of c.no_asset) g.append(adEl("p", `${id}: no creative assigned yet`, "meta"));
    box.append(g);
  }
}
const ADSEC = [["overview", "Overview"], ["ads", "Ads"], ["campaigns", "Campaigns"], ["creative", "Creative files"], ["reports", "Reports"], ["setup", "Setup"]];
const adUtc = (s) => (s ? localTime(s) : "never");
const adBar = (label, pct) => { const b = adEl("div", null, "ubar", { role: "progressbar", "aria-label": label, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(pct)) }); const i = adEl("i"); i.style.width = pct + "%"; b.append(i); return b; };
const adTable = (label, heads, rows, min = 560) => {
  const wrap = adEl("div", null, null, { tabindex: "0", role: "region", "aria-label": label }); wrap.style.overflowX = "auto";
  const t = adEl("table"); t.style.cssText = `width:100%;min-width:${min}px`;
  const tr = adEl("tr"); for (const h of heads) tr.append(adEl("th", h, null, { scope: "col" }));
  t.append(adEl("thead")); t.firstChild.append(tr);
  const tb = adEl("tbody"); for (const r of rows) { const row = adEl("tr"); for (const c of r) row.append(adEl("td", c)); tb.append(row); }
  t.append(tb); wrap.append(t); return { wrap, tbody: tb };
};
const adPara = (text, cls = "meta") => { const p = adEl("p", text, cls); p.style.margin = "0 0 10px"; return p; };
const adDownloadCsv = (d) => {
  const csv = "ad_id,campaign,item_status,reported_status,spend_usd,impressions,clicks,landings,ref,as_of,received_at,ad_url\r\n" + d.ads.map((a) => { const r = a.report || {}; return [a.id, a.audience, a.status, r.status || "", r.spend_cents == null ? "" : (r.spend_cents / 100).toFixed(2), r.impressions ?? "", r.clicks ?? "", a.landings, a.ref, r.as_of || "", r.received_at || "", r.ad_url || ""].map(csvCell).join(","); }).join("\r\n") + "\r\n";
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "ads-status.csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
function adAlerts(list) {
  const ul = adEl("ul", null, "meta", { "aria-label": "Alerts" }); ul.style.cssText = "list-style:none;padding:0;margin:0 0 10px;display:grid;gap:6px";
  if (!list.length) ul.append(adEl("li", "No alerts."));
  for (const w of list) { const li = adEl("li"); li.append(adEl("span", ADWARN[w.code] || w.code, "tag bad"), document.createTextNode(" " + w.message)); ul.append(li); }
  return ul;
}
const ADPANELS = {
  overview(d) {
    const t = d.totals, f = document.createDocumentFragment(), pct = Math.min(100, (t.spend_cents / t.budget_cents) * 100);
    f.append(adPara("Grok builds the Facebook and Instagram ads and reports status every 2 days through a key-protected API. This page is read-only: ad copy and status change only by migration, and budgets are set by you in Meta Ads Manager."));
    const card = adEl("article", null, "ucard " + (t.spend_cents > t.budget_cents ? "u-limit" : t.spend_cents > t.loaded_cents ? "u-warning" : "u-ok"), { "aria-label": "Total spend" });
    const uh = adEl("div", null, "uh"); uh.append(adEl("h3", "Total spend"), adEl("span", d.configured ? "Key set" : "No key: API is off", "tag " + (d.configured ? "ok" : "bad")));
    const num = adEl("p", null, "unum"); num.append(adEl("b", usd(t.spend_cents)), adEl("span", ` of ${usd(t.budget_cents)} (loaded ${usd(t.loaded_cents)}, reserve ${usd(t.reserve_cents)})`, "meta"));
    const lp = adEl("p", `${fmt(t.impressions)} impressions, ${fmt(t.clicks)} clicks. Last report: ${adUtc(d.last_report_at)}.`, "meta"); lp.style.margin = "6px 0 0";
    card.append(uh, num, adBar("Spend against the $300 budget", pct), lp);
    const h = adEl("h2", "Alerts", "dh");
    f.append(card, h, adAlerts(d.warnings));
    return f;
  },
  ads(d) {
    const f = document.createDocumentFragment(), tb = adTable("Ads", ["Ad", "Status", "Spend", "Impressions", "Clicks", "Landings", "Last report"], [], 640);
    f.append(adPara("Landings are visits counted under each ad's ref code since the first start date (no people are identified). Select Details to see the approved copy."), tb.wrap);
    adRows(tb.tbody, d.ads, d.campaigns); return f;
  },
  campaigns(d) {
    const f = document.createDocumentFragment(), g = adEl("div", null, "ugrid"), today = new Date().toISOString().slice(0, 10);
    for (const c of d.campaigns) {
      const p = c.budget_cents ? Math.min(100, (c.spend_cents / c.budget_cents) * 100) : 0, card = adEl("article", null, "ucard " + (c.spend_cents > c.budget_cents ? "u-limit" : "u-ok"), { "aria-label": c.name });
      const uh = adEl("div", null, "uh"); uh.append(adEl("h3", c.audience.replace("_", " ")), adEl("span", `${c.starts} to ${c.ends}`, "tag"));
      const num = adEl("p", null, "unum"); num.append(adEl("b", usd(c.spend_cents)), adEl("span", ` of ${usd(c.budget_cents)} budget`, "meta"));
      const days = Math.max(0, Math.floor((Date.parse((today < c.ends ? today : c.ends) + "T12:00:00Z") - Date.parse(c.starts + "T12:00:00Z")) / 86400000) + 1);
      const pace = adEl("p", `Planned pace about ${usd(c.daily_hint_cents)} a day (lifetime budget with an end date).${today >= c.starts && c.spend_cents ? ` Actual about ${usd(c.spend_cents / days)} a day over ${days} days.` : ""} Wave ${c.wave}; ${fmt(c.reported_ads)} of ${fmt(c.ads.length)} ads reported.`, "meta"); pace.style.margin = "6px 0 0";
      card.append(uh, num, adBar(c.audience + " spend", p), pace); g.append(card);
    }
    f.append(adPara(`Budgets add up to ${usd(d.totals.campaign_budget_cents)}; the total limit is ${usd(d.totals.budget_cents)} and every ad ends by Dec 8, 2026.`), g); return f;
  },
  creative(d) { const box = adEl("div"); adCreative(box, d.creative); return box; },
  reports(d) {
    const f = document.createDocumentFragment(), b = adEl("button", "Download CSV", "btn ghost", { type: "button" });
    b.onclick = () => adDownloadCsv(d);
    const p = adEl("p"); p.style.margin = "0 0 10px"; p.append(b, adEl("span", " One row per ad with its latest report and landings.", "meta"));
    const tb = adTable("Last reports received", ["Received", "As of", "Ad", "Status", "Spend", "Impressions", "Clicks"], d.log.map((x) => [adUtc(x.received_at), adUtc(x.as_of), x.ad_id, x.status.replace("_", " "), usd(x.spend_cents), fmt(x.impressions), fmt(x.clicks)]), 560);
    if (!d.log.length) { const tr = adEl("tr"); tr.append(adEl("td", "No report received yet.", "meta", { colspan: "7" })); tb.tbody.append(tr); }
    f.append(p, adEl("h2", "Warnings", "dh"), adAlerts(d.warnings), adEl("h2", "Last 30 reports", "dh"), tb.wrap); return f;
  },
  setup(d) {
    const f = document.createDocumentFragment(), sec = (h, ...ps) => { f.append(adEl("h2", h, "dh")); ps.forEach((x) => f.append(typeof x === "string" ? adPara(x) : x)); };
    const st = adEl("p"); st.style.margin = "0 0 10px"; st.append(adEl("span", d.configured ? "Key set" : "No key: the API answers 503", "tag " + (d.configured ? "ok" : "bad")), document.createTextNode(" ADS_API_KEY is a Cloudflare Pages secret. It is never shown here."));
    sec("Key status", st);
    sec("Contract for Grok", "Hand Grok the file docs/monetization/grok-ads-api.md (endpoints, header, examples, rules).");
    const ul = adEl("ul", null, "meta"); ul.style.cssText = "margin:0 0 10px;padding-left:18px";
    for (const r of d.rules || []) ul.append(adEl("li", r));
    sec("The Grok brief", "Grok reads GET /api/ads/brief (approved launch ads, campaigns, budgets, rules and file links), GET /api/ads/assets (files with sha256) and GET /api/ads/status, and reports with POST /api/ads/report about every 2 days. Rules it receives:", ul);
    const ol = adEl("ol", null, "meta"); ol.style.cssText = "margin:0 0 10px;padding-left:20px";
    for (const s of ["Generate a long random value (32+ characters) in a password manager.", "Cloudflare dashboard > Workers & Pages > socal-lights > Settings > Variables and Secrets > Production > Add secret named ADS_API_KEY, paste the value, Save.", "Redeploy (Deployments > latest production > Retry deployment).", "Give Grok the same value through its secret store. Never paste it in a chat or a file in the repo."]) ol.append(adEl("li", s));
    sec("Owner steps (once)", ol);
    sec("User-Agent note", "Grok must send a custom User-Agent (for example SoCalLights-Grok-Ads/1.0). Cloudflare's Browser Integrity Check has blocked the default Python-urllib agent before; the symptom is a 403 with an HTML page.");
    return f;
  },
};
async function renderAds() {
  const main = $("#main"), d = await api("/api/admin/ads"); setDetail("");
  const ids = ADSEC.map((x) => x[0]), fromHash = () => { const p = location.hash.slice(1).split("/"); return p[0] === "ads" && ids.includes(p[1]) ? p[1] : "overview"; };
  main.textContent = "";
  const hd = adEl("div", null, "pghead"), hdi = adEl("div"); hdi.append(adEl("h2", "Ads"), adEl("p", "Facebook ads, run by Grok: what is running, what it cost and what came back.")); hd.append(hdi); main.append(hd);
  const bar = adEl("div", null, "emtabs", { role: "tablist", "aria-label": "Ads sections" }), panels = {}, tabs = {};
  const show = (id, focus) => {
    for (const k of ids) { const on = k === id; tabs[k].setAttribute("aria-selected", String(on)); tabs[k].tabIndex = on ? 0 : -1; panels[k].hidden = !on; if (on && !panels[k].childNodes.length) panels[k].append(ADPANELS[k](d)); }
    if (location.hash !== "#ads/" + id) history.replaceState(null, "", "#ads/" + id);
    if (focus) tabs[id].focus();
  };
  for (const [id, label] of ADSEC) {
    const b = adEl("button", label, "emtab", { type: "button", role: "tab", id: "adtab-" + id, "aria-controls": "adpanel-" + id, "aria-selected": "false" });
    b.onclick = () => show(id);
    b.onkeydown = (e) => { const i = ids.indexOf(id), n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 }[e.key]; if (n === undefined) return; e.preventDefault(); show(ids[(n + ids.length) % ids.length], true); };
    tabs[id] = b; bar.append(b);
    panels[id] = adEl("div", null, null, { role: "tabpanel", id: "adpanel-" + id, "aria-labelledby": "adtab-" + id, tabindex: "0" });
  }
  main.append(bar, ...ids.map((k) => panels[k]));
  show(fromHash());
}

/* ---------- reports: "Something wrong? Tell us" from visitors ---------- */
let RPVIEW = "removals", RMOPEN = "";
async function renderReports() {
  const main = $("#main"), [list, rem] = await Promise.all([api("/api/admin/reports"), api("/api/admin/removals").catch(() => [])]);
  const open = rem.filter((r) => r.status === "open").length, shown = rem.filter((r) => r.status === "open" || RPVIEW === "removals-all");
  setCount("reports", list.length + open);
  const rmRec = RMOPEN && rem.find((r) => r.id === RMOPEN); if (RMOPEN && !rmRec) RMOPEN = "";
  const isRestore = (r) => /^\[restore\]/.test(r.note || ""), rmTag = (r) => [r.status === "open" ? "Waiting" : r.status === "done" ? (isRestore(r) ? "Restored" : "Removed") : "Declined", r.status === "open" ? "warn" : r.status === "done" ? "ok" : "bad"];
  if (rmRec) { // the full record of one removal request
    const r = rmRec, l = r.listing, done = r.status !== "open", t = rmTag(r), name = (l && l.name) || r.address || r.ref || "Request";
    setDetail(name);
    const pick = (m) => btn("ghost", `Remove: ${m.name || m.address}${m.city ? " (" + m.city + ")" : ""}`, `data-rm="approve" data-target="${esc(m.target)}"`);
    const kv = (pairs) => `<div class="kv">${pairs.filter(([, v]) => v).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join("")}</div>`;
    main.innerHTML = `<div class="rpage"><a class="rback" href="#reports" id="rmBack"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to Reports</a>
      <div class="pghead"><div><h2>${isRestore(r) ? "Restore request" : "Removal request"}</h2></div><div class="pgacts" data-rmid="${esc(r.id)}"${isRestore(r) ? ' data-restore="1"' : ""}>${done ? "" : (isRestore(r) ? btn("main", "Approve and put the entry back", 'data-rm="approve"') : l ? btn("main", "Approve and remove the listing", `data-rm="approve" data-target="${esc(l.target)}"`) : btn("ghost", "Nothing to remove, close it", 'data-rm="approve" data-nothing="1"')) + btn("danger", "Decline", 'data-rm="decline"')}</div></div>
      <section class="rcard"><h3>Overview</h3>${kv([["Status", `<span class="tag ${t[1]}">${t[0]}</span>`], ["Received", when(r.createdAt)], ["Contact", `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`], ["Listing id", r.ref ? `<code>${esc(r.ref)}</code>` : ""], ["Typed address", esc(r.address || "")], ["Note", esc(r.note || "")]])}</section>
      ${l ? `<section class="rcard"><h3>Listing</h3>${kv([["Home", esc([l.name, l.address, l.city].filter(Boolean).join(", "))], ["Added by", l.addedBy ? "An organizer" : ""], ["Organizer confirmed", l.consent ? `${esc(l.consent.email)} on ${esc(l.consent.created_at)} (${l.consent.n} homes, wording ${esc(l.consent.version)})` : ""]])}</section>` : ""}
      ${!done && !l ? `<section class="rcard"><h3>Possible matches</h3>${r.matches.length ? `<p class="meta" style="margin:0 0 8px">No listing id. Matches by address:</p><div class="row" style="gap:8px;flex-wrap:wrap">${r.matches.map(pick).join("")}</div>` : `<p class="meta" style="margin:0">No listing id and no address match. Search the Events tab by street, then close this request.</p>`}</section>` : ""}
      ${done ? `<section class="rcard"><h3>Handled</h3>${kv([["When", esc(r.handledAt || "")], ["Listing", esc(/^restored:/.test(r.target || "") ? "Entry put back in its contest" : r.target || "")], ["Admin note", esc(r.adminNote || "")]])}</section>` : ""}</div>`;
    window.scrollTo(0, 0);
    main.querySelector("#rmBack").onclick = (e) => { e.preventDefault(); RMOPEN = ""; setDetail(""); renderReports(); };
    return;
  }
  setDetail("");
  const tabs = [["removals", "Home removals", open], ["removals-all", "All removals", 0], ["reports", "Visitor reports", list.length]];
  const head = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${tabs.map(([k, l, c]) => `<button type="button" data-view="${k}" aria-pressed="${k === RPVIEW}">${l}${c ? ` <span>${c}</span>` : ""}</button>`).join("")}</div></div>`;
  const wire = () => { main.querySelectorAll(".pgtabs [data-view]").forEach((b) => (b.onclick = () => { RPVIEW = b.dataset.view; renderReports(); })); main.querySelectorAll("[data-ropen]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); RMOPEN = a.dataset.ropen; renderReports(); })); };
  if (RPVIEW === "reports") {
    main.innerHTML = head + `<div class="pghead"><div><h2>Visitor reports</h2><p>From the "Something wrong? Tell us" link on events and houses. Fix the event or house, then dismiss the report.</p></div><div class="pgacts">${dl("reports")}</div></div>`
      + (list.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>About</th><th>Message</th><th>Reply to</th><th>Received</th><th class="ac">Actions</th></tr></thead><tbody>${list.map((r) => `<tr data-rid="${esc(r.id)}"><td><b>${esc(r.name || r.ref)}</b>${/Objectionable content/i.test(r.message || "") ? (Date.now() - new Date(String(r.created_at).replace(" ", "T") + "Z").getTime() > 864e5 ? ' <span class="tag bad">Objectionable · over 24 h</span>' : ' <span class="tag warn">Objectionable · act within 24 h</span>') : ""}<span class="sub"><code>${esc(r.ref)}</code></span></td><td style="white-space:pre-line;min-width:200px">${esc(r.message)}</td><td>${r.contact ? `<a class="rl" href="mailto:${esc(r.contact)}">${esc(r.contact)}</a>` : "They left no email"}</td><td>${when(r.created_at)}</td><td class="ac"><div class="racts">${btn("ghost", "Open Events", 'data-tab="events"').replace('class="btn ghost"', 'class="btn ghost sm"')}${btn("danger", "Dismiss", "data-rdismiss").replace('class="btn ghost danger"', 'class="btn ghost danger sm"')}</div></td></tr>`).join("")}</tbody></table></div><div class="pager"><span class="meta">${list.length} report${list.length === 1 ? "" : "s"}</span></div></div>` : `<div class="empty">No reports. Visitors can send one from the "Something wrong? Tell us" link on any event or house.</div>`);
    wire(); return;
  }
  main.innerHTML = head + `<div class="pghead"><div><h2>Home removals</h2><p>A resident asked us to take a home off the site, or an entrant asked to be put back in a contest (tagged Restore). Approving a removal deletes the listing (and any photos), marks it done and emails the person. Decline emails them your note. Aim to answer within two business days.</p></div></div>`
    + (shown.length ? `<div class="card dtc"><div class="dtw"><table class="dtab"><thead><tr><th>Home</th><th>Contact</th><th>Received</th><th>Status</th><th class="ac">Actions</th></tr></thead><tbody>${shown.map((r) => { const l = r.listing, t = rmTag(r); return `<tr data-rmid="${esc(r.id)}"><td><a class="rl" href="#reports" data-ropen="${esc(r.id)}">${esc((l && l.name) || r.address || r.ref || "Request")}</a>${isRestore(r) ? ' <span class="tag ok">Restore</span>' : ""}<span class="sub">${esc(l ? [l.address, l.city && !String(l.address || "").toLowerCase().includes(String(l.city).toLowerCase()) ? l.city : ""].filter(Boolean).join(", ") : r.address || "")}</span></td><td><a class="rl" href="mailto:${esc(r.email)}">${esc(r.email)}</a></td><td>${when(r.createdAt)}</td><td><span class="tag ${t[1]}">${t[0]}</span></td><td class="ac"><a class="rl" href="#reports" data-ropen="${esc(r.id)}">Open</a></td></tr>`; }).join("")}</tbody></table></div><div class="pager"><span class="meta">${shown.length} request${shown.length === 1 ? "" : "s"}</span></div></div>` : `<div class="empty">${RPVIEW === "removals" ? "No removal requests waiting." : "No removal requests yet."}</div>`);
  wire();
}
$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-rdismiss]"); if (!b) return;
  if (!tap(b, "dismiss")) return;
  const card = b.closest("[data-rid]"); b.disabled = true;
  try { await api("/api/admin/reports", { method: "POST", body: JSON.stringify({ id: card.dataset.rid, action: "dismiss" }) }); card.remove(); toast("Dismissed"); refreshCounts(); if (!document.querySelector("[data-rid]")) renderReports(); }
  catch (err) { b.disabled = false; toast(err.message, true); }
});

$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-rm]"); if (!b) return;
  const card = b.closest("[data-rmid]"), act = b.dataset.rm;
  if (act === "approve" && !tap(b, b.dataset.nothing ? "close" : "remove")) return;
  const body = { id: card.dataset.rmid, action: act };
  if (act === "approve") { if (b.dataset.target) body.target = b.dataset.target; if (b.dataset.nothing) body.nothing = true; }
  if (act === "decline") { const r = await askReason({ title: "Decline this request", hint: "A note for the person who asked. It is included in the email. Leave it blank to send none.", go: "Decline" }); if (r === null) { b.dataset.armed = ""; return; } body.reason = r; }
  b.disabled = true;
  try { await api("/api/admin/removals", { method: "POST", body: JSON.stringify(body) }); toast(act === "approve" ? (card.dataset.restore ? "Restored. They will see it on their profile." : "Done. The person was emailed.") : "Declined. The person was emailed."); RMOPEN = ""; refreshCounts(); renderReports(); }
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
    else if (g === "installers") { INSTOPEN = it.id; setTab("installers"); }
    else if (g === "users") { UOPEN = it.id; setTab("users"); }
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

/* ---------- the pill tabs slide: one indicator glides to the chosen tab ---------- */
// Every `.seg` (the pill tabs) gets an indicator behind its buttons. When a page redraws its tabs, the indicator starts where the same tabs' indicator was last time and slides to the new choice;
// when only aria-pressed changes, it slides from the old tab. Reduced motion: no slide, the indicator just moves.
{
  const mem = new Map(), still = matchMedia("(prefers-reduced-motion: reduce)");
  const chosen = (seg) => seg.querySelector('button[aria-pressed="true"], button[aria-selected="true"], button[aria-current]');
  const place = (seg, ind, instant) => {
    const b = chosen(seg); if (!b) { ind.style.opacity = "0"; return; }
    ind.style.opacity = "1"; ind.style.transition = instant || still.matches ? "none" : "";
    ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft}px)`;
    if (seg.scrollWidth > seg.clientWidth + 1) { const r = b.offsetLeft + b.offsetWidth; if (b.offsetLeft < seg.scrollLeft + 8) seg.scrollTo({ left: Math.max(0, b.offsetLeft - 8), behavior: instant || still.matches ? "auto" : "smooth" }); else if (r > seg.scrollLeft + seg.clientWidth - 8) seg.scrollTo({ left: r - seg.clientWidth + 8, behavior: instant || still.matches ? "auto" : "smooth" }); } // a long tab row scrolls so the chosen tab is in view
    mem.set(seg._slKey, { l: b.offsetLeft, w: b.offsetWidth });
  };
  const key = (seg) => `${typeof tab === "string" ? tab : ""}|${seg.getAttribute("aria-label") || ""}|${[...document.querySelectorAll(".seg")].indexOf(seg)}`;
  const setup = (seg) => {
    if (seg._sl) return; seg._sl = true; seg._slKey = key(seg);
    const ind = document.createElement("span"); ind.className = "seg-ind"; ind.setAttribute("aria-hidden", "true"); seg.prepend(ind); seg.dataset.sl = "1";
    const prev = mem.get(seg._slKey);
    if (prev) { ind.style.transition = "none"; ind.style.width = prev.w + "px"; ind.style.transform = `translateX(${prev.l}px)`; ind.style.opacity = "1"; void ind.offsetWidth; }
    requestAnimationFrame(() => place(seg, ind, !prev));
    new MutationObserver(() => place(seg, ind, false)).observe(seg, { attributes: true, subtree: true, attributeFilter: ["aria-pressed", "aria-selected", "aria-current"] });
    addEventListener("resize", () => place(seg, ind, true));
  };
  const scan = () => document.querySelectorAll("#main .seg").forEach(setup);
  new MutationObserver(scan).observe(document.getElementById("main"), { childList: true, subtree: true }); scan();
}


// Every page has the same layout order: the header (title, one line, actions), then the view tabs, then search and filters, then the list. A page that builds them in another order
// (the view tabs above the header, a summary before both) is put in line here whenever its content is drawn.
{
  const main = $("#main");
  const order = () => {
    const kids = [...main.children], head = kids.find((k) => k.classList.contains("pghead")), tabs = kids.find((k) => k.classList.contains("pgtabs"));
    if (!head || (kids[0] === head && (!tabs || kids[1] === tabs))) return;
    main.insertBefore(head, main.firstChild); if (tabs) head.after(tabs);
  };
  new MutationObserver(order).observe(main, { childList: true });
}

// The path in the header is tappable: the page name returns from a record to its list; the group name (on a phone) opens that group's menu
$("#ptitle").addEventListener("click", () => { if (document.querySelector(".crumb.has-detail")) { const b = document.querySelector("#main .rback"); if (b) b.click(); } });
$("#pgroup").addEventListener("click", () => { const g = $("#pgroup").textContent; const key = Object.keys(SHEETS).find((k) => SHEETS[k].includes(g)); if (key && matchMedia("(max-width:1099px)").matches) openSheet(key); });
