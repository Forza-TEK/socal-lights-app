// "Visit the homes": every home in a contest as a short list of driving routes. Maps apps take about 9 stops at a time,
// so a long list is split into the fewest routes of 9 or fewer, sized evenly, with each route starting where the last one ended.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const MAX_STOPS = 9;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const MAPS = { google: "Google Maps", apple: "Apple Maps" };
const pref = () => { try { const v = localStorage.getItem("socal-maps"); if (MAPS[v]) return v; } catch {} return IS_IOS ? "apple" : "google"; };

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
export function routeUrl(app, stops, origin) {
  const dest = where(stops[stops.length - 1]), way = stops.slice(0, -1).map(where), e = encodeURIComponent;
  if (app === "apple") return "https://maps.apple.com/directions?" + (origin ? "source=" + e(origin) + "&" : "") + "destination=" + e(dest) + way.map((w) => "&waypoint=" + e(w)).join("") + "&mode=driving";
  return "https://www.google.com/maps/dir/?api=1" + (origin ? "&origin=" + e(origin) : "") + "&destination=" + e(dest) + (way.length ? "&waypoints=" + e(way.join("|")) : "") + "&travelmode=driving";
}

// opts: { title, intro, bare (no card frame, for the pop-up), nearest (show "Start with the nearest home", default true) }
export function tourHtml(opts) { return `<section class="${opts.bare ? "" : "card "}tour" data-tour><h2>${esc(opts.title || "Visit the homes")}</h2><p class="muted small">${esc(opts.intro || "Drive past every home in a few routes. Your maps app takes up to 9 stops at a time, so a long list is split into routes of 9 or fewer, and each route starts where the last one ended.")}</p><div class="tourbar"><div class="mapspick" role="group" aria-label="Maps app"><span>Open in</span>${Object.entries(MAPS).map(([k, l]) => `<button type="button" data-tmaps="${k}" aria-pressed="false">${l}</button>`).join("")}</div>${opts.nearest === false ? "" : `<button type="button" class="btn ghost sm" data-tnear>Start with the nearest home</button>`}</div><div class="tourprog small muted" data-tprog></div><div data-tlegs></div></section>`; }

// opts: { slug | key, entries: [{id,name,address,city,lat,lng,no | sub,dest}], ordered (keep the given order), origin (where route 1 starts, "" = where the phone is),
//         start (a stop the trip starts from; shown first, not part of the routes), app, onApp(app) }
export function wireTour(root, opts) {
  const el = root.querySelector("[data-tour]"); if (!el) return;
  const key = "scl-tour:" + (opts.key || opts.slug); let visited = new Set(); try { visited = new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch {}
  const usable = (h) => h.dest || (Number.isFinite(h.lat) && Number.isFinite(h.lng));
  const homes = opts.entries.filter(usable); let app = MAPS[opts.app] ? opts.app : pref(), from = null, hint = "";
  const subOf = (h) => h.sub != null ? h.sub : `${h.address || h.city || ""}${h.no ? " · Home #" + h.no : ""}`;
  const save = () => { try { localStorage.setItem(key, JSON.stringify([...visited])); } catch {} };
  const count = () => [...visited].filter((id) => homes.some((h) => h.id === id) || (opts.start && opts.start.id === id)).length;
  const total = () => homes.length + (opts.start ? 1 : 0);
  const prog = () => { el.querySelector("[data-tprog]").textContent = `${count()} of ${total()} visited${hint ? " · " + hint : ""}`; };
  const row = (h, n) => `<li><label><input type="checkbox" data-tvis="${esc(h.id)}" ${visited.has(h.id) ? "checked" : ""}><span class="num">${n}</span><span class="tn"><b>${esc(h.name)}</b><small>${esc(subOf(h))}</small></span></label><a class="link" href="${esc(routeUrl(app, [h], ""))}" target="_blank" rel="noopener" aria-label="Directions to ${esc(h.name)}">Directions</a></li>`;
  const draw = () => {
    const list = opts.ordered ? homes : order(homes, from), L = legs(list); let n = opts.start ? 1 : 0;
    el.querySelectorAll("[data-tmaps]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tmaps === app)));
    prog();
    const startOrigin = opts.start ? where(opts.start) : opts.origin || (from && from.label ? from.label : "");
    el.querySelector("[data-tlegs]").innerHTML = (opts.start ? `<div class="leg legstart"><div class="legh"><b>Start</b><span class="muted small">You begin here</span></div><ol class="legl">${row(opts.start, 1)}</ol></div>` : "") + L.map((leg, i) => {
      const origin = i === 0 ? startOrigin : where(L[i - 1][L[i - 1].length - 1]);
      const place = leg.length + " stop" + (leg.length === 1 ? "" : "s");
      const hdr = i ? ", from the end of route " + i : opts.start ? ", from the start" : opts.origin ? ", from your starting point" : ", from where you are";
      return `<div class="leg"><div class="legh"><b>Route ${i + 1} of ${L.length}</b><span class="muted small">${place}${hdr}</span><a class="legbtn" href="${esc(routeUrl(app, leg, origin))}" target="_blank" rel="noopener">Open in ${MAPS[app]}</a></div>
        <ol class="legl">${leg.map((h) => row(h, ++n)).join("")}</ol></div>`;
    }).join("") || '<p class="muted">No places with a location yet.</p>';
  };
  el.addEventListener("click", (e) => {
    const m = e.target.closest("[data-tmaps]"); if (m) { app = m.dataset.tmaps; try { localStorage.setItem("socal-maps", app); } catch {} if (opts.onApp) opts.onApp(app); return draw(); }
    if (e.target.closest("[data-tnear]")) {
      if (!navigator.geolocation) { hint = "Location isn't available here."; return draw(); }
      hint = "Finding you…"; draw();
      navigator.geolocation.getCurrentPosition((p) => { from = { lat: p.coords.latitude, lng: p.coords.longitude, label: "" }; hint = "ordered from where you are"; draw(); }, () => { hint = "Location is blocked, so the order starts at the west end."; draw(); }, { timeout: 8000, maximumAge: 120000 });
    }
  });
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
