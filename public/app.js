// SoCal Lights Finder — public map app
import { CITY } from "/cities.js";
import { SEASONS, TYPE_SHORT, defaultSeason, seasonsFrom, seasonStarts } from "/seasons.js";
import { STOCK } from "/stock.js";

/* ---------- constants & helpers ---------- */
// Day mode is the default; night mode uses a dark base map. The choice is remembered per device (set in index.html).
const MAP_STYLES = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };
const theme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
// Pin and cluster colors: free events are green; ticketed events, clusters and the route take the season's accent
const SEASON_HEX = { light: { newyear: "#6d3fc0", spring: "#c0306f", summer: "#1e63c4", halloween: "#e8590c", christmas: "#d1343f" },
  dark: { newyear: "#a98bf0", spring: "#f07cb2", summer: "#6fa8f2", halloween: "#ff8a3d", christmas: "#ff6b6b" } };
function mapColors() {
  const t = theme(), dark = t === "dark";
  return { season: SEASON_HEX[t][state.season] || "#e8590c", free: dark ? "#3ddc97" : "#0f9d6b", fav: dark ? "#f5c461" : "#c98a06", inst: dark ? "#7fb6ee" : "#2f6fd0",
    ring: dark ? "#0b0d12" : "#ffffff", ink: dark ? "#f5f3ee" : "#14161b" };
}
const SOCAL = [[-120.15, 32.5], [-115.45, 35.0]];
const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
// Today in Southern California, as YYYY-MM-DD
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
const NOW_SEASON = defaultSeason(TODAY);
const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d) => { const [, m, dd] = d.split("-").map(Number); return M[m - 1] + " " + dd; };
const isPhone = () => matchMedia("(max-width:860px)").matches;
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const photoUrl = (k) => "/api/photo/" + k.split("/").map(encodeURIComponent).join("/");
function range(ev) {
  if (ev.s === ev.e) { const [y, m, d] = ev.s.split("-").map(Number); return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(y, m - 1, d).getDay()] + ", " + fmt(ev.s) + ", " + y; }
  const ys = ev.s.slice(0, 4), ye = ev.e.slice(0, 4);
  return fmt(ev.s) + (ys !== ye ? ", " + ys : "") + " – " + fmt(ev.e) + ", " + ye;
}
// Directions go to the venue's street address when we have one (Google resolves it to the right entrance),
// otherwise to the pin.
function destOf(ev) {
  const a = ev.a || "", v = ev.v || "";
  return !a ? ev.lat + "," + ev.lng : /^\d/.test(a) || a.includes("&") || !v || a.includes(v) ? a : v + ", " + a;
}
// Which maps app opens for directions: Apple Maps by default on iPhone/iPad, Google Maps elsewhere; the choice is remembered.
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const MAPS = { apple: "Apple Maps", google: "Google Maps" };
let mapsApp = IS_IOS ? "apple" : "google";
try { const v = localStorage.getItem("socal-maps"); if (MAPS[v]) mapsApp = v; } catch {}
function setMapsApp(v) { if (!MAPS[v]) return; mapsApp = v; try { localStorage.setItem("socal-maps", v); } catch {} renderPanel(); }
// stops: destination strings in order (last = final destination); origin: "" means "start from where I am"
function navUrl(stops, origin) {
  const dest = stops[stops.length - 1], way = stops.slice(0, -1), e = encodeURIComponent;
  if (mapsApp === "apple") {
    // Apple's unified Maps URLs (iOS 18.4+) take repeated waypoint= params for multi-stop routes
    return "https://maps.apple.com/directions?" + (origin ? "source=" + e(origin) + "&" : "") + "destination=" + e(dest) + way.map((w) => "&waypoint=" + e(w)).join("") + "&mode=driving";
  }
  return "https://www.google.com/maps/dir/?api=1" + (origin ? "&origin=" + e(origin) : "") + "&destination=" + e(dest) + (way.length ? "&waypoints=" + e(way.join("|")) : "") + "&travelmode=driving";
}
function dirUrl(ev) { return navUrl([destOf(ev)], ""); }
function mapsPicker() {
  return `<div class="mapspick" role="group" aria-label="Maps app"><span>Open in</span>${Object.entries(MAPS).map(([k, l]) => `<button type="button" data-maps="${k}" aria-pressed="${k === mapsApp}">${l}</button>`).join("")}</div>`;
}
// "Event info" links: add a text fragment (#:~:text=) so Safari/Chrome/Edge scroll to and highlight the event's name
// on pages that list many events. If the name isn't on the page, the page simply opens at the top.
function infoUrl(u, name) {
  const enc = (s) => encodeURIComponent(s).replace(/-/g, "%2D");
  const full = name.replace(/\s+/g, " ").trim();
  // a shorter, distinctive version: drop "The", ordinals like "128th", years, and anything after " at " / " – " / ":" / " ("
  // For "X at Y" names the venue part (Y) is the distinctive one; otherwise keep the main title.
  const base = full.replace(/^the\s+/i, "").replace(/\b\d+(st|nd|rd|th)\s+(annual\s+)?/i, "").replace(/\s*\b20\d\d\b/g, "");
  const at = base.split(/\s+(?:at|@)\s+/i);
  const short = (at.length > 1 ? at[at.length - 1] : base).split(/\s+[–—-]\s+|:\s+|\s+\(/)[0].trim();
  const parts = [full]; if (short && short.length >= 6 && short.toLowerCase() !== full.toLowerCase()) parts.push(short);
  const frag = ":~:" + parts.map((t) => "text=" + enc(t)).join("&");
  return u.includes("#") ? u + frag : u + "#" + frag;
}
function safeUrl(u) { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } }
const miles = (a, b) => { const R = 3958.8, r = (x) => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

/* ---------- state ---------- */
let E = [], SHOW = [], CONFIG = {};
const state = { season: defaultSeason(TODAY), q: "", date: "", city: "", radius: 10, counties: new Set(), cost: "all", type: "", conf: false, layers: { events: true, inst: true }, tab: "events", inView: true, sel: null, hot: null, detail: null, start: "me", me: null, meErr: "" };
let favs = new Set(); try { favs = new Set(JSON.parse(localStorage.getItem("socal-favs") || "[]")); } catch {}
const saveFavs = () => { try { localStorage.setItem("socal-favs", JSON.stringify([...favs])); } catch {} };

const CITY_OPTS = { ...CITY };
const nearCity = (lat, lng) => { if (!state.city) return true; const c = CITY_OPTS[state.city]; return !c || miles({ lat, lng }, { lat: c[0], lng: c[1] }) <= state.radius; };
function evMatch(ev) {
  if ((ev.sn || "christmas") !== state.season) return false;
  if (ev.e < TODAY) return false; // past events drop off automatically
  if (state.q && !(ev.n + " " + ev.city + " " + ev.c).toLowerCase().includes(state.q)) return false;
  if (state.counties.size && !state.counties.has(ev.c)) return false;
  if (!nearCity(ev.lat, ev.lng)) return false;
  if (state.cost === "free" && !ev.free) return false;
  if (state.cost === "paid" && ev.free) return false;
  if (state.type && ev.t !== state.type) return false;
  if (state.conf && ev.st !== "c") return false;
  if (state.date && (state.date < ev.s || state.date > ev.e)) return false;
  return true;
}
function instMatch(p) {
  if ((p.season || "christmas") !== state.season) return false;
  if (state.q && !(p.biz + " " + p.title + " " + p.city + " " + p.desc).toLowerCase().includes(state.q)) return false;
  if (state.counties.size && !state.counties.has(p.county)) return false;
  if (!nearCity(p.lat, p.lng)) return false;
  return true;
}
// Houses are placed at city level; spread posts in the same city so pins don't stack
function placeHouses() {
  const byCity = {};
  SHOW.forEach((p) => { (byCity[p.city] ||= []).push(p); });
  Object.values(byCity).forEach((list) => list.forEach((p, i) => {
    const a = i * 2.4, r = i ? 0.006 * Math.sqrt(i) : 0;
    p.plat = p.lat + r * Math.sin(a); p.plng = p.lng + r * Math.cos(a);
  }));
}

/* ---------- map ---------- */
const map = new maplibregl.Map({ container: "map", style: MAP_STYLES[theme()], bounds: SOCAL, fitBoundsOptions: { padding: 40 }, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false }), "top-right");

function padding() {
  const ph = isPhone();
  return { top: ph ? 120 : 170, left: 24, right: ph ? 24 : (parseFloat(cssVar("--panel-w")) || 0) + 48, bottom: ph ? sheetVisible() + 16 : 24 };
}
// On phones the list covers the map when expanded, so "in map view" means the map above the collapsed sheet.
function mapArea() { const p = padding(); if (isPhone()) p.bottom = peekH() + 16; return { x0: p.left - 24, y0: p.top - 10, x1: innerWidth - p.right + 24, y1: innerHeight - p.bottom + 16 }; }
function fitSoCal(animate) { map.fitBounds(SOCAL, { padding: padding(), duration: animate ? 600 : 0 }); }
function easeToPoint(lng, lat, minZoom = 12) { map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), minZoom), padding: padding(), duration: 600 }); }

let mapReady = false;
// Add our layers as soon as the base style is parsed ("style.load"), not on "load",
// which waits for every base-map tile and can stall on a slow or failed tile request.
// Switching day/night swaps the base style, which drops our layers; "style.load" then adds them back.
map.on("style.load", initLayers);
map.on("load", initLayers);
const catColor = (C) => ["match", ["get", "cat"], "free", C.free, "paid", C.season, "fav", C.fav, "inst", C.inst, C.season];
function initLayers() {
  if (map.getSource("pts")) return;
  const C = mapColors();
  map.addSource("pts", { type: "geojson", data: fc([]), cluster: true, clusterMaxZoom: 11, clusterRadius: 44 });
  map.addSource("hl", { type: "geojson", data: fc([]) });
  map.addSource("route", { type: "geojson", data: fc([]) });
  map.addSource("stops", { type: "geojson", data: fc([]) });
  map.addLayer({ id: "clusters", type: "circle", source: "pts", filter: ["has", "point_count"],
    paint: { "circle-color": C.season, "circle-opacity": 0.92, "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 20, 25], "circle-stroke-width": 4, "circle-stroke-color": C.ring, "circle-stroke-opacity": 0.9 } });
  map.addLayer({ id: "cluster-count", type: "symbol", source: "pts", filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13 }, paint: { "text-color": "#ffffff" } });
  map.addLayer({ id: "pt", type: "circle", source: "pts", filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": catColor(C),
      "circle-radius": ["case", ["==", ["get", "cat"], "inst"], 8, ["==", ["get", "cat"], "fav"], 8, 7],
      "circle-stroke-width": 2.5, "circle-stroke-color": C.ring } });
  map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": C.fav, "line-width": 4, "line-dasharray": [1.5, 1.5] } });
  map.addLayer({ id: "stops", type: "circle", source: "stops", paint: { "circle-color": C.fav, "circle-radius": 12, "circle-stroke-width": 3, "circle-stroke-color": C.ring } });
  map.addLayer({ id: "stops-num", type: "symbol", source: "stops", layout: { "text-field": ["get", "num"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
  map.addLayer({ id: "hl", type: "circle", source: "hl", paint: { "circle-color": catColor(C), "circle-radius": 11, "circle-stroke-width": 4, "circle-stroke-color": C.ring } });
  map.addLayer({ id: "hl-label", type: "symbol", source: "hl",
    layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-anchor": "left", "text-offset": [1.2, 0], "text-allow-overlap": true, "text-max-width": 16 },
    paint: { "text-color": C.ink, "text-halo-color": C.ring, "text-halo-width": 2.2 } });
  if (mapReady) { drawMap(); return; } // base style swapped (day/night): layers are back, nothing else to set up

  map.on("click", "clusters", async (e) => {
    const f = e.features[0];
    const z = await map.getSource("pts").getClusterExpansionZoom(f.properties.cluster_id);
    map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.3 });
  });
  for (const id of ["pt", "stops"]) {
    map.on("click", id, (e) => { e.preventDefault(); selectKey(e.features[0].properties.key, "map"); });
    map.on("mouseenter", id, (e) => { map.getCanvas().style.cursor = "pointer"; setHot(e.features[0].properties.key); });
    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; setHot(null); });
  }
  map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
  map.on("click", (e) => { if (e.defaultPrevented) return; const hit = map.queryRenderedFeatures(e.point, { layers: ["pt", "clusters", "stops"] }); if (!hit.length && state.sel) { state.sel = null; renderPreview(); drawHL(); markItems(); } });
  map.on("moveend", scheduleList);
  mapReady = true;
  fitSoCal(false);
  drawMap();
}

const fc = (features) => ({ type: "FeatureCollection", features });
const pt = (lng, lat, props) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: props });

// While a day/night style swap is loading our sources don't exist yet; initLayers redraws once they're back
function drawMap() {
  if (!mapReady || !map.getSource("pts")) return;
  const feats = [];
  if (state.tab !== "plan") {
    if (state.layers.events) E.filter(evMatch).forEach((e) => feats.push(pt(e.lng, e.lat, { key: "e:" + e.id, cat: favs.has(e.id) ? "fav" : e.free ? "free" : "paid" })));
    if (state.layers.inst) SHOW.filter(instMatch).forEach((p) => feats.push(pt(p.plng, p.plat, { key: "i:" + p.id, cat: "inst" })));
  }
  map.getSource("pts").setData(fc(feats));
  // planner route
  const st = state.tab === "plan" ? routeStops() : [];
  const og = state.tab === "plan" ? routeOrigin() : null, o = og ? [[og.lng, og.lat]] : [];
  const coords = [...o, ...st.map((e) => [e.lng, e.lat])];
  map.getSource("route").setData(fc(coords.length > 1 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] : []));
  map.getSource("stops").setData(fc(st.map((e, i) => pt(e.lng, e.lat, { key: "e:" + e.id, num: String(i + 1) }))));
  drawHL();
}
function drawHL() {
  if (!mapReady || !map.getSource("hl")) return;
  const out = [];
  for (const k of new Set([state.sel, state.hot].filter(Boolean))) {
    const it = findKey(k); if (!it) continue;
    if (it.kind === "ev") out.push(pt(it.ev.lng, it.ev.lat, { cat: favs.has(it.ev.id) ? "fav" : it.ev.free ? "free" : "paid", label: it.ev.n }));
    else out.push(pt(it.p.plng, it.p.plat, { cat: "inst", label: it.p.title }));
  }
  map.getSource("hl").setData(fc(out));
}
function setHot(k) { if (state.hot === k) return; state.hot = k; drawHL(); document.querySelectorAll(".item").forEach((el) => el.classList.toggle("hot", el.dataset.key === k)); }

/* ---------- planner ---------- */
// Where the route begins: your current location (default), a chosen city, or the first stop ("first" → null)
function routeOrigin() {
  if (state.start === "me") return state.me;
  if (state.start && CITY[state.start]) return { lat: CITY[state.start][0], lng: CITY[state.start][1] };
  return null;
}
let locating = false;
function locateMe(force) {
  if (locating || (!force && (state.me || state.meErr))) return;
  if (!navigator.geolocation) { state.meErr = "Your browser can't share its location."; renderPanel(); return; }
  locating = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => { locating = false; state.me = { lat: pos.coords.latitude, lng: pos.coords.longitude }; state.meErr = ""; if (state.tab === "plan") { renderPanel(); drawMap(); fitRoute(); } },
    (err) => { locating = false; state.meErr = err.code === 1 ? "Location is blocked for this site, so the route starts at your first stop. Google Maps will still start from where you are." : "Couldn't find your location right now."; if (state.tab === "plan") renderPanel(); },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}
function routeStops() {
  const fl = E.filter((e) => favs.has(e.id)); if (!fl.length) return [];
  const o = routeOrigin();
  let pool = [...fl], route = [], at = o || pool[0]; if (!o) route.push(pool.shift());
  while (pool.length) { pool.sort((a, b) => miles(at, a) - miles(at, b)); at = pool.shift(); route.push(at); }
  return route;
}

/* ---------- selection, preview ---------- */
function findKey(k) {
  if (!k) return null; const t = k[0], id = k.slice(2);
  if (t === "e") { const ev = E.find((e) => e.id === id); return ev ? { kind: "ev", ev } : null; }
  const p = SHOW.find((x) => x.id === id); return p ? { kind: "inst", p } : null;
}
function selectKey(k, from) {
  const it = findKey(k); if (!it) return;
  state.sel = k;
  if (from === "list") { const [lng, lat] = it.kind === "ev" ? [it.ev.lng, it.ev.lat] : [it.p.plng, it.p.plat]; easeToPoint(lng, lat, 12.5); openDetail(k); }
  else {
    // Tapped on the map: show the preview card and bring the event into view in the list (the sheet itself doesn't move)
    renderPreview();
    const want = it.kind === "ev" ? (state.tab === "plan" && favs.has(it.ev.id) ? "plan" : "events") : "inst";
    if (state.tab !== want) setTab(want);
    else if (state.detail) { state.detail = null; renderPanel(); }
    else if (!document.querySelector(`.item[data-key="${CSS.escape(k)}"]`)) renderPanel();
  }
  drawHL(); markItems();
  if (from !== "list") revealItem(k);
}
// Scroll the results list so this item sits at the top of the visible part of the list, and flash it
function revealItem(k) {
  const body = $("#pbody"), el = body.querySelector(`.item[data-key="${CSS.escape(k)}"]`);
  if (!el) return;
  if ($("#panel").classList.contains("peek")) {
    const list = el.parentElement;
    list.scrollTo({ left: Math.max(0, el.offsetLeft - list.offsetLeft - 16), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); return;
  }
  const top = body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 10;
  body.scrollTo({ top: Math.max(0, top), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}
function renderPreview() {
  const pv = $("#preview"), it = findKey(state.sel);
  if (!it || state.detail === state.sel) { pv.hidden = true; return; }
  if (it.kind === "ev") {
    const ev = it.ev, [, m, d] = ev.s.split("-").map(Number);
    pv.innerHTML = `${datetile(ev)}<div class="pv-body"><strong>${esc(ev.n)}</strong><div class="meta">${esc(ev.city)} · ${esc(ev.p)}</div><div class="dates">${range(ev)}</div></div><button class="x" type="button" aria-label="Close">×</button>`;
  } else {
    const p = it.p, ph = p.photos || [];
    pv.innerHTML = `<div class="pv-img">${ph.length ? `<img src="${photoUrl(ph[0])}" alt="">` : `<span class="meta">No photo</span>`}</div><div class="pv-body"><span class="tag ice" style="justify-self:start">Showcased house</span><strong>${esc(p.title)}</strong><div class="meta">${esc(p.biz)} · ${esc(p.city)}${ph.length > 1 ? ` · ${ph.length} photos` : ""}</div></div><button class="x" type="button" aria-label="Close">×</button>`;
  }
  pv.hidden = false;
  pv.onclick = (e) => { if (e.target.closest(".x")) { state.sel = null; pv.hidden = true; drawHL(); markItems(); return; } openDetail(state.sel); };
}

/* ---------- panel ---------- */
function setTab(t) { state.tab = t; state.detail = null; ["events", "inst", "plan"].forEach((k) => $("#t-" + k).setAttribute("aria-selected", k === t));
  document.querySelectorAll("#bnav [data-tab]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.tab === t)); renderPanel(); drawMap(); if (t === "plan") fitRoute(); }
$("#t-events").onclick = () => setTab("events"); $("#t-inst").onclick = () => setTab("inst"); $("#t-plan").onclick = () => setTab("plan");
function fitRoute() { const st = routeStops(), og = routeOrigin(); if (st.length + (og ? 1 : 0) < 2 || !mapReady) return; const b = new maplibregl.LngLatBounds(); st.forEach((e) => b.extend([e.lng, e.lat])); if (og) b.extend([og.lng, og.lat]); map.fitBounds(b, { padding: padding(), maxZoom: 13, duration: 600 }); }
function inView(lng, lat) { if (!state.inView || !mapReady) return true; const a = mapArea(), q = map.project([lng, lat]); return q.x >= a.x0 && q.x <= a.x1 && q.y >= a.y0 && q.y <= a.y1; }
let listTimer = null; function scheduleList() { clearTimeout(listTimer); listTimer = setTimeout(() => { if (!state.detail && state.tab !== "plan") renderPanel(); }, 80); }
function counts() { $("#n-events").textContent = E.filter(evMatch).length; $("#n-inst").textContent = SHOW.filter(instMatch).length; $("#n-plan").textContent = favs.size; $("#bn-plan").textContent = favs.size; $("#bn-plan").hidden = !favs.size; }
function datetile(ev) {
  // Running now: "THRU 31 OCT". One night: "OCT 31 1 night". Upcoming: "NOV 27 opens".
  const live = ev.s <= TODAY && ev.e >= TODAY && ev.s !== ev.e;
  const [, m, d] = (live ? ev.e : ev.s).split("-").map(Number);
  const top = live ? "thru" : M[m - 1];
  const bottom = live ? M[m - 1] : ev.s === ev.e ? (ev.s === TODAY ? "today" : "1 night") : "opens";
  return `<div class="datetile${ev.free ? " free" : ""}${live ? " live" : ""}"><span>${top}</span><b>${d}</b><span>${bottom}</span></div>`;
}
const effStart = (e) => (e.s > TODAY ? e.s : TODAY);
// Photos: the event's own preview image (from its official page) when we have one, otherwise an openly licensed
// stock photo of that kind of event, served from /img/stock. Credits show on the detail page.
const STOCK_BY_SEASON = { halloween: { park: "haunt" }, christmas: { park: "xmaspark", tour: "walk" }, newyear: { family: "nye", parade: "roseparade", show: "nye" }, summer: { park: "zoo" } };
function stockKey(ev) {
  if (ev.sn === "christmas" && ev.t === "parade" && /boat|harbou?r|yacht|marina|bay\b|cruise/i.test(ev.n)) return "boatparade";
  return (STOCK_BY_SEASON[ev.sn] || {})[ev.t] || (STOCK[ev.t] ? ev.t : "");
}
const hashOf = (str) => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
function photoOf(ev, hero) {
  // each type has several stock photos; the event's id picks one, so the same event always gets the same photo
  const k = stockKey(ev), n = k ? hashOf(ev.id) % STOCK[k].length : 0, st = k && STOCK[k][n];
  const stock = k ? `/img/stock/${hero ? "" : "t/"}${k}-${n + 1}.jpg` : "", sc = k && `Photo: ${st.by} · ${st.lic}`;
  if (ev.img) return { src: ev.img, fb: stock, fbc: sc, fbl: k && st.src, credit: "Photo: " + hostOf(ev.u || ev.img), link: ev.u };
  return k ? { src: stock, credit: sc, link: st.src } : null;
}
// Official images live on other sites: fetch them without a referrer, load them lazily, and fall back to the stock photo if one fails
const photoImg = (ph) => `<img class="evimg" src="${esc(ph.src)}"${ph.fb ? ` data-fb="${esc(ph.fb)}" data-fbc="${esc(ph.fbc)}" data-fbl="${esc(ph.fbl)}"` : ""} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
document.addEventListener("load", (e) => { if (e.target instanceof HTMLImageElement && e.target.classList.contains("evimg")) e.target.classList.add("ld"); }, true);
document.addEventListener("error", (e) => {
  const i = e.target;
  if (!(i instanceof HTMLImageElement) || !i.classList.contains("evimg")) return;
  if (i.dataset.fb) {
    i.src = i.dataset.fb; i.removeAttribute("data-fb");
    const c = i.closest(".hero")?.querySelector(".credit"); // the detail header credits the stock photo instead
    if (c) { c.textContent = i.dataset.fbc; if (c.href) c.href = i.dataset.fbl; }
  }
  else i.remove(); // no stock photo either: the emoji underneath shows through
}, true);
// Short "when" label: "Tonight", "Thru Oct 30", "Oct 31 only", "Opens Nov 27"
function whenShort(ev) {
  if (ev.s <= TODAY && ev.e >= TODAY) return ev.e === TODAY ? "Tonight" : "Thru " + fmt(ev.e);
  return ev.s === ev.e ? fmt(ev.s) + " only" : "Opens " + fmt(ev.s);
}
const HEART = `<svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;
function evItem(ev) {
  const f = favs.has(ev.id), k = "e:" + ev.id, now = ev.s <= TODAY, ph = photoOf(ev);
  return `<article class="item ev${state.sel === k ? " sel" : ""}" data-key="${k}"><div class="tile${ev.free ? " free" : ""}">${ph ? photoImg(ph) : ""}<span class="when${now ? " now" : ""}">${whenShort(ev)}</span></div><div class="ibody"><h3>${esc(ev.n)}</h3><div class="meta">${esc(ev.city)} · ${esc(ev.c)} County</div><div class="dates">${range(ev)}</div><div class="tags"><span class="tag ${ev.free ? "free" : "paid"}">${esc(ev.p)}</span><span class="tag ${ev.st === "c" ? "conf" : "exp"}">${ev.st === "c" ? "Confirmed" : "Expected"}</span></div></div><button class="star" type="button" data-fav="${esc(ev.id)}" aria-pressed="${f}" aria-label="${f ? "Remove from" : "Add to"} my night">${HEART}</button></article>`;
}
function instItem(p) {
  const ph = p.photos || [], k = "i:" + p.id;
  return `<article class="item${state.sel === k ? " sel" : ""}" data-key="${esc(k)}"><div class="thumb">${ph.length ? `<img src="${photoUrl(ph[0])}" alt="" loading="lazy">` : ""}</div><div class="ibody"><h3>${esc(p.title)}</h3><div class="meta">${esc(p.biz)} · ${esc(p.city)}</div><div class="tags"><span class="tag ice">Showcased house</span>${ph.length > 1 ? `<span class="tag">${ph.length} photos</span>` : ""}</div></div><span></span></article>`;
}
// Quick picks above the events list; they set the same date and cost filters as the chips
function nextSat() { const [y, m, d] = TODAY.split("-").map(Number), dt = new Date(y, m - 1, d), wd = dt.getDay(); if (wd === 0 || wd === 6) return TODAY; dt.setDate(d + 6 - wd); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }
function quickPicks() {
  const sat = nextSat(), q = [["date", TODAY, "Tonight"], ...(sat !== TODAY ? [["date", sat, "Saturday"]] : []), ["cost", "free", "Free"]];
  return `<div class="quick" role="group" aria-label="Quick picks">${q.map(([f, v, l]) => `<button type="button" data-quick="${f}" data-v="${v}" aria-pressed="${state[f] === v}">${l}</button>`).join("")}</div>`;
}
function renderPanel() {
  counts();
  const head = $("#phead"), body = $("#pbody");
  document.body.classList.toggle("detail-open", !!state.detail);
  if (state.detail) { head.hidden = true; body.innerHTML = detailHtml(state.detail); wireDetail(); return; }
  head.hidden = false;
  const limit = `<label class="toggle"><input type="checkbox" id="inview" ${state.inView ? "checked" : ""}> Limit to map</label>`;
  if (state.tab === "events") {
    const all = E.filter(evMatch).sort((a, b) => effStart(a).localeCompare(effStart(b)) || a.e.localeCompare(b.e) || a.n.localeCompare(b.n));
    const vis = state.layers.events ? all.filter((e) => inView(e.lng, e.lat) || state.sel === "e:" + e.id) : [];
    head.innerHTML = `<div class="hrow"><span><b>${vis.length}</b> ${state.inView ? "in map view" : "events"}${state.date ? " · open " + fmt(state.date) : ""}</span>${limit}</div>${quickPicks()}`;
    body.innerHTML = !state.layers.events ? `<div class="empty">The events layer is off. Turn it on under Layers.</div>`
      : vis.length ? teaser() + `<div class="list">${vis.map(evItem).join("")}</div>`
      : `<div class="empty">No events ${state.inView ? "in this part of the map" : "match these filters"}.<button class="linkbtn" type="button" id="showall">Show all of Southern California</button></div>`;
  } else if (state.tab === "inst") {
    const vis = SHOW.filter(instMatch).filter((p) => inView(p.plng, p.plat) || state.sel === "i:" + p.id);
    head.innerHTML = `<span><b>${vis.length}</b> house${vis.length === 1 ? "" : "s"}${state.inView ? " in view" : ""}</span>${limit}`;
    const sc = SEASONS[state.season].showcase;
    body.innerHTML = `<div class="cta"><h3>${esc(sc.title)}</h3>
      <p style="margin:0;font-size:14px">${esc(sc.pitch)}</p>
      <ul style="margin:0;padding-left:18px;font-size:13.5px;display:grid;gap:3px"><li>Free to post, up to 8 photos</li><li>Only your city is shown, never your address</li><li>Installers: link your website and phone, free advertising all season</li></ul>
      <div class="row"><button class="btn ice" type="button" id="openForm">Showcase a house</button></div></div>`
      + (SHOW.length ? (vis.length ? `<div class="list">${vis.map(instItem).join("")}</div>` : `<div class="empty">No showcased houses in this part of the map.<button class="linkbtn" type="button" id="showall">Show all of Southern California</button></div>`)
        : `<div class="empty">No houses showcased yet. Approved houses appear here with their photos and a blue pin on the map.</div>`);
    $("#openForm").onclick = openForm;
  } else {
    const st = routeStops();
    head.innerHTML = `<span><b>${favs.size}</b> starred</span><label class="toggle">Start from <select id="startFrom" style="border:1px solid var(--line);border-radius:6px;background:var(--bg);padding:2px 4px;max-width:150px"><option value="me" ${state.start === "me" ? "selected" : ""}>My location</option><option value="first" ${state.start === "first" ? "selected" : ""}>First stop</option>${Object.keys(CITY).sort().map((c) => `<option ${c === state.start ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>`;
    $("#startFrom").onchange = (e) => { state.start = e.target.value; if (state.start === "me") locateMe(true); renderPanel(); drawMap(); fitRoute(); };
    if (!st.length) { body.innerHTML = `<div class="empty"><b style="color:var(--ink)">Plan your family's night out</b>Tap the heart on any event to add it. Your stops get a sensible driving order from where you are, a route on the map, and a link for your maps app.</div>`; return; }
    if (state.start === "me") locateMe(false);
    let html = "", prev = routeOrigin(), total = 0;
    if (state.start === "me") html += `<div class="meta" style="padding:0 0 4px 2px">${state.me ? "📍 Starting from your location" : state.meErr ? esc(state.meErr) : "Finding your location…"}</div>`;
    st.forEach((ev) => { if (prev) { const m = miles(prev, ev) * 1.3; total += m; html += `<div class="meta leg">↓ about ${Math.round(m)} mi · ~${Math.max(5, Math.round(m * 1.6))} min</div>`; } html += evItem(ev); prev = ev; });
    // With "My location" we leave out the starting point, so the maps app starts from wherever the phone is right now.
    const pts = st.map(destOf), og = routeOrigin();
    const origin = state.start === "me" ? "" : og ? og.lat + "," + og.lng : pts[0];
    const url = navUrl(origin && !og ? pts.slice(1) : pts, origin);
    const nights = st.filter((e) => e.s === e.e).map((e) => fmt(e.s));
    body.innerHTML = `<div class="list">${html}</div><div class="row" style="margin-top:14px"><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Open route in ${MAPS[mapsApp]} ↗</a><span class="meta">About ${Math.round(total)} driving miles (estimate)</span></div>${mapsPicker()}${mapsApp === "apple" && st.length > 1 ? `<p class="meta" style="margin:6px 0 0">Multi-stop routes need iOS 18.4 or later; older iPhones open with the first stop.</p>` : ""}${nights.length ? `<p class="meta">One-night events on your list: ${nights.join(", ")}.</p>` : ""}`;
  }
  const iv = $("#inview"); if (iv) iv.onchange = (e) => { state.inView = e.target.checked; renderPanel(); };
  body.querySelectorAll("[data-goseason]").forEach((b) => (b.onclick = () => { setSeason(b.dataset.goseason); $("#pbody").scrollTop = 0; }));
  const sa = $("#showall"); if (sa) sa.onclick = () => { state.city = ""; applyFilters(); fitSoCal(true); };
}
$("#pbody").addEventListener("click", (e) => {
  const mp = e.target.closest("[data-maps]"); if (mp) { e.stopPropagation(); setMapsApp(mp.dataset.maps); return; }
  const f = e.target.closest("[data-fav]");
  if (f) { e.stopPropagation(); const id = f.dataset.fav; favs.has(id) ? favs.delete(id) : favs.add(id); saveFavs(); renderPanel(); drawMap(); return; }
  const it = e.target.closest(".item"); if (it && !e.target.closest("button,a,input,select")) selectKey(it.dataset.key, "list");
});
$("#phead").addEventListener("click", (e) => {
  const b = e.target.closest("[data-quick]"); if (!b) return;
  const f = b.dataset.quick, v = b.dataset.v;
  if (f === "date") state.date = state.date === v ? "" : v; else state.cost = state.cost === v ? "all" : v;
  applyFilters();
});
$("#pbody").addEventListener("mouseover", (e) => { const it = e.target.closest(".item"); setHot(it ? it.dataset.key : null); });
$("#pbody").addEventListener("mouseleave", () => setHot(null));
function markItems() { document.querySelectorAll(".item").forEach((el) => el.classList.toggle("sel", el.dataset.key === state.sel)); }

function openDetail(k) { state.detail = k; state.sel = k; renderPanel(); renderPreview(); $("#pbody").scrollTop = 0; if (isPhone()) setSheet("full"); drawHL(); }
function detailHtml(k) {
  const it = findKey(k); if (!it) return "";
  if (it.kind === "ev") {
    const ev = it.ev, f = favs.has(ev.id), url = safeUrl(ev.u), ph = photoOf(ev, true), cl = ph && safeUrl(ph.link);
    return `<div class="detail">
    <div class="hero${ev.free ? " free" : ""}${ph ? " photo" : ""}">${ph ? photoImg(ph) : ""}<button class="back" type="button" id="back" aria-label="Back to results"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
      ${ph ? (cl ? `<a class="credit" href="${esc(cl)}" target="_blank" rel="noopener">${esc(ph.credit)}</a>` : `<span class="credit">${esc(ph.credit)}</span>`) : ""}
      <div class="htext"><div class="kicker">${esc(TYPE_SHORT[ev.t] || "Event")} · ${esc(ev.city)}</div><h2>${esc(ev.n)}</h2></div></div>
    <div class="tags"><span class="tag ${ev.st === "c" ? "conf" : "exp"}">${ev.st === "c" ? "Dates confirmed" : "Expected from past years · check site"}</span><span class="tag">${esc(ev.c)} County</span></div>
    <div class="boxes"><div><span>When</span><b>${whenShort(ev)}</b></div><div><span>Hours</span><b>${esc(ev.h)}</b></div><div><span>Cost</span><b>${esc(ev.p)}</b></div></div>
    <p class="blurb">${esc(ev.b)}</p>
    <dl class="facts">${ev.v || ev.a ? `<dt>Where</dt><dd>${esc(ev.v)}${ev.v && ev.a && !ev.a.startsWith(ev.v) ? "<br>" : ""}${ev.a && !ev.a.startsWith(ev.v) ? `<span class="meta">${esc(ev.a)}</span>` : ""}</dd>` : ""}<dt>Dates</dt><dd class="dates">${range(ev)}</dd></dl>
    ${mapsPicker()}
    ${ev.st !== "c" ? `<p class="meta">These dates follow last year's schedule. Check the event link before you go.</p>` : ""}
    <div class="actionbar"><button class="abtn" type="button" data-fav="${esc(ev.id)}" aria-pressed="${f}" aria-label="${f ? "Remove from" : "Add to"} my night" title="${f ? "In my night" : "Add to my night"}">${HEART}</button>${url ? `<a class="abtn" href="${esc(infoUrl(url, ev.n))}" target="_blank" rel="noopener" aria-label="Event info" title="Event info"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg></a>` : ""}<a class="btn go" href="${esc(dirUrl(ev))}" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3 3 10.5l7.5 3L13.5 21z"/></svg>Directions</a></div></div>`;
  }
  const p = it.p, ph = p.photos || [], web = safeUrl(p.web || "");
  return `<div class="detail"><button class="back plain" type="button" id="back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>Back to results</button>
  ${ph.length ? `<div class="gallery"><div class="track" id="track">${ph.map((key, i) => `<div class="slide"><img src="${photoUrl(key)}" alt="${esc(p.title)}, photo ${i + 1} of ${ph.length}" loading="${i ? "lazy" : "eager"}"></div>`).join("")}</div>${ph.length > 1 ? `<button class="nav l" type="button" data-g="-1" aria-label="Previous photo">‹</button><button class="nav r" type="button" data-g="1" aria-label="Next photo">›</button><span class="count" id="gcount">1 / ${ph.length}</span>` : ""}</div>` : `<div class="gallery"><div class="ph-none">No photos yet</div></div>`}
  <span class="tag ice" style="justify-self:start">Showcased house</span>
  <h2>${esc(p.title)}</h2><div class="meta"><b style="color:var(--ink)">${esc(p.biz)}</b> · ${esc(p.city)}</div>
  <p style="margin:0;white-space:pre-line">${esc(p.desc)}</p>
  <dl class="facts">${p.where ? `<dt>See it</dt><dd>${esc(p.where)}</dd>` : ""}${p.phone ? `<dt>Quotes</dt><dd style="user-select:all">${esc(p.phone)}</dd>` : ""}${web ? `<dt>Web</dt><dd><a href="${esc(web)}" target="_blank" rel="noopener">${esc(web.replace(/^https?:\/\//, "").replace(/\/$/, ""))} ↗</a></dd>` : ""}</dl></div>`;
}
function wireDetail() {
  $("#back").onclick = () => { state.detail = null; renderPanel(); renderPreview(); };
  const tr = $("#track"); if (tr) { const n = tr.children.length;
    document.querySelectorAll(".gallery .nav").forEach((b) => (b.onclick = () => tr.scrollBy({ left: tr.clientWidth * Number(b.dataset.g), behavior: "smooth" })));
    tr.onscroll = () => { const c = $("#gcount"); if (c) c.textContent = Math.round(tr.scrollLeft / tr.clientWidth) + 1 + " / " + n; }; }
}

/* ---------- Showcase a House form ---------- */
let pending = [], tsWidget = null;
function loadTurnstile() {
  if (!CONFIG.turnstileSiteKey) return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((res) => { const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = () => res(window.turnstile); s.onerror = () => res(null); document.head.appendChild(s); });
}
function openForm() {
  pending = []; const m = $("#modal");
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="fh"><div class="row" style="justify-content:space-between"><h2 id="fh">Showcase a House</h2><button class="btn ghost" type="button" id="fClose">Close</button></div>
  <form class="f" id="instForm" novalidate>
    <div class="two"><label for="fBiz">Your name or business<input id="fBiz" name="biz" maxlength="80" required autocomplete="organization" placeholder="e.g. The Garcia family, or Glow Pros"></label><label for="fTitle">Display name<input id="fTitle" name="title" maxlength="90" required placeholder="e.g. Music-synced rooftop show"></label></div>
    <div class="two"><label for="fCity">City<select id="fCity" name="city" required><option value="">Choose a city</option>${Object.keys(CITY).sort().map((c) => `<option>${esc(c)}</option>`).join("")}</select></label><label for="fEmail">Your email <span class="hint">private, only the site owner sees it</span><input id="fEmail" name="email" type="email" maxlength="120" required autocomplete="email"></label></div>
    <div class="two"><label for="fWeb">Website <span class="hint">optional</span><input id="fWeb" name="web" type="url" maxlength="200" placeholder="https://"></label><label for="fPhone">Phone for quotes <span class="hint">installers, optional, shown publicly</span><input id="fPhone" name="phone" maxlength="80"></label></div>
    <label for="fSeason">Season<select id="fSeason" name="season">${Object.entries(SEASONS).map(([k, v]) => `<option value="${k}" ${k === state.season ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></label>
    <label for="fWhere">Where to see it <span class="hint">optional. Public spots only, never a client's street address. The map shows the city only.</span><input id="fWhere" name="where" maxlength="120" placeholder="e.g. Visible from Main St on weekend nights"></label>
    <label for="fDesc">About this house<textarea id="fDesc" name="desc" maxlength="1200" required placeholder="What you installed, how many lights, what makes it special"></textarea></label>
    <div class="drop" id="drop"><div><b style="color:var(--ink)">Photos</b> · up to 8. The first one is the cover.</div><div class="thumbs" id="thumbs"></div><div><label class="btn ghost" for="fPhotos" style="display:inline-flex">Choose photos</label><input id="fPhotos" type="file" accept="image/*" multiple hidden></div><div class="meta">Photos are resized on your device before upload. You can also drag them here.</div></div>
    <div id="ts"></div>
    <div class="row"><button class="btn ice" type="submit" id="fSubmit">Send for review</button><span class="msg" id="fMsg" role="status"></span></div>
  </form></div>`;
  m.hidden = false; $("#fBiz").focus();
  $("#fClose").onclick = closeForm; m.onclick = (e) => { if (e.target === m) closeForm(); };
  $("#fPhotos").onchange = (e) => { const files = [...e.target.files]; e.target.value = ""; addFiles(files); };
  const d = $("#drop"); d.ondragover = (e) => { e.preventDefault(); d.classList.add("over"); }; d.ondragleave = () => d.classList.remove("over"); d.ondrop = (e) => { e.preventDefault(); d.classList.remove("over"); addFiles([...e.dataTransfer.files]); };
  $("#instForm").onsubmit = submitForm;
  tsWidget = null; loadTurnstile().then((ts) => { if (ts && $("#ts")) tsWidget = ts.render("#ts", { sitekey: CONFIG.turnstileSiteKey }); });
}
function closeForm() { pending.forEach((p) => URL.revokeObjectURL(p.url)); pending = []; $("#modal").hidden = true; $("#modal").innerHTML = ""; }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#modal").hidden) closeForm(); else if (!$("#pop").hidden) closePop(); } });
async function shrink(file) {
  // Resize to at most 1600px on the long side and re-encode as JPEG
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.82));
}
async function addFiles(list) {
  const msg = $("#fMsg"); msg.className = "msg"; msg.textContent = "";
  for (const f of list) {
    if (pending.length >= 8) { msg.className = "msg err"; msg.textContent = "That's the limit of 8 photos."; break; }
    if (!f.type.startsWith("image/")) { msg.className = "msg err"; msg.textContent = "Skipped a file that isn't a photo."; continue; }
    try { const b = await shrink(f); pending.push({ blob: b, url: URL.createObjectURL(b) }); }
    catch { msg.className = "msg err"; msg.textContent = "One photo couldn't be read. Try a JPG or PNG."; }
    drawThumbs();
  }
}
function drawThumbs() {
  const t = $("#thumbs"); if (!t) return;
  t.innerHTML = pending.map((p, i) => `<div class="t"><img src="${p.url}" alt="Photo ${i + 1}"><button type="button" data-rmph="${i}" aria-label="Remove photo ${i + 1}">×</button>${i === 0 ? `<span class="cover">COVER</span>` : ""}</div>`).join("");
  t.querySelectorAll("[data-rmph]").forEach((b) => (b.onclick = () => { const i = +b.dataset.rmph; URL.revokeObjectURL(pending[i].url); pending.splice(i, 1); drawThumbs(); }));
}
let busy = false;
async function submitForm(e) {
  e.preventDefault(); if (busy) return;
  const m = $("#fMsg"), f = e.target;
  const need = ["biz", "title", "city", "email", "desc"].filter((n) => !f.elements[n].value.trim());
  if (need.length) { m.className = "msg err"; m.textContent = "Fill in your name or business, display name, city, your email and description."; return; }
  const fd = new FormData(f);
  pending.forEach((p, i) => fd.append("photos", p.blob, `photo-${i + 1}.jpg`));
  if (window.turnstile && tsWidget != null) fd.append("cf-turnstile-response", window.turnstile.getResponse(tsWidget) || "");
  busy = true; $("#fSubmit").disabled = true; m.className = "msg"; m.textContent = pending.length ? `Uploading ${pending.length} photo${pending.length > 1 ? "s" : ""}…` : "Sending…";
  try {
    const r = await fetch("/api/submit", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Couldn't send that. Try again in a moment.");
    $("#modal .card").innerHTML = `<div class="done"><h2>Thanks! Your house is in review.</h2><p class="meta">The site owner will look it over and publish it to the map. They may email you with questions.</p><div class="row" style="justify-content:center"><button class="btn" type="button" id="fDone">Back to the map</button></div></div>`;
    $("#fDone").onclick = closeForm;
  } catch (err) {
    m.className = "msg err"; m.textContent = err.message;
    if (window.turnstile && tsWidget != null) window.turnstile.reset(tsWidget);
  }
  busy = false; const b = $("#fSubmit"); if (b) b.disabled = false;
}

/* ---------- filter popovers ---------- */
let popFor = null;
function closePop() { $("#pop").hidden = true; popFor = null; }
document.addEventListener("click", (e) => { const p = $("#pop"); if (!p.hidden && !p.contains(e.target) && !e.target.closest("[data-pop]")) closePop(); });
$("#chips").addEventListener("click", (e) => { const c = e.target.closest("[data-pop]"); if (!c) return; if (popFor === c.dataset.pop) { closePop(); return; } openPop(c); });
$("#c-conf").onclick = () => { state.conf = !state.conf; applyFilters(); };
function setCity(n) {
  state.city = n; applyFilters(); const c = CITY_OPTS[n]; if (!c || !mapReady) return;
  const dLat = state.radius / 69, dLng = state.radius / (69 * Math.cos(c[0] * Math.PI / 180));
  map.fitBounds([[c[1] - dLng, c[0] - dLat], [c[1] + dLng, c[0] + dLat]], { padding: padding(), duration: 600 });
}
function openPop(chip) {
  const k = chip.dataset.pop, p = $("#pop"); popFor = k; let h = "";
  if (k === "date") { const S = SEASONS[state.season]; h = `<h4>Open on</h4><input type="date" id="pDate" min="${S.dateRange[0]}" max="${S.dateRange[1]}" value="${state.date}">${S.quickDates.filter(([d]) => d >= TODAY).map(([d, l]) => `<button class="linkbtn" data-d="${d}">${esc(l)}</button>`).join("")}<button class="linkbtn" data-d="${TODAY}">Today</button><button class="linkbtn" data-d="">Any date</button>`; }
  if (k === "city") h = `<h4>Near a city</h4><input type="search" id="pCityQ" placeholder="Type a city" aria-label="Find a city"><div class="citylist" id="pCityList"></div><h4>Within</h4><div class="seg">${[5, 10, 25].map((r) => `<button type="button" data-rad="${r}" class="${state.radius === r ? "on" : ""}">${r} mi</button>`).join("")}</div><button class="linkbtn" id="pAnyCity">Any city</button>`;
  if (k === "county") h = `<h4>Counties</h4>${COUNTIES.map((c) => `<label class="opt"><input type="checkbox" value="${c}" ${state.counties.has(c) ? "checked" : ""}> ${c}</label>`).join("")}<button class="linkbtn" id="pAllC">All counties</button>`;
  if (k === "cost") h = `<h4>Cost</h4><div class="seg">${[["all", "All"], ["free", "Free"], ["paid", "Ticketed"]].map(([v, l]) => `<button type="button" data-cost="${v}" class="${state.cost === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  if (k === "type") h = `<h4>Type</h4><label class="opt"><input type="radio" name="pt" value="" ${!state.type ? "checked" : ""}> All types</label>${Object.entries(SEASONS[state.season].types).map(([v, l]) => `<label class="opt"><input type="radio" name="pt" value="${v}" ${state.type === v ? "checked" : ""}> ${esc(l)}</label>`).join("")}`;
  if (k === "layers") h = `<h4>Show on map</h4><label class="opt"><input type="checkbox" id="lEv" ${state.layers.events ? "checked" : ""}> <span class="tag paid">●</span> Events</label><label class="opt"><input type="checkbox" id="lIn" ${state.layers.inst ? "checked" : ""}> <span class="tag ice">●</span> Showcased houses</label>`;
  p.innerHTML = h; p.hidden = false;
  const r = chip.getBoundingClientRect(), pw = p.offsetWidth; p.style.top = r.bottom + 6 + "px"; p.style.left = Math.max(12, Math.min(r.left, innerWidth - pw - 12)) + "px";
  p.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => { state.date = b.dataset.d; applyFilters(); closePop(); }));
  const pd = $("#pDate"); if (pd) pd.onchange = (e) => { state.date = e.target.value; applyFilters(); };
  const cq = $("#pCityQ");
  if (cq) {
    const draw = () => {
      const v = cq.value.trim().toLowerCase(), L = $("#pCityList");
      L.innerHTML = Object.keys(CITY_OPTS).sort().filter((n) => !v || n.toLowerCase().includes(v)).map((n) => `<button type="button" class="linkbtn" data-city="${esc(n)}" style="${n === state.city ? "color:var(--ink)" : ""}">${esc(n)}</button>`).join("") || `<span class="meta">No matching city</span>`;
      L.querySelectorAll("[data-city]").forEach((b) => (b.onclick = () => { setCity(b.dataset.city); closePop(); }));
    };
    cq.oninput = draw; draw(); if (!isPhone()) cq.focus();
  }
  p.querySelectorAll("[data-rad]").forEach((b) => (b.onclick = () => { state.radius = +b.dataset.rad; p.querySelectorAll("[data-rad]").forEach((x) => x.classList.toggle("on", x === b)); state.city ? setCity(state.city) : applyFilters(); }));
  const anyc = $("#pAnyCity"); if (anyc) anyc.onclick = () => { state.city = ""; applyFilters(); closePop(); fitSoCal(true); };
  p.querySelectorAll("input[type=checkbox][value]").forEach((cb) => (cb.onchange = () => { cb.checked ? state.counties.add(cb.value) : state.counties.delete(cb.value); applyFilters(); }));
  const ac = $("#pAllC"); if (ac) ac.onclick = () => { state.counties.clear(); applyFilters(); closePop(); };
  p.querySelectorAll("[data-cost]").forEach((b) => (b.onclick = () => { state.cost = b.dataset.cost; applyFilters(); closePop(); }));
  p.querySelectorAll("input[name=pt]").forEach((r) => (r.onchange = () => { state.type = r.value; applyFilters(); closePop(); }));
  const le = $("#lEv"), li = $("#lIn"); if (le) le.onchange = () => { state.layers.events = le.checked; applyFilters(); }; if (li) li.onchange = () => { state.layers.inst = li.checked; applyFilters(); };
}
// "Coming up next" card at the top of the events list, or a way back to what's on now
function teaser() {
  if (state.season !== NOW_SEASON) {
    return `<button class="teaser now" type="button" data-goseason="${NOW_SEASON}" style="--tc:var(--s-${NOW_SEASON})"><span>On now</span><b>${esc(SEASONS[NOW_SEASON].label)}</b><i>→</i></button>`;
  }
  const next = seasonsFrom(NOW_SEASON)[1]; if (!next) return "";
  const n = E.filter((e) => e.sn === next && e.e >= TODAY).length;
  return `<button class="teaser" type="button" data-goseason="${next}" style="--tc:var(--s-${next})"><span>Coming up · from ${fmt(seasonStarts(next, TODAY))}</span><b>${esc(SEASONS[next].label)}</b><em>${n} event${n === 1 ? "" : "s"} already on the map</em><i>→</i></button>`;
}
function renderSeasonBar() {
  const bar = $("#seasonbar"); if (!bar) return;
  bar.innerHTML = seasonsFrom(NOW_SEASON).map((k) => `<button type="button" role="tab" data-season="${k}" aria-selected="${k === state.season}"${k === NOW_SEASON ? ' class="now" title="On now"' : ""}>${esc(SEASONS[k].short)}</button>`).join("");
  bar.querySelectorAll("[data-season]").forEach((b) => (b.onclick = () => setSeason(b.dataset.season)));
  document.documentElement.dataset.season = state.season;
  repaintMap();
}
function repaintMap() {
  if (!mapReady || !map.getLayer("clusters")) return;
  const C = mapColors();
  map.setPaintProperty("clusters", "circle-color", C.season);
  map.setPaintProperty("pt", "circle-color", catColor(C));
  map.setPaintProperty("hl", "circle-color", catColor(C));
}
// Day / night toggle
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("socal-theme", t); } catch {}
  const b = $("#themebtn"), night = t === "dark";
  b.setAttribute("aria-label", night ? "Switch to day mode" : "Switch to night mode"); b.title = night ? "Day mode" : "Night mode";
  document.querySelector('meta[name="theme-color"]').content = night ? "#0b0d12" : "#f6f4f0";
  map.setStyle(MAP_STYLES[t], { diff: false });
}
$("#themebtn").onclick = () => setTheme(theme() === "dark" ? "light" : "dark");
if (theme() === "dark") { $("#themebtn").setAttribute("aria-label", "Switch to day mode"); $("#themebtn").title = "Day mode"; document.querySelector('meta[name="theme-color"]').content = "#0b0d12"; }
function setSeason(k) {
  if (!SEASONS[k] || k === state.season) return;
  state.season = k; state.type = ""; state.date = ""; state.sel = null; state.detail = null;
  try { history.replaceState(null, "", "#" + k); } catch {}
  renderSeasonBar(); applyFilters(); if (mapReady) fitSoCal(true);
}
function applyFilters() {
  $("#c-date").textContent = state.date ? "Open " + fmt(state.date) : "Any date";
  $("#c-city").textContent = state.city ? "Near " + state.city + (state.radius !== 10 ? ` (${state.radius} mi)` : "") : "Any city";
  $("#c-county").textContent = state.counties.size === 0 ? "All counties" : state.counties.size === 1 ? [...state.counties][0] : state.counties.size + " counties";
  $("#c-cost").textContent = { all: "Free or ticketed", free: "Free only", paid: "Ticketed only" }[state.cost];
  $("#c-type").textContent = state.type ? TYPE_SHORT[state.type] : "All types";
  document.querySelector('[data-pop="date"]').classList.toggle("on", !!state.date);
  document.querySelector('[data-pop="city"]').classList.toggle("on", !!state.city);
  document.querySelector('[data-pop="county"]').classList.toggle("on", state.counties.size > 0);
  document.querySelector('[data-pop="cost"]').classList.toggle("on", state.cost !== "all");
  document.querySelector('[data-pop="type"]').classList.toggle("on", !!state.type);
  $("#c-conf").classList.toggle("on", state.conf);
  const nf = [state.date, state.city, state.counties.size, state.cost !== "all", state.type, state.conf].filter(Boolean).length;
  $("#fcount").textContent = nf; $("#fcount").hidden = !nf;
  state.detail = null; renderPanel(); drawMap(); renderPreview();
}
// Phone: the filter chips sit behind the filter button in the search bar (desktop always shows them)
$("#fbtn").onclick = () => { const open = !document.querySelector(".topbar").classList.contains("fopen"); document.querySelector(".topbar").classList.toggle("fopen", open); $("#fbtn").setAttribute("aria-expanded", open); if (!open) closePop(); };
// Phone: the floating tab bar drives the same three tabs as the panel
document.querySelectorAll("#bnav [data-tab]").forEach((b) => (b.onclick = () => $("#t-" + b.dataset.tab).click()));
// the phone's search box shares its row with the logo and night-mode button, so keep the hint short enough to fit
const fitHint = () => { $("#q").placeholder = innerWidth > 860 ? "Search events or a city" : innerWidth > 380 ? "Search events" : "Search"; };
fitHint(); addEventListener("resize", fitHint);
let qT; $("#q").oninput = (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 120); };

/* ---------- bottom sheet (phone) ---------- */
// Collapsed sheet height on phones: just the grab handle and the quick-picks row, sitting above the tab bar
// (tab bar 58px + 12px gap, handle ~19px, header row ~48px, a little air); the card row tucks behind the tab bar
// (plus the home-indicator strip on newer iPhones, which the tab bar sits above)
const PEEK = 160;
let safeBottom = null;
function peekH() {
  if (safeBottom === null) { const t = document.createElement("div"); t.style.cssText = "position:fixed;visibility:hidden;height:env(safe-area-inset-bottom,0px)"; document.body.appendChild(t); safeBottom = t.offsetHeight; t.remove(); }
  return PEEK + safeBottom;
}
let sheetState = "peek";
// "cards" stop: just tall enough to show the whole sideways card row above the tab bar.
// Measured from the card row itself while it's showing; the fallback covers the first call before the list renders.
let cardsCache = 0;
function cardsH() {
  const panel = $("#panel"), item = panel.classList.contains("peek") && panel.querySelector(".list .item");
  if (item) cardsCache = Math.round(item.getBoundingClientRect().bottom - panel.getBoundingClientRect().top + (innerHeight - $("#bnav").getBoundingClientRect().top) + 16);
  return cardsCache || peekH() + 150;
}
// Half stop sits just above the middle of the screen (and clear of the cards stop on short phones), so it shows the vertical list
const HALF = 0.55;
function stopH(s) { const ph = $("#panel").offsetHeight || innerHeight * 0.8; return Math.min(ph, s === "peek" ? peekH() : s === "cards" ? cardsH() : s === "half" ? Math.max(Math.round(innerHeight * HALF), cardsCache + 60) : ph); }
function sheetVisible() { return isPhone() ? stopH(sheetState) : 0; }
// Below the middle of the screen (or the cards stop, on very short screens) the list is a sideways row of cards over the map;
// past that it becomes the vertical scrolling list
function setRowLayout(vis) {
  const panel = $("#panel"), row = isPhone() && vis < Math.max(innerHeight * 0.5, cardsCache + 20);
  if (row === panel.classList.contains("peek")) return;
  panel.classList.toggle("peek", row);
  $("#pbody").scrollTop = 0; // the card row can't be scrolled vertically, and the list should start at the top
}
function setSheet(s) {
  sheetState = s; const panel = $("#panel");
  setRowLayout(sheetVisible());
  if (!isPhone()) { panel.style.removeProperty("--sheet-y"); return; }
  panel.style.setProperty("--sheet-y", panel.offsetHeight - sheetVisible() + "px");
  document.documentElement.style.setProperty("--peek", sheetVisible() + "px");
}
// Drag the sheet from its top (handle, tabs, header) or from the list itself:
// swiping up on a list that isn't full height expands the sheet; swiping down at the top of the list collapses it.
(function () {
  const panel = $("#panel"), body = $("#pbody"), g = $("#grab");
  const d = { y0: null, start: 0, moved: false, justDragged: false };
  const NEXT = { peek: "cards", cards: "half", half: "full", full: "peek" }; // tapping the handle steps up through the stops
  const clampY = (y) => Math.max(0, Math.min(panel.offsetHeight - 80, y));
  function begin(y) { d.y0 = y; d.start = panel.offsetHeight - sheetVisible(); d.moved = false; }
  function move(y) {
    if (d.y0 === null) return false;
    const dy = y - d.y0;
    if (!d.moved) { if (Math.abs(dy) < 6) return false; d.moved = true; panel.classList.add("dragging"); }
    const y1 = clampY(d.start + dy);
    panel.style.setProperty("--sheet-y", y1 + "px");
    setRowLayout(panel.offsetHeight - y1); // switch between card row and list live as the sheet crosses the middle
    return true;
  }
  function end(y) {
    if (d.y0 === null) return false;
    const dy = y - d.y0, moved = d.moved; d.y0 = null; panel.classList.remove("dragging");
    if (!moved) return false;
    const vis = panel.offsetHeight - clampY(d.start + dy);
    const opts = ["peek", "cards", "half", "full"].map((s) => [s, stopH(s)]);
    let pick;
    if (dy < -40) pick = opts.find((o) => o[1] >= vis - 1) || opts[opts.length - 1]; // flicked up: next stop above
    else if (dy > 40) pick = [...opts].reverse().find((o) => o[1] <= vis + 1) || opts[0]; // flicked down: next stop below
    else pick = [...opts].sort((a, b) => Math.abs(a[1] - vis) - Math.abs(b[1] - vis))[0];
    setSheet(pick[0]); scheduleList();
    d.justDragged = true; setTimeout(() => (d.justDragged = false), 50);
    return true;
  }

  // Top of the sheet: pointer events (works for touch and mouse)
  for (const zone of [g, document.querySelector(".ptabs"), $("#phead")]) {
    zone.addEventListener("pointerdown", (e) => { if (!isPhone() || e.button > 0) return; begin(e.clientY); zone._pid = e.pointerId; });
    zone.addEventListener("pointermove", (e) => { if (move(e.clientY) && !zone.hasPointerCapture(e.pointerId)) zone.setPointerCapture(e.pointerId); });
    const up = (e) => { const wasTap = !end(e.clientY); if (wasTap && zone === g && e.type === "pointerup") setSheet(NEXT[sheetState]); };
    zone.addEventListener("pointerup", up); zone.addEventListener("pointercancel", up);
    zone.addEventListener("click", (e) => { if (d.justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  // The list: touch events, so normal scrolling still works when the sheet is full
  let mode = null;
  let x0 = 0;
  body.addEventListener("touchstart", (e) => { if (!isPhone() || e.touches.length > 1) return; mode = null; x0 = e.touches[0].clientX; begin(e.touches[0].clientY); }, { passive: true });
  body.addEventListener("touchmove", (e) => {
    if (d.y0 === null || mode === "scroll") return;
    const y = e.touches[0].clientY, dy = y - d.y0, dx = e.touches[0].clientX - x0;
    if (!mode) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      // sideways swipe through the card row scrolls the cards, not the sheet
      if (Math.abs(dx) > Math.abs(dy)) { mode = "scroll"; d.y0 = null; return; }
      mode = (sheetState !== "full" && dy < 0) || (body.scrollTop <= 0 && dy > 0) ? "sheet" : "scroll";
      if (mode === "scroll") { d.y0 = null; return; }
    }
    e.preventDefault(); move(y);
  }, { passive: false });
  const tend = (e) => { if (mode === "sheet") end(e.changedTouches[0].clientY); else d.y0 = null; mode = null; };
  body.addEventListener("touchend", tend); body.addEventListener("touchcancel", tend);

  g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSheet(NEXT[sheetState]); } });
  document.querySelectorAll(".ptab").forEach((t) => t.addEventListener("click", () => { if (isPhone() && sheetState === "peek") setSheet("half"); }));
})();

/* ---------- boot ---------- */
async function load() {
  try {
    const [ev, posts, cfg] = await Promise.all([fetch("/api/events").then((r) => r.json()), fetch("/api/posts").then((r) => r.json()), fetch("/api/config").then((r) => r.json()).catch(() => ({}))]);
    E = Array.isArray(ev) ? ev : []; SHOW = Array.isArray(posts) ? posts : []; CONFIG = cfg || {};
    E.forEach((e) => { if (!CITY_OPTS[e.city]) CITY_OPTS[e.city] = [e.lat, e.lng]; });
    placeHouses();
  } catch {
    $("#pbody").innerHTML = `<div class="empty">Events couldn't load. Check your connection and refresh the page.</div>`; return;
  }
  renderSeasonBar(); applyFilters();
  const h = location.hash.slice(1);
  if (SEASONS[h]) setSeason(h);
  if (h === "houses" || h === "showcase") { setTab("inst"); if (h === "showcase") openForm(); }
}
// Keep an open page fresh: when you come back to the tab (or every 15 minutes while it's open),
// quietly reload the event list so newly added events appear without a manual refresh.
let loadedAt = Date.now();
async function refreshData() {
  try {
    const [ev, posts] = await Promise.all([fetch("/api/events", { cache: "no-cache" }).then((r) => r.json()), fetch("/api/posts", { cache: "no-cache" }).then((r) => r.json())]);
    if (!Array.isArray(ev)) return;
    E = ev; if (Array.isArray(posts)) SHOW = posts;
    E.forEach((e) => { if (!CITY_OPTS[e.city]) CITY_OPTS[e.city] = [e.lat, e.lng]; });
    placeHouses(); loadedAt = Date.now();
    if (state.detail) { counts(); drawMap(); } else { renderPanel(); drawMap(); }
  } catch {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - loadedAt > 5 * 60000) refreshData(); });
setInterval(() => { if (document.visibilityState === "visible") refreshData(); }, 15 * 60000);
setSheet("peek");
let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { setSheet(sheetState); renderPanel(); }, 120); });
load();
