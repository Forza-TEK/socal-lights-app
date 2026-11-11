// Map banner: a thin, labeled marquee on the map. Each installer with a Banner whose service area is in the map view is its own pill (labeled "Sponsor"), and each event with a paid
// banner that is in the map view is a pill labeled "Featured" (name, city, dates; tap opens the event). An installer with only the top-of-the-list card is NOT a pill (it is a card, below).
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

function paint() {
  if (!el) return;
  const k = Math.floor(OFFSET * Math.max(cur.length, 1)), order = cur.slice(k).concat(cur.slice(0, k));
  // one "set" = the installers, then a single "advertise here" pill; the set is at least as wide as the strip, so the loop has no repeats
  const win = el.querySelector(".sp-win"), track = el.querySelector(".sp-track"), set = order.map(pill).join("") + EMPTY;
  track.style.setProperty("--win", (win.clientWidth || 360) + "px");
  track.innerHTML = `<span class="sp-set">${set}</span><span class="sp-set sp-dup" aria-hidden="true" inert>${set}</span>`;
  const w = track.firstElementChild.getBoundingClientRect().width;
  SW = w; track.classList.add("go"); nudge(0);
  watch(); changed();
}

// The strip drifts on its own and can also be dragged: a finger on a phone, the mouse on a computer. It keeps a little momentum after a flick, then drifts on again.
// Plain scrolling of the page still works (the strip only claims sideways movement). A drag never counts as a tap on a pill.
let SW = 0, X = 0, vel = 0, dragging = false, hovering = false, focused = false, lastT = 0, raf = 0, suppress = false;
function nudge(dx) { if (!SW) return; X = (((X + dx) % SW) + SW) % SW; const t = el && el.querySelector(".sp-track"); if (t) t.style.transform = `translate3d(${-X}px,0,0)`; }
function tick(t) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(0.1, (t - (lastT || t)) / 1000); lastT = t;
  if (!el || el.hidden || reduced || dragging) return;
  if (Math.abs(vel) > 8) { nudge(vel * dt); vel *= Math.pow(0.04, dt); } else vel = 0; // momentum from a flick fades in about a second
  if (!paused && !hovering && !focused && !vel) nudge(SPEED * dt);
}
function drag(win) {
  let id = null, sx = 0, sy = 0, sX = 0, moved = false, lx = 0, lt = 0;
  win.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
  win.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hovering = false; });
  win.addEventListener("focusin", () => { focused = true; }); win.addEventListener("focusout", () => { focused = false; });
  win.addEventListener("dragstart", (e) => e.preventDefault()); // no ghost image of a pill's link
  win.addEventListener("pointerdown", (e) => { if (reduced || (e.pointerType === "mouse" && e.button !== 0)) return; id = e.pointerId; sx = lx = e.clientX; sy = e.clientY; sX = X; moved = false; vel = 0; lt = performance.now(); });
  win.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    if (!moved) { if (Math.abs(e.clientX - sx) < 6 || Math.abs(e.clientY - sy) > Math.abs(e.clientX - sx)) return; moved = true; dragging = true; try { win.setPointerCapture(id); } catch {} win.classList.add("drag"); }
    const now = performance.now(), dx = lx - e.clientX; X = sX + (sx - e.clientX); nudge(0);
    if (now > lt) vel = vel * 0.6 + (dx / ((now - lt) / 1000)) * 0.4; lx = e.clientX; lt = now;
  });
  const end = (e) => { if (e.pointerId !== id) return; id = null; if (moved) { suppress = true; setTimeout(() => (suppress = false), 60); if (performance.now() - lt > 120) vel = 0; vel = Math.max(-1800, Math.min(1800, vel)); } dragging = false; win.classList.remove("drag"); };
  win.addEventListener("pointerup", end); win.addEventListener("pointercancel", end);
  win.addEventListener("click", (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
  win.addEventListener("wheel", (e) => { if (reduced || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; e.preventDefault(); nudge(e.deltaX); }, { passive: false }); // trackpad two-finger sideways swipe
}

// Count a "shown" the first time an installer's pill is actually on screen.
function watch() {
  if (io) io.disconnect();
  if (!("IntersectionObserver" in window)) { cur.forEach((i) => { if (!seen.has(i.id)) { seen.add(i.id); beat(i.id, "imp"); } }); return; }
  io = new IntersectionObserver((es) => es.forEach((e) => { const id = e.target.dataset.id; if (e.isIntersecting && id && !seen.has(id)) { seen.add(id); beat(id, "imp"); } }), { root: el.querySelector(".sp-win"), threshold: 0.6 });
  el.querySelectorAll(".sp-set:first-child > .sp-pill[data-id]").forEach((n) => io.observe(n));
}

function setPaused(on) {
  paused = on; el.classList.toggle("paused", on);
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
  host(el); paint(); drag(el.querySelector(".sp-win")); if (!reduced) raf = requestAnimationFrame(tick);
  let lastW = el.querySelector(".sp-win").clientWidth, rt; // the strip follows the list panel opening and closing, and the window size
  if ("ResizeObserver" in window) new ResizeObserver(() => { const w = el.querySelector(".sp-win").clientWidth; if (Math.abs(w - lastW) < 3) return; lastW = w; clearTimeout(rt); rt = setTimeout(paint, 150); }).observe(el.querySelector(".sp-win"));
  if (reduced) setPaused(true); // people who asked for less motion get it standing still; the play button starts it
  return true;
}

// ---- Top of the list: a labeled company card at the top of the map list, behind Featured events.
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
