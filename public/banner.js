// Map banner: a labelled strip on the map that shows ONE sponsor at a time (whole name and phone, nothing cut off, every link at least 44 px tall) and moves on every few seconds. Each installer with a Banner whose service area is in the map view is its own pill (labelled "Sponsor"), and each event with a paid
// banner that is in the map view is a pill labelled "Featured" (name, city, dates; tap opens the event). An installer with only the top-of-the-list card is NOT a pill (it is a card, below).
// Desktop: a line under the logo, search and buttons. Phone: right above the list, so it moves with the list.
// The list of installers comes from /api/banner (same for everyone); which ones show is decided here from what is in view.
import { fmtPhone, telHref } from "/norm.js?v=20261102b";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().replace(/\bcounty\b/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const WIDE = new Set(["southern california", "socal", "all", "everywhere", "statewide", "california", "all of southern california"]);
const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
const ROTATE_MS = 7000;
const EVENT_PILLS_MAX = 3; // at most this many event pills per view, so one event (or a busy week) cannot crowd the installers out of the strip

let LIST = [], regionsNow = new Set(), evNow = new Set(), openEvent = () => false, el = null, cur = [], lastKey = "", host = () => {}, changed = () => {}, io = null, paused = false;
const seen = new Set(), OFFSET = Math.random(); // OFFSET: the order starts at a different installer each visit, so nobody is always first
const SPEED = 38; // pixels per second

// An installer with no areas listed is shown everywhere; otherwise any one of their areas has to be in view.
export function serves(inst, regions) {
  const toks = String(inst.a || "").split(/\s*(?:,|;|&|\band\b)\s*/i).map(norm).filter(Boolean);
  return !toks.length || toks.some((t) => WIDE.has(t) || regions.has(t));
}
export const regionKey = (names) => new Set([...names].map(norm).filter(Boolean));
// What goes in the strip for this view: installers with a banner whose areas are in view, and up to EVENT_PILLS_MAX events that are in view (their ids), mixed into one rotation.
export function stripItems(list, regions, evIds) {
  const inst = list.filter((i) => i.bn && !i.ev && serves(i, regions));
  const evs = list.filter((i) => i.ev && evIds && evIds.has(i.id.slice(3))).slice(0, EVENT_PILLS_MAX);
  if (!evs.length) return inst;
  const out = [], gap = Math.max(1, Math.ceil((inst.length + 1) / (evs.length + 1))); // an event after every few installers
  let e = 0; inst.forEach((i, n) => { out.push(i); if ((n + 1) % gap === 0 && e < evs.length) out.push(evs[e++]); });
  while (e < evs.length) out.push(evs[e++]);
  return out;
}

function beat(id, k) {
  try { const b = new Blob([JSON.stringify({ id, k })], { type: "application/json" }); if (!(navigator.sendBeacon && navigator.sendBeacon("/api/banner/hit", b))) fetch("/api/banner/hit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, k }), keepalive: true }); } catch {}
}

const shortDate = (ymd) => new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const evDates = (it) => (it.s && it.e && it.s !== it.e ? `${shortDate(it.s)} to ${shortDate(it.e)}` : it.e ? shortDate(it.e) : "");
const pill = (it) => {
  if (it.ev) return `<span class="sp-pill sp-ev" data-id="${esc(it.id)}" data-eid="${esc(it.id.slice(3))}"><span class="sp-lbl">Featured</span><a class="sp-name" href="${esc(it.u)}" data-k="click">${esc(it.n)}</a><span class="sp-sep" aria-hidden="true">|</span><span class="sp-meta">${esc([it.c, evDates(it)].filter(Boolean).join(" · "))}</span></span>`;
  const tel = telHref(it.p), ext = /^https?:/.test(it.u);
  return `<span class="sp-pill" data-id="${esc(it.id)}"><a class="sp-name" href="${esc(it.u)}" data-k="click"${ext ? ' target="_blank" rel="noopener sponsored nofollow"' : ""}>${esc(it.n)}</a>${tel ? `<span class="sp-sep" aria-hidden="true">|</span><a class="sp-tel" href="${esc(tel)}" data-k="call" aria-label="Call ${esc(it.n)} at ${esc(fmtPhone(it.p))}">${esc(fmtPhone(it.p))}</a>` : ""}</span>`;
};
const EMPTY = `<a class="sp-pill sp-empty" href="/pricing">Advertise here</a>`;

// One item at a time: the strip shows a whole pill (name and phone), then the next one every ROTATE_MS, then the "Advertise here" pill. A pause button stops it; it also stops while the pointer or keyboard focus is on it.
let items = [], idx = 0, timer = 0, hovering = false, focused = false;
function paint() {
  if (!el) return;
  const k = Math.floor(OFFSET * Math.max(cur.length, 1)), order = cur.slice(k).concat(cur.slice(0, k));
  items = order.map(pill).concat(EMPTY); idx = 0;
  // the strip keeps the height of its tallest item (a long name or a narrow phone can need two lines), so the list below does not jump every time it moves on
  const track = el.querySelector(".sp-track"); track.style.minHeight = ""; let tall = 0;
  items.forEach((h) => { track.innerHTML = `<span class="sp-set">${h}</span>`; tall = Math.max(tall, track.offsetHeight); });
  track.style.minHeight = tall + "px";
  show(); schedule(); changed();
}
function show() {
  const track = el && el.querySelector(".sp-track"); if (!track) return;
  track.innerHTML = `<span class="sp-set">${items[idx % items.length]}</span>`;
  const h = track.offsetHeight; if (h > (parseFloat(track.style.minHeight) || 0) + 1) { track.style.minHeight = h + "px"; changed(); } // never shorter than the tallest item seen
  watch();
}
function advance() { if (items.length > 1) { idx = (idx + 1) % items.length; show(); changed(); } }
function schedule() {
  clearInterval(timer); timer = 0;
  if (!paused && !hovering && !focused && items.length > 1 && !(el && el.hidden)) timer = setInterval(advance, ROTATE_MS);
}
function watchPointer(win) {
  win.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; schedule(); } });
  win.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hovering = false; schedule(); } });
  win.addEventListener("focusin", () => { focused = true; schedule(); }); win.addEventListener("focusout", () => { focused = false; schedule(); });
}

// Count a "shown" the first time an installer's pill is actually on screen.
function watch() {
  if (io) io.disconnect();
  if (!("IntersectionObserver" in window)) { el.querySelectorAll(".sp-pill[data-id]").forEach((n) => { const id = n.dataset.id; if (!seen.has(id)) { seen.add(id); beat(id, "imp"); } }); return; }
  io = new IntersectionObserver((es) => es.forEach((e) => { const id = e.target.dataset.id; if (e.isIntersecting && id && !seen.has(id)) { seen.add(id); beat(id, "imp"); } }), { root: el.querySelector(".sp-win"), threshold: 0.6 });
  el.querySelectorAll(".sp-pill[data-id]").forEach((n) => io.observe(n));
}

function setPaused(on) {
  paused = on; el.classList.toggle("paused", on); schedule();
  const pb = el.querySelector(".sp-pause"); if (!pb) return;
  pb.setAttribute("aria-pressed", String(on)); pb.setAttribute("aria-label", on ? "Play the scrolling banner" : "Pause the scrolling banner"); pb.querySelector(".pp").setAttribute("d", on ? "M2 1l7 4-7 4z" : "M2 1h2v8H2zM6 1h2v8H6z");
}

// regions: a Set of normalized city and county names that are in view (see regionKey).
export function updateBanner(regions, evIds = new Set()) {
  regionsNow = regions; evNow = evIds;
  if (!el) return;
  const next = stripItems(LIST, regions, evIds), key = next.map((i) => i.id).join(",");
  if (key === lastKey) return;
  lastKey = key; cur = next; paint(); tagText();
}

export const bannerHeight = () => (el && !el.hidden ? el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom || 0) + parseFloat(getComputedStyle(el).marginTop || 0) : 0);

// place(): moves the strip to the right spot (desktop: under the search row; phone: above the list).
// The label at the start of the strip: "Sponsor" while any installer is in it (and when it is empty), "Featured" when it holds only events. Event pills also carry their own "Featured" label.
function tagText() { const t = el && el.querySelector(".sp-tag"); if (t) t.textContent = cur.length && cur.every((i) => i.ev) ? "Featured" : "Sponsor"; }
// openEvent(eventId) -> true when the app opened that event's card on the map (then the link is not followed); otherwise the pill's link /e/<id> opens the event page.
export async function initBanner({ place, onChange, onOpenEvent }) {
  host = place; changed = onChange || (() => {}); openEvent = onOpenEvent || (() => false);
  try { const r = await fetch("/api/banner"); LIST = r.ok ? await r.json() : []; } catch { LIST = []; }
  el = document.createElement("div"); el.id = "sponsor"; el.className = "sponsor";
  el.setAttribute("role", "region"); el.setAttribute("aria-label", "Sponsors and featured events");
  el.innerHTML = `<span class="sp-tag">Sponsor</span><div class="sp-win"><div class="sp-track"></div></div><button type="button" class="sp-pause" aria-pressed="false" aria-label="Pause the scrolling banner"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path class="pp" d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor"/></svg></button>`;
  el.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-k]"), pb = e.target.closest(".sp-pause");
    if (a) { const pl = a.closest(".sp-pill"), id = pl?.dataset.id; if (id) beat(id, a.dataset.k); if (pl?.dataset.eid && openEvent(pl.dataset.eid)) e.preventDefault(); }
    else if (pb) setPaused(!paused);
  });
  host(el); watchPointer(el.querySelector(".sp-win")); paint();
  let lastW = el.querySelector(".sp-win").clientWidth, rt; // the strip follows the list panel opening and closing, and the window size
  if ("ResizeObserver" in window) new ResizeObserver(() => { const w = el.querySelector(".sp-win").clientWidth; if (Math.abs(w - lastW) < 3) return; lastW = w; clearTimeout(rt); rt = setTimeout(paint, 150); }).observe(el.querySelector(".sp-win"));
  if (reduced) setPaused(true); // people who asked for less motion get it standing still; the play button starts it
  return true;
}

// ---- Top of the list ($75): a labelled company card at the top of the map list, behind Featured events.
const TOP_MAX = 2; // at most two cards, so paid cards never push the places off the screen
export const topSponsors = (regions) => {
  const m = LIST.filter((i) => i.t && !i.ev && serves(i, regions)), k = Math.floor(OFFSET * Math.max(m.length, 1));
  return m.slice(k).concat(m.slice(0, k)).slice(0, TOP_MAX);
};
export function sponsorCard(it) {
  const tel = telHref(it.p), ext = /^https?:/.test(it.u), area = it.a ? `Serving ${it.a}` : "";
  const logo = it.l ? `<img src="/api/installers/${esc(it.s)}/logo" alt="" loading="lazy">` : `<span class="sc-init" aria-hidden="true">${esc((it.n || "?").slice(0, 1).toUpperCase())}</span>`;
  return `<article class="sponsorcard" data-id="${esc(it.id)}" aria-label="Sponsored: ${esc(it.n)}"><div class="sc-logo">${logo}</div><div class="sc-body"><span class="sc-tag">Sponsor</span><h3>${esc(it.n)}</h3>${area ? `<p class="sc-area">${esc(area)}</p>` : ""}${it.b ? `<p class="sc-blurb">${esc(it.b)}</p>` : ""}<div class="sc-acts">${tel ? `<a class="sc-btn" href="${esc(tel)}" data-lk="lcall">Call ${esc(fmtPhone(it.p))}</a>` : ""}<a class="sc-btn" href="${esc(it.u)}" data-lk="lclick"${ext ? ' target="_blank" rel="noopener sponsored nofollow"' : ""}>${/^mailto:/.test(it.u) ? "Email" : "Website"}</a><a class="sc-link" href="/installer/${esc(it.s)}" data-lk="lclick">Profile</a></div></div></article>`;
}
// Call after the list is drawn: counts a "shown" when a card is on screen, and a tap on its buttons.
export function watchTopCards(root) {
  const cards = root.querySelectorAll(".sponsorcard"); if (!cards.length) return;
  const count = (c) => { const id = c.dataset.id; if (id && !seen.has("l" + id)) { seen.add("l" + id); beat(id, "limp"); } };
  if (!("IntersectionObserver" in window)) return cards.forEach(count);
  const o = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { count(e.target); o.unobserve(e.target); } }), { threshold: 0.6 });
  cards.forEach((c) => o.observe(c));
}
document.addEventListener("click", (e) => { const a = e.target.closest(".sponsorcard a[data-lk]"); if (a) { const id = a.closest(".sponsorcard").dataset.id; if (id) beat(id, a.dataset.lk); } });
