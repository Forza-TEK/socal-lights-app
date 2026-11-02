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
const where = (h) => h.address || `${h.lat},${h.lng}`;
export function routeUrl(app, stops, origin) {
  const dest = where(stops[stops.length - 1]), way = stops.slice(0, -1).map(where), e = encodeURIComponent;
  if (app === "apple") return "https://maps.apple.com/directions?" + (origin ? "source=" + e(origin) + "&" : "") + "destination=" + e(dest) + way.map((w) => "&waypoint=" + e(w)).join("") + "&mode=driving";
  return "https://www.google.com/maps/dir/?api=1" + (origin ? "&origin=" + e(origin) : "") + "&destination=" + e(dest) + (way.length ? "&waypoints=" + e(way.join("|")) : "") + "&travelmode=driving";
}

// opts: { slug, entries: [{id,name,address,city,lat,lng,no}], title, intro }
export function tourHtml(opts) { return `<section class="card tour" data-tour><h2>${esc(opts.title || "Visit the homes")}</h2><p class="muted small">${esc(opts.intro || "Drive past every home in a few routes. Your maps app takes up to 9 stops at a time, so a long list is split into routes of 9 or fewer, and each route starts where the last one ended.")}</p><div class="tourbar"><div class="mapspick" role="group" aria-label="Maps app"><span>Open in</span>${Object.entries(MAPS).map(([k, l]) => `<button type="button" data-tmaps="${k}" aria-pressed="false">${l}</button>`).join("")}</div><button type="button" class="btn ghost sm" data-tnear>Start with the nearest home</button></div><div class="tourprog small muted" data-tprog></div><div data-tlegs></div></section>`; }

export function wireTour(root, opts) {
  const el = root.querySelector("[data-tour]"); if (!el) return;
  const key = "scl-tour:" + opts.slug; let visited = new Set(); try { visited = new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch {}
  const homes = opts.entries.filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng)); let app = pref(), from = null, hint = "";
  const save = () => { try { localStorage.setItem(key, JSON.stringify([...visited])); } catch {} };
  const draw = () => {
    const list = order(homes, from), L = legs(list); let n = 0;
    el.querySelectorAll("[data-tmaps]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tmaps === app)));
    el.querySelector("[data-tprog]").textContent = `${[...visited].filter((id) => homes.some((h) => h.id === id)).length} of ${homes.length} visited${hint ? " · " + hint : ""}`;
    el.querySelector("[data-tlegs]").innerHTML = L.map((leg, i) => {
      const origin = i === 0 ? (from && from.label ? from.label : "") : where(L[i - 1][L[i - 1].length - 1]);
      return `<div class="leg"><div class="legh"><b>Route ${i + 1} of ${L.length}</b><span class="muted small">${leg.length} home${leg.length === 1 ? "" : "s"}${i ? ", from the end of route " + i : ", from where you are"}</span><a class="btn org sm" href="${esc(routeUrl(app, leg, origin))}" target="_blank" rel="noopener">Open in ${MAPS[app]}</a></div>
        <ol class="legl">${leg.map((h) => { n++; return `<li><label><input type="checkbox" data-tvis="${esc(h.id)}" ${visited.has(h.id) ? "checked" : ""}><span class="num">${n}</span><span class="tn"><b>${esc(h.name)}</b><small>${esc(h.address || h.city || "")}${h.no ? " · Home #" + esc(h.no) : ""}</small></span></label><a class="link" href="${esc(routeUrl(app, [h], ""))}" target="_blank" rel="noopener" aria-label="Directions to ${esc(h.name)}">Directions</a></li>`; }).join("")}</ol></div>`;
    }).join("") || '<p class="muted">No homes with a location yet.</p>';
  };
  el.addEventListener("click", (e) => {
    const m = e.target.closest("[data-tmaps]"); if (m) { app = m.dataset.tmaps; try { localStorage.setItem("socal-maps", app); } catch {} return draw(); }
    if (e.target.closest("[data-tnear]")) {
      if (!navigator.geolocation) { hint = "Location isn't available here."; return draw(); }
      hint = "Finding you…"; draw();
      navigator.geolocation.getCurrentPosition((p) => { from = { lat: p.coords.latitude, lng: p.coords.longitude, label: "" }; hint = "ordered from where you are"; draw(); }, () => { hint = "Location is blocked, so the order starts at the west end."; draw(); }, { timeout: 8000, maximumAge: 120000 });
    }
  });
  el.addEventListener("change", (e) => { const c = e.target.closest("[data-tvis]"); if (!c) return; c.checked ? visited.add(c.dataset.tvis) : visited.delete(c.dataset.tvis); save(); el.querySelector("[data-tprog]").textContent = `${[...visited].filter((id) => homes.some((h) => h.id === id)).length} of ${homes.length} visited${hint ? " · " + hint : ""}`; });
  draw();
}
