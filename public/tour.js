// "Visit the homes": every home in a contest as a short list of driving routes. Maps apps take about 9 stops at a time,
// so a long list is split into the fewest routes of 9 or fewer, sized evenly, with each route starting where the last one ended.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const MAX_STOPS = 9;
import { MAPS, getMaps, routeUrl, placeUrl, navAttr, mapsNow, askMaps, setMaps } from "/maps.js?v=20261109c";
export { routeUrl };

const miles = (a, b) => { const R = 3959, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r, h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
// A sensible driving order: always go to the nearest home not yet visited, starting from `from` (or the west-most home)
export function order(homes, from) {
  const pool = homes.filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng)); if (!pool.length) return [];
  let at = from || pool.reduce((a, b) => (b.lng < a.lng ? b : a)); const out = [];
  if (!from) { pool.splice(pool.indexOf(at), 1); out.push(at); }
  while (pool.length) { let bi = 0, bd = Infinity; pool.forEach((h, i) => { const d = miles(at, h); if (d < bd) { bd = d; bi = i; } }); at = pool.splice(bi, 1)[0]; out.push(at); }
  return out;
}
// The fewest routes of at most 9 stops, sized as evenly as possible (10 homes: 5 and 5, not 9 and 1)
export function legs(list, max = MAX_STOPS) {
  const n = list.length, k = Math.ceil(n / max) || 0, out = []; let i = 0;
  for (let j = 0; j < k; j++) { const size = Math.floor(n / k) + (j < n % k ? 1 : 0); out.push(list.slice(i, i + size)); i += size; }
  return out;
}
const where = (h) => h.dest || h.address || `${h.lat},${h.lng}`;

// opts: { title, intro, bare (no card frame, for the pop-up), nearest (show "Start with the nearest home", default true) }
export function tourHtml(opts) { return `<section class="${opts.bare ? "" : "card "}tour" data-tour><h2>${esc(opts.title || "Visit the homes")}</h2><p class="muted small">${esc(opts.intro || "Drive past every home in a few routes. Your maps app takes up to 9 stops at a time, so a long list is split into routes of 9 or fewer, and each route starts where the last one ended.")}</p><div class="tourbar">${mapsNow()}${opts.nearest === false ? "" : `<button type="button" class="btn ghost sm" data-tnear>Start with the nearest home</button>`}</div><div class="tourprog small muted" data-tprog></div><div data-tlegs></div></section>`; }

// opts: { slug | key, entries: [{id,name,address,city,lat,lng,no | sub,dest}], ordered (keep the given order), origin (where route 1 starts, "" = where the phone is),
//         start (a stop the trip starts from; shown first, not part of the routes), app, onApp(app) }
// Share one stop to the phone's share sheet: the Tesla app (and car apps) take a shared place like this
async function shareStop(h) {
  const url = placeUrl(where(h), h.name), data = { title: h.name, text: h.name + (h.sub || h.address ? " – " + (h.sub || h.address) : ""), url };
  try { await navigator.share(data); } catch (e) { if (e && e.name !== "AbortError") { try { await navigator.clipboard.writeText(url); } catch {} } }
}
export function wireTour(root, opts) {
  const el = root.querySelector("[data-tour]"); if (!el) return;
  const key = "scl-tour:" + (opts.key || opts.slug); let visited = new Set(); try { visited = new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch {}
  const usable = (h) => h.dest || (Number.isFinite(h.lat) && Number.isFinite(h.lng));
  const homes = opts.entries.filter(usable); let app = getMaps(), from = null, hint = "";
  const subOf = (h) => h.sub != null ? h.sub : `${h.address || h.city || ""}${h.no ? " · Home #" + h.no : ""}`;
  const save = () => { try { localStorage.setItem(key, JSON.stringify([...visited])); } catch {} };
  const count = () => [...visited].filter((id) => homes.some((h) => h.id === id) || (opts.start && opts.start.id === id)).length;
  const total = () => homes.length + (opts.start ? 1 : 0);
  const prog = () => { el.querySelector("[data-tprog]").textContent = `${count()} of ${total()} visited${hint ? " · " + hint : ""}`; };
  const row = (h, n) => `<li><label><input type="checkbox" data-tvis="${esc(h.id)}" ${visited.has(h.id) ? "checked" : ""}><span class="num">${n}</span><span class="tn"><b>${esc(h.name)}</b><small>${esc(subOf(h))}</small></span></label><span class="rowacts"><a class="ib" href="${esc(routeUrl(app, [h], ""))}" ${navAttr([where(h)])} target="_blank" rel="noopener" aria-label="Directions to ${esc(h.name)}" title="Directions"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8z"/></svg></a>${navigator.share ? `<button type="button" class="ib" data-tsend="${esc(h.id)}" aria-label="Send ${esc(h.name)} to your Tesla or car app" title="Send to Tesla or your car"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-3.7 0-7 .8-10 2.4l1 1.9c2.6-1.4 5.5-2.1 9-2.1s6.4.7 9 2.1l1-1.9c-3-1.6-6.3-2.4-10-2.4z"/><path d="M12 8.1c-1 0-1.9.1-2.8.2L12 21l2.8-12.7c-.9-.1-1.8-.2-2.8-.2z"/></svg></button>` : ""}</span></li>`;
  const draw = () => {
    const list = opts.ordered ? homes : order(homes, from), L = legs(list); let n = opts.start ? 1 : 0;
    el.querySelectorAll("[data-mapsname]").forEach((b) => (b.textContent = MAPS[app]));
    prog();
    const startOrigin = opts.start ? where(opts.start) : opts.origin || (from && from.label ? from.label : "");
    el.querySelector("[data-tlegs]").innerHTML = (opts.start ? `<div class="leg legstart"><div class="legh"><b>Start</b><span class="muted small">You begin here</span></div><ol class="legl">${row(opts.start, 1)}</ol></div>` : "") + L.map((leg, i) => {
      const origin = i === 0 ? startOrigin : where(L[i - 1][L[i - 1].length - 1]);
      const place = leg.length + " stop" + (leg.length === 1 ? "" : "s");
      const hdr = i ? ", from the end of route " + i : opts.start ? ", from the start" : opts.origin ? ", from your starting point" : ", from where you are";
      return `<div class="leg"><div class="legh"><b>Route ${i + 1} of ${L.length}</b><span class="muted small">${place}${hdr}</span><a class="legbtn" href="${esc(routeUrl(app, leg, origin))}" ${navAttr(leg.map(where), origin)} target="_blank" rel="noopener">${app === "waze" ? "Start in Waze" : "Open in " + MAPS[app]}</a></div>${app === "waze" ? `<p class="muted small wznote">Waze takes one stop at a time. Start takes you to stop 1; then tap Directions on the next one.</p>` : ""}
        <ol class="legl">${leg.map((h) => row(h, ++n)).join("")}</ol></div>`;
    }).join("") || '<p class="muted">No places with a location yet.</p>';
  };
  el.addEventListener("click", (e) => {
    const sd = e.target.closest("[data-tsend]");
    if (sd) { const h = [...homes, ...(opts.start ? [opts.start] : [])].find((x) => x.id === sd.dataset.tsend); if (h) shareStop(h); return; }
    if (e.target.closest("[data-tnear]")) {
      if (!navigator.geolocation) { hint = "Location isn't available here."; return draw(); }
      hint = "Finding you…"; draw();
      navigator.geolocation.getCurrentPosition((p) => { from = { lat: p.coords.latitude, lng: p.coords.longitude, label: "" }; hint = "ordered from where you are"; draw(); }, () => { hint = "Location is blocked, so the order starts at the west end."; draw(); }, { timeout: 8000, maximumAge: 120000 });
    }
  });
  const onMaps = (ev) => { if (!el.isConnected) return document.removeEventListener("maps-changed", onMaps); app = ev.detail || getMaps(); if (opts.onApp) opts.onApp(app); draw(); };
  document.addEventListener("maps-changed", onMaps);
  el.addEventListener("change", (e) => { const c = e.target.closest("[data-tvis]"); if (!c) return; c.checked ? visited.add(c.dataset.tvis) : visited.delete(c.dataset.tvis); save(); prog(); });
  draw();
}

// The same route list in a pop-up, for the map: "Route these" and My night. `stops` are already in driving order: [{id,name,sub,dest,lat,lng}]
export function openRouteSheet(o) {
  const m = document.getElementById("modal"); if (!m) return;
  const close = () => { m.hidden = true; m.innerHTML = ""; m.onclick = null; document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  m.innerHTML = `<div class="card rsheet" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><button type="button" class="rs-x" data-rsx aria-label="Close" title="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>${tourHtml({ bare: true, nearest: false, title: o.title, intro: o.intro })}${o.note ? `<p class="muted small rs-note">${esc(o.note)}</p>` : ""}</div>`;
  m.hidden = false; document.addEventListener("keydown", onKey);
  m.querySelector("[data-rsx]").onclick = close; m.onclick = (e) => { if (e.target === m) close(); };
  wireTour(m, { key: o.key || "map", entries: o.stops, ordered: true, origin: o.origin || "", start: o.start, app: o.app, onApp: o.onApp });
  const first = m.querySelector("[data-rsx]"); if (first) first.focus();
}
