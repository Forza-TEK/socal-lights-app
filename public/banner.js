// Installer banner: a thin, labelled strip on the map that shows installers whose service area is in the map view.
// Desktop: a line under the logo, search and buttons. Phone: right above the list, so it moves with the list.
// The list of installers comes from /api/banner (same for everyone); which ones show is decided here from what is in view.
import { fmtPhone, telHref } from "/norm.js?v=20261102b";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().replace(/\bcounty\b/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const WIDE = new Set(["southern california", "socal", "all", "everywhere", "statewide", "california", "all of southern california"]);
const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
const ROTATE_MS = 7000;

let LIST = [], el = null, cur = [], idx = 0, timer = null, paused = false, lastKey = "", host = () => {}, changed = () => {};
const seen = new Set();

// An installer with no areas listed is shown everywhere; otherwise any one of their areas has to be in view.
export function serves(inst, regions) {
  const toks = String(inst.a || "").split(/\s*(?:,|;|&|\band\b)\s*/i).map(norm).filter(Boolean);
  return !toks.length || toks.some((t) => WIDE.has(t) || regions.has(t));
}
export const regionKey = (names) => new Set([...names].map(norm).filter(Boolean));

function beat(id, k) {
  try { const b = new Blob([JSON.stringify({ id, k })], { type: "application/json" }); if (!(navigator.sendBeacon && navigator.sendBeacon("/api/banner/hit", b))) fetch("/api/banner/hit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, k }), keepalive: true }); } catch {}
}

function paint() {
  if (!el) return;
  const it = cur[idx % Math.max(cur.length, 1)];
  if (!it) { el.hidden = true; document.body.classList.remove("has-sponsor"); changed(); return; }
  const tel = telHref(it.p), ext = /^https?:/.test(it.u);
  el.hidden = false; document.body.classList.add("has-sponsor");
  el.innerHTML = `<span class="sp-tag">Sponsor</span><a class="sp-name" href="${esc(it.u)}" data-k="click"${ext ? ' target="_blank" rel="noopener sponsored nofollow"' : ""}>${esc(it.n)}</a>${tel ? `<span class="sp-sep" aria-hidden="true">|</span><a class="sp-tel" href="${esc(tel)}" data-k="call" aria-label="Call ${esc(it.n)} at ${esc(fmtPhone(it.p))}">${esc(fmtPhone(it.p))}</a>` : ""}${cur.length > 1 ? `<button type="button" class="sp-next" aria-label="Show the next installer">›</button>` : ""}`;
  if (!seen.has(it.id)) { seen.add(it.id); beat(it.id, "imp"); }
  changed();
}

function rotate() {
  clearInterval(timer); timer = null;
  if (cur.length > 1 && !reduced) timer = setInterval(() => { if (!paused && !document.hidden) { idx = (idx + 1) % cur.length; paint(); } }, ROTATE_MS);
}

// regions: a Set of normalized city and county names that are in view (see regionKey).
export function updateBanner(regions) {
  if (!el) return;
  const next = LIST.filter((i) => serves(i, regions)), key = next.map((i) => i.id).join(",");
  if (key === lastKey) return;
  const shownId = cur[idx % Math.max(cur.length, 1)]?.id;
  lastKey = key; cur = next;
  const keep = cur.findIndex((i) => i.id === shownId); // the one on screen stays while it still applies
  idx = keep >= 0 ? keep : cur.length ? Math.floor(Math.random() * cur.length) : 0;
  paint(); rotate();
}

export const bannerHeight = () => (el && !el.hidden ? el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom || 0) + parseFloat(getComputedStyle(el).marginTop || 0) : 0);

// place(): called whenever the screen switches between phone and desktop, to move the strip to the right spot.
export async function initBanner({ place, onChange }) {
  host = place; changed = onChange || (() => {});
  try { const r = await fetch("/api/banner"); LIST = r.ok ? await r.json() : []; } catch { LIST = []; }
  if (!LIST.length) return false;
  el = document.createElement("div"); el.id = "sponsor"; el.className = "sponsor"; el.hidden = true;
  el.setAttribute("role", "region"); el.setAttribute("aria-label", "Installer sponsor");
  el.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-k]"), n = e.target.closest(".sp-next");
    if (a) { const it = cur[idx % cur.length]; if (it) beat(it.id, a.dataset.k); }
    else if (n) { idx = (idx + 1) % cur.length; paint(); rotate(); el.querySelector(".sp-next")?.focus(); }
  });
  el.addEventListener("mouseenter", () => (paused = true)); el.addEventListener("mouseleave", () => (paused = false));
  el.addEventListener("focusin", () => (paused = true)); el.addEventListener("focusout", () => (paused = false));
  host(el);
  return true;
}
