// Maps apps for "Directions" and "Route these": which app opens, and how a stop or a route is turned into a link for it.
// On a phone the first tap asks which maps app to use (a small pop-up that works like the phone's own "Open with" question) and remembers the
// answer on this device. "Change" next to "Opens in ..." asks again. A web page cannot read or change the phone's own default (see docs/maps-choice.md).
const UA = navigator.userAgent;
export const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const IS_MOBILE = IS_IOS || /Android/i.test(UA);
export const MAPS = { apple: "Apple Maps", google: "Google Maps", waze: "Waze" };
const KEY = "socal-maps";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const savedMaps = () => { try { const v = localStorage.getItem(KEY); if (MAPS[v]) return v; } catch {} return ""; };
export const getMaps = () => savedMaps() || (IS_IOS ? "apple" : "google");
export function setMaps(v) { if (MAPS[v]) try { localStorage.setItem(KEY, v); } catch {} }

// A stop is a string (an address or "lat,lng") or { dest | address | lat,lng }
const where = (h) => (typeof h === "string" ? h : h.dest || h.address || `${h.lat},${h.lng}`);
const isLatLng = (s) => /^\s*-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?\s*$/.test(s);
// stops are in driving order (the last is the final destination). origin "" = where the phone is.
// Waze takes one destination at a time: for a route it opens the FIRST stop, and the rest are tapped one after another.
export function routeUrl(app, stops, origin) {
  const e = encodeURIComponent;
  if (app === "waze") { const d = where(stops[0]); return "https://waze.com/ul?" + (isLatLng(d) ? "ll=" + e(d.replace(/\s/g, "")) : "q=" + e(d)) + "&navigate=yes"; }
  const dest = where(stops[stops.length - 1]), way = stops.slice(0, -1).map(where);
  if (app === "apple") return "https://maps.apple.com/directions?" + (origin ? "source=" + e(origin) + "&" : "") + "destination=" + e(dest) + way.map((w) => "&waypoint=" + e(w)).join("") + "&mode=driving";
  return "https://www.google.com/maps/dir/?api=1" + (origin ? "&origin=" + e(origin) : "") + "&destination=" + e(dest) + (way.length ? "&waypoints=" + e(way.join("|")) : "") + "&travelmode=driving";
}
// A link to one place, for the phone's share sheet (the Tesla app and car apps take a shared place like this)
export function placeUrl(stop, name = "") {
  const d = where(stop), e = encodeURIComponent;
  if (IS_IOS) return "https://maps.apple.com/?" + (isLatLng(d) ? "ll=" + e(d.replace(/\s/g, "")) + (name ? "&q=" + e(name) : "") : "q=" + e(d));
  return "https://www.google.com/maps/search/?api=1&query=" + e(d);
}
// data attribute for a link, so a first tap on a phone can ask which maps app to use and then open the right link
export const navAttr = (stops, origin = "") => `data-nav="${esc(JSON.stringify({ s: stops.map(where), o: origin }))}"`;

let dlg = null;
function css() {
  if (document.getElementById("maps-css")) return;
  const st = document.createElement("style"); st.id = "maps-css";
  st.textContent = `.mpscrim{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.5);display:grid;place-items:end center}
.mpdlg{width:min(420px,100%);box-sizing:border-box;background:var(--surface,var(--bg,#fff));color:var(--ink,#14161b);border-radius:24px 24px 0 0;padding:20px 18px calc(env(safe-area-inset-bottom,0px) + 20px);display:grid;gap:10px;font-family:var(--f-body,var(--font,system-ui,sans-serif))}
@media(min-width:600px){.mpscrim{place-items:center}.mpdlg{border-radius:24px}}
.mpdlg h2{margin:0;font-size:19px;font-weight:800;letter-spacing:-.01em}.mpdlg p{margin:0;font-size:14px;color:var(--muted,#646a7a)}
.mpdlg .mpb{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 18px;border:1.5px solid var(--line,#e7e3dc);border-radius:16px;background:transparent;color:inherit;font:700 16px/1 inherit;font-family:inherit;cursor:pointer;text-align:left}
.mpdlg .mpb:hover,.mpdlg .mpb:focus-visible{border-color:var(--season,#c9313b);outline:none}
.mpdlg .mpb small{margin-left:auto;font-weight:500;color:var(--muted,#646a7a);font-size:13px}
.mpdlg label{display:flex;gap:10px;align-items:center;font-size:14px;margin-top:2px}.mpdlg input{width:20px;height:20px}
.mpdlg .mpx{justify-self:start;border:0;background:none;color:var(--muted,#646a7a);font:600 14px inherit;font-family:inherit;padding:8px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.mapsnow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;color:var(--muted,#646a7a)}.mapsnow b{color:var(--ink,#14161b)}
.mapsnow .mpchg{-webkit-appearance:none;appearance:none;display:inline-grid;place-items:center;width:36px;height:36px;min-height:36px;padding:0;border:1.5px solid var(--line2,#b0b0b0)!important;border-radius:50%!important;background:transparent!important;color:var(--ink,#14161b);text-decoration:none}.mapsnow .mpchg:hover,.mapsnow .mpchg:focus-visible{border-color:var(--season,#c9313b)!important}
.mapsnow button:not(.mpchg){border:0;background:none!important;box-shadow:none;padding:6px 4px;font:600 14px inherit;font-family:inherit;color:var(--ink,#14161b);text-decoration:underline;text-underline-offset:3px;cursor:pointer;min-height:32px}`;
  document.head.appendChild(st);
}
// Ask which maps app to use. onPick(app, remember) runs when one is chosen. Nothing happens if it is dismissed.
export function askMaps(onPick, { title = "Open directions in…", cancelable = true } = {}) {
  css(); if (dlg) dlg.remove();
  const cur = savedMaps();
  const d = document.createElement("div"); d.className = "mpscrim";
  d.innerHTML = `<div class="mpdlg" role="dialog" aria-modal="true" aria-label="Choose a maps app"><h2>${esc(title)}</h2><p>Your phone opens the route in the app you pick.</p>${Object.entries(MAPS).map(([k, l]) => `<button type="button" class="mpb" data-mp="${k}">${esc(l)}${k === cur ? "<small>Current</small>" : ""}</button>`).join("")}<label><input type="checkbox" id="mp-always" checked> Always use this one</label>${cancelable ? '<button type="button" class="mpx" data-mpx>Cancel</button>' : ""}</div>`;
  document.body.appendChild(d); dlg = d;
  const close = () => { d.remove(); if (dlg === d) dlg = null; document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  d.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mp]");
    if (b) { const remember = d.querySelector("#mp-always").checked; close(); if (remember) setMaps(b.dataset.mp); onPick(b.dataset.mp, remember); return; }
    if (e.target === d || e.target.closest("[data-mpx]")) close();
  });
  const f = d.querySelector("[data-mp]"); if (f) f.focus();
}
// "Opens in Apple Maps · Change"
export const mapsNow = (app = getMaps()) => (css(), `<div class="mapsnow"><span>Opens in <b data-mapsname>${esc(MAPS[app])}</b></span><button type="button" class="mpchg" data-mapschange aria-label="Change the maps app" title="Change the maps app"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg></button></div>`);

// First tap on a Directions / route link on a phone with no saved choice: ask, remember, then open the link for that app.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-nav]"); if (!a || !IS_MOBILE || savedMaps()) return;
  let n; try { n = JSON.parse(a.dataset.nav); } catch { return; }
  e.preventDefault();
  askMaps((app) => { window.open(routeUrl(app, n.s, n.o), "_blank", "noopener"); document.dispatchEvent(new CustomEvent("maps-changed", { detail: app })); });
}, true);
// "Change" anywhere
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-mapschange]")) return;
  askMaps((app) => document.dispatchEvent(new CustomEvent("maps-changed", { detail: app })), { title: "Open directions in…" });
});
css(); // the styles of "Opens in ... Change" and the pop-up are ready as soon as this module loads
