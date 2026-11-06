// Installer banner: a thin, labelled marquee on the map. Each installer whose service area is in the map view is its own pill,
// Desktop: a line under the logo, search and buttons. Phone: right above the list, so it moves with the list.
// The list of installers comes from /api/banner (same for everyone); which ones show is decided here from what is in view.
import { fmtPhone, telHref } from "/norm.js?v=20261102b";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().replace(/\bcounty\b/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const WIDE = new Set(["southern california", "socal", "all", "everywhere", "statewide", "california", "all of southern california"]);
const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
const ROTATE_MS = 7000;

let LIST = [], el = null, cur = [], lastKey = "", host = () => {}, changed = () => {}, io = null, paused = false;
const seen = new Set(), OFFSET = Math.random(); // OFFSET: the order starts at a different installer each visit, so nobody is always first
const SPEED = 38; // pixels per second

// An installer with no areas listed is shown everywhere; otherwise any one of their areas has to be in view.
export function serves(inst, regions) {
  const toks = String(inst.a || "").split(/\s*(?:,|;|&|\band\b)\s*/i).map(norm).filter(Boolean);
  return !toks.length || toks.some((t) => WIDE.has(t) || regions.has(t));
}
export const regionKey = (names) => new Set([...names].map(norm).filter(Boolean));

function beat(id, k) {
  try { const b = new Blob([JSON.stringify({ id, k })], { type: "application/json" }); if (!(navigator.sendBeacon && navigator.sendBeacon("/api/banner/hit", b))) fetch("/api/banner/hit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, k }), keepalive: true }); } catch {}
}

const pill = (it) => {
  const tel = telHref(it.p), ext = /^https?:/.test(it.u);
  return `<span class="sp-pill" data-id="${esc(it.id)}"><a class="sp-name" href="${esc(it.u)}" data-k="click"${ext ? ' target="_blank" rel="noopener sponsored nofollow"' : ""}>${esc(it.n)}</a>${tel ? `<span class="sp-sep" aria-hidden="true">|</span><a class="sp-tel" href="${esc(tel)}" data-k="call" aria-label="Call ${esc(it.n)} at ${esc(fmtPhone(it.p))}">${esc(fmtPhone(it.p))}</a>` : ""}</span>`;
};
const EMPTY = `<a class="sp-pill sp-empty" href="/pricing#banner">Installers: advertise here</a>`;

function paint() {
  if (!el) return;
  const k = Math.floor(OFFSET * Math.max(cur.length, 1)), order = cur.slice(k).concat(cur.slice(0, k));
  // one "set" = the installers, then empty pills; repeat the empty pills until the set is wider than the strip so the loop has no gap
  const win = el.querySelector(".sp-win"), track = el.querySelector(".sp-track");
  const build = (n) => order.map(pill).join("") + EMPTY.repeat(n);
  let n = Math.max(2, 4 - order.length), set = build(n);
  track.innerHTML = set; track.style.removeProperty("--sw");
  const need = (win.clientWidth || 360) + 40;
  while (track.scrollWidth < need && n < 12) { n++; set = build(n); track.innerHTML = set; }
  if (reduced) { track.classList.remove("go"); } else {
    const w = track.scrollWidth; track.innerHTML = set + `<span class="sp-dup" aria-hidden="true" inert>${set}</span>`;
    track.style.setProperty("--sw", w + "px"); track.style.setProperty("--dur", Math.max(12, w / SPEED) + "s"); track.classList.add("go");
  }
  watch(); changed();
}

// Count a "shown" the first time an installer's pill is actually on screen.
function watch() {
  if (io) io.disconnect();
  if (!("IntersectionObserver" in window)) { cur.forEach((i) => { if (!seen.has(i.id)) { seen.add(i.id); beat(i.id, "imp"); } }); return; }
  io = new IntersectionObserver((es) => es.forEach((e) => { const id = e.target.dataset.id; if (e.isIntersecting && id && !seen.has(id)) { seen.add(id); beat(id, "imp"); } }), { root: el.querySelector(".sp-win"), threshold: 0.6 });
  el.querySelectorAll(".sp-track > .sp-pill[data-id]").forEach((n) => io.observe(n));
}

// regions: a Set of normalized city and county names that are in view (see regionKey).
export function updateBanner(regions) {
  if (!el) return;
  const next = LIST.filter((i) => serves(i, regions)), key = next.map((i) => i.id).join(",");
  if (key === lastKey) return;
  lastKey = key; cur = next; paint();
}

export const bannerHeight = () => (el && !el.hidden ? el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom || 0) + parseFloat(getComputedStyle(el).marginTop || 0) : 0);

// place(): moves the strip to the right spot (desktop: under the search row; phone: above the list).
export async function initBanner({ place, onChange }) {
  host = place; changed = onChange || (() => {});
  try { const r = await fetch("/api/banner"); LIST = r.ok ? await r.json() : []; } catch { LIST = []; }
  el = document.createElement("div"); el.id = "sponsor"; el.className = "sponsor";
  el.setAttribute("role", "region"); el.setAttribute("aria-label", "Installer sponsors");
  el.innerHTML = `<span class="sp-tag">Sponsor</span><div class="sp-win"><div class="sp-track"></div></div>${reduced ? "" : `<button type="button" class="sp-pause" aria-pressed="false" aria-label="Pause the scrolling banner"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path class="pp" d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor"/></svg></button>`}`;
  el.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-k]"), pb = e.target.closest(".sp-pause");
    if (a) { const id = a.closest(".sp-pill")?.dataset.id; if (id) beat(id, a.dataset.k); }
    else if (pb) { paused = !paused; el.classList.toggle("paused", paused); pb.setAttribute("aria-pressed", String(paused)); pb.setAttribute("aria-label", paused ? "Resume the scrolling banner" : "Pause the scrolling banner"); pb.querySelector(".pp").setAttribute("d", paused ? "M2 1l7 4-7 4z" : "M2 1h2v8H2zM6 1h2v8H6z"); }
  });
  host(el); paint();
  return true;
}
