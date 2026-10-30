// SoCal Lights Finder — public map app
import { CITY } from "/cities.js";
import { SEASONS, TYPE_SHORT, defaultSeason, seasonsFrom, seasonStarts } from "/seasons.js?v=20261029d";
import { STOCK } from "/stock.js";
import { SITE } from "/site-config.js?v=20261030t";

/* ---------- constants & helpers ---------- */
// Day mode is the default; night mode uses a dark base map. The choice is remembered per device (set in index.html).
const MAP_STYLES = { light: "https://tiles.openfreemap.org/styles/liberty", dark: "/map-dark.json?v=20261030t" };
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
// The store apps add "SoCalLightsApp" to the browser string. Payments for tips and Featured placements are left out there (Apple and Google want in-app purchase for digital goods).
const IN_APP = /SoCalLightsApp/.test(navigator.userAgent);
if (IN_APP) document.documentElement.classList.add("in-app");
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
const state = { season: defaultSeason(TODAY), q: "", date: "", city: "", radius: 10, counties: new Set(), cost: "all", type: "", conf: false, layers: { events: true, inst: true }, tab: "events", sort: "near", shopCat: 0, shopSeason: "", inView: true, sel: null, hot: null, detail: null, start: "me", me: null, meErr: "" };
let favs = new Set(); try { favs = new Set(JSON.parse(localStorage.getItem("socal-favs") || "[]")); } catch {}
const hfav = (p) => "h:" + p.id; // houses are starred as "h:<id>"; events by their plain id
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
// Home displays have no dates or ticket prices, so the date, cost and confirmed filters pass them (they only narrow events);
// a Type other than "Home displays" leaves them out.
function instMatch(p) {
  if ((p.season || "christmas") !== state.season) return false;
  if (state.type && state.type !== "house") return false;
  if (state.cost === "paid") return false;
  if (state.q && !(p.biz + " " + p.title + " " + p.city + " " + p.desc).toLowerCase().includes(state.q)) return false;
  if (state.counties.size && !state.counties.has(p.county)) return false;
  if (!nearCity(p.lat, p.lng)) return false;
  return true;
}
// Houses with a street address sit exactly on it; older posts without one are placed at city level, spread so pins don't stack
function placeHouses() {
  const byCity = {};
  SHOW.forEach((p) => { (byCity[p.city] ||= []).push(p); });
  Object.values(byCity).forEach((list) => list.filter((p) => !p.address).forEach((p, i) => {
    const a = i * 2.4, r = i ? 0.006 * Math.sqrt(i) : 0;
    p.plat = p.lat + r * Math.sin(a); p.plng = p.lng + r * Math.cos(a);
  }));
  SHOW.filter((p) => p.address).forEach((p) => { p.plat = p.lat; p.plng = p.lng; }); // pinned on the street address
}

/* ---------- map ---------- */
const map = new maplibregl.Map({ container: "map", style: MAP_STYLES[theme()], bounds: SOCAL, fitBoundsOptions: { padding: 40 }, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, clickTolerance: 10 }); // clickTolerance: a tap with a little finger wobble still counts as a tap
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false });
map.addControl(geo, "top-right");
// The control only zooms to the (often wide) accuracy circle; fly in close on the user instead
geo.on("geolocate", (e) => map.easeTo({ center: [e.coords.longitude, e.coords.latitude], zoom: Math.max(map.getZoom(), 15), duration: 800 }));

function padding() {
  const ph = isPhone();
  return { top: ph ? 128 : 100, left: 24, right: ph ? 24 : panelW() + 48, bottom: ph ? peekH() + 16 : 24 }; // phones: centre things in the map above the collapsed list, even while the sheet is open
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
    paint: { "circle-color": C.season, "circle-opacity": 0.92, "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 20, 25], "circle-stroke-width": 1, "circle-stroke-color": C.ring } });
  map.addLayer({ id: "cluster-count", type: "symbol", source: "pts", filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13 }, paint: { "text-color": "#ffffff" } });
  map.addLayer({ id: "pt", type: "circle", source: "pts", filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": catColor(C),
      "circle-radius": ["case", ["==", ["get", "feat"], 1], 10, ["==", ["get", "cat"], "inst"], 8, ["==", ["get", "cat"], "fav"], 8, 7],
      "circle-stroke-width": 1, "circle-stroke-color": ["case", ["==", ["get", "feat"], 1], C.fav, C.ring] } });
  map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": C.fav, "line-width": 4, "line-dasharray": [1.5, 1.5] } });
  map.addLayer({ id: "stops", type: "circle", source: "stops", paint: { "circle-color": C.fav, "circle-radius": 12, "circle-stroke-width": 1, "circle-stroke-color": C.ring } });
  map.addLayer({ id: "stops-num", type: "symbol", source: "stops", layout: { "text-field": ["get", "num"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
  map.addLayer({ id: "hl", type: "circle", source: "hl", paint: { "circle-color": catColor(C), "circle-radius": 11, "circle-stroke-width": 1, "circle-stroke-color": C.ring } });
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
  map.on("click", (e) => {
    if (e.defaultPrevented) return;
    const hit = map.queryRenderedFeatures(e.point, { layers: ["pt", "clusters", "stops"] });
    if (hit.length || !state.sel) return;
    // Tapped empty map: deselect (and leave a card's detail if one is open, so the panel matches the map)
    state.sel = null;
    if (state.detail) { state.detail = null; renderPanel(); }
    renderPreview(); drawHL(); markItems();
  });
  map.on("dragstart", () => { state.keep = null; }); map.on("moveend", scheduleList); map.on("move", placePin);
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
    if (state.layers.events) E.filter(evMatch).forEach((e) => feats.push(pt(e.lng, e.lat, { key: "e:" + e.id, cat: favs.has(e.id) ? "fav" : e.free ? "free" : "paid", feat: e.f ? 1 : 0 })));
    if (state.layers.inst) SHOW.filter(instMatch).forEach((p) => feats.push(pt(p.plng, p.plat, { key: "i:" + p.id, cat: favs.has(hfav(p)) ? "fav" : "inst" })));
  }
  map.getSource("pts").setData(fc(feats));
  // planner route
  const st = state.tab === "plan" ? routeStops() : [];
  const og = state.tab === "plan" ? routeOrigin() : null, o = og ? [[og.lng, og.lat]] : [];
  const coords = [...o, ...st.map((e) => [e.lng, e.lat])];
  map.getSource("route").setData(fc(coords.length > 1 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] : []));
  map.getSource("stops").setData(fc(st.map((e, i) => pt(e.lng, e.lat, { key: e.key || "e:" + e.id, num: String(i + 1) }))));
  drawHL();
}
function drawHL() {
  if (!mapReady || !map.getSource("hl")) return;
  const out = [];
  for (const k of new Set([state.sel, state.hot].filter(Boolean))) {
    const it = findKey(k); if (!it) continue;
    if (it.kind === "ev") out.push(pt(it.ev.lng, it.ev.lat, { cat: favs.has(it.ev.id) ? "fav" : it.ev.free ? "free" : "paid", label: it.ev.n }));
    else out.push(pt(it.p.plng, it.p.plat, { cat: favs.has(hfav(it.p)) ? "fav" : "inst", label: it.p.title }));
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
  // starred events plus starred houses (a house becomes a stop with its pin position and street address)
  const fl = [...E.filter((e) => favs.has(e.id)), ...SHOW.filter((p) => favs.has(hfav(p))).map((p) => ({ house: true, id: p.id, key: "i:" + p.id, n: p.title, lat: p.plat, lng: p.plng, a: p.address ? p.address + ", " + p.city + ", CA" : "", p }))];
  if (!fl.length) return [];
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
    const starred = it.kind === "ev" ? favs.has(it.ev.id) : favs.has(hfav(it.p)), want = state.tab === "plan" && starred ? "plan" : "events";
    if (state.tab !== want) setTab(want);
    else if (state.detail) { state.detail = null; renderPanel(); }
    else if (!document.querySelector(`.item[data-key="${CSS.escape(k)}"]`) && !listVis.some((x) => x.key === k)) renderPanel();
  }
  drawHL(); markItems();
  if (from !== "list" && !isPhone()) revealItem(k);
}
// Scroll the results list so this item sits at the top of the visible part of the list, and flash it
function revealItem(k) {
  const body = $("#pbody"); let el = body.querySelector(`.item[data-key="${CSS.escape(k)}"]`);
  if (!el) { const ix = listVis.findIndex((x) => x.key === k); if (ix >= 0) { moreCards(ix + 12); el = body.querySelector(`.item[data-key="${CSS.escape(k)}"]`); } }
  if (!el) return;
  const top = body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 10;
  body.scrollTo({ top: Math.max(0, top), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}
function renderPreview() {
  const pv = $("#preview"), it = findKey(state.sel);
  if (!it || state.detail === state.sel) { pv.hidden = true; document.body.classList.remove("pin-open"); return; }
  const k = state.sel, f = it.kind === "ev" ? favs.has(it.ev.id) : favs.has(hfav(it.p));
  const acts = `<span class="pv-acts"><button type="button" data-pvshare aria-label="Share" title="Share">${SHARE}</button><button type="button" data-pvfav aria-pressed="${f}" aria-label="${f ? "Remove from" : "Add to"} my night" title="${f ? "In my night" : "Add to my night"}">${HEART}</button></span>`;
  if (it.kind === "ev") {
    const ev = it.ev, phs = photosOf(ev), ph = phs[0], conf = ev.st === "c", hrs = hoursOf(ev), manyE = phs.length > 1;
    pv.innerHTML = `<div class="tile pv-photo${ev.free ? " free" : ""}">${manyE ? `<div class="pvtrack" id="pvtrack">${phs.map((q, i) => `<div class="pvslide">${photoImg(q, i < 2)}</div>`).join("")}</div><button class="pvnav l" type="button" data-pvg="-1" aria-label="Previous photo">${ARW_L}</button><button class="pvnav r" type="button" data-pvg="1" aria-label="Next photo">${ARW_R}</button><span class="pvcount" id="pvcount">1 / ${phs.length}</span>` : ph ? photoImg(ph) : ""}<span class="when${ev.s <= TODAY ? " now" : ""}">${whenShort(ev)}</span><button class="x" type="button" aria-label="Close" title="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div><div class="pv-body"><div class="pv-top"><strong>${esc(ev.n)}</strong>${acts}</div><div class="meta">${esc(ev.city)} · ${esc(ev.c)} County</div><div class="dates">${range(ev)}${hrs ? " · " + esc(hrs) : ""}</div><div class="tags">${ev.f ? `<span class="tag feat">Featured</span>` : ""}<span class="tag ${ev.free ? "free" : "paid"}">${esc(priceLine(ev))}</span><span class="tag ${conf ? "conf" : "exp"}">${conf ? "Confirmed" : "Expected"}</span></div></div>`;
  } else {
    const p = it.p, ph = p.photos || [];
    const many = ph.length > 1;
    pv.innerHTML = `<div class="tile pv-photo has-photo">${many ? `<div class="pvtrack" id="pvtrack">${ph.map((k2, i) => `<div class="pvslide"><img class="evimg ld" src="${photoUrl(k2)}" alt="${esc(p.title)}, photo ${i + 1} of ${ph.length}" loading="${i < 2 ? "eager" : "lazy"}" draggable="false"></div>`).join("")}</div><button class="pvnav l" type="button" data-pvg="-1" aria-label="Previous photo"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg></button><button class="pvnav r" type="button" data-pvg="1" aria-label="Next photo"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg></button><span class="pvcount" id="pvcount">1 / ${ph.length}</span>` : ph.length ? `<img class="evimg ld" src="${photoUrl(ph[0])}" alt="">` : ""}<span class="when">Home display</span><button class="x" type="button" aria-label="Close" title="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div><div class="pv-body"><div class="pv-top"><strong>${esc(p.title)}</strong>${acts}</div><div class="meta">${p.kind === "installer" ? "" : "Posted by "}${esc(p.biz)} · ${esc(p.city)}</div><div class="tags"><span class="tag ice">Home display</span>${p.kind === "installer" ? `<span class="tag">Professional installer</span>` : ""}${ph.length > 1 ? `<span class="tag">${ph.length} photos</span>` : ""}</div></div>`;
  }
  pv.hidden = false; document.body.classList.toggle("pin-open", isPhone()); pinBox = null; if (!pinRO && window.ResizeObserver) { pinRO = new ResizeObserver(() => { pinBox = null; placePin(); }); pinRO.observe(pv); } placePin();
  const tr = $("#pvtrack");
  if (tr) tr.addEventListener("scroll", () => { const i = Math.round(tr.scrollLeft / tr.clientWidth); $("#pvcount").textContent = i + 1 + " / " + tr.children.length; }, { passive: true });
  pv.onclick = (e) => {
    const g = e.target.closest("[data-pvg]"); if (g) { e.stopPropagation(); const t = $("#pvtrack"); t.scrollBy({ left: +g.dataset.pvg * t.clientWidth, behavior: "smooth" }); return; }
    // A tap on the photo opens it full size; the text below opens the details
    if (e.target.closest(".pv-photo") && !e.target.closest(".x,.pvnav,.when")) {
      if (pvSwiped) { pvSwiped = false; return; }
      const items = lbItems(it); if (items.length) { const t = $("#pvtrack"); openLightbox(items, t ? Math.round(t.scrollLeft / t.clientWidth) : 0, it.kind === "ev" ? it.ev.n : it.p.title); return; }
    }
    if (e.target.closest(".x")) { closePin(); return; }
    if (e.target.closest("[data-pvshare]")) { shareItem(k); return; }
    if (e.target.closest("[data-pvfav]")) { const id = it.kind === "ev" ? it.ev.id : hfav(it.p); favs.has(id) ? favs.delete(id) : favs.add(id); saveFavs(); renderPanel(); drawMap(); renderPreview(); return; }
    openDetail(k);
  };
}
let pvSwiped = false; // a swipe through the photos must not count as a tap that opens the details
document.addEventListener("touchmove", (e) => { if (e.target.closest && e.target.closest("#pvtrack")) pvSwiped = true; }, { passive: true });
document.addEventListener("touchstart", (e) => { if (e.target.closest && e.target.closest("#pvtrack")) pvSwiped = false; }, { passive: true });
function closePin() { state.sel = null; $("#preview").hidden = true; document.body.classList.remove("pin-open"); drawHL(); markItems(); }
// Desktop: the card sits next to its dot (below it, or above when there is no room) and follows the map as it moves
// The pop-up card is placed next to its dot. Its size is measured once (and when it changes), so moving the map never forces a layout.
let pinBox = null, pinRaf = 0, pinRO = null;
// Desktop: the list can be hidden to give the whole screen to the map (remembered on this device)
const listHidden = () => document.documentElement.classList.contains("list-hidden") && !isPhone();
function panelW() { return listHidden() ? 0 : parseFloat(cssVar("--panel-w")) || 0; }
function setListHidden(v, save = true) {
  document.documentElement.classList.toggle("list-hidden", v);
  const b = $("#panelToggle"); if (b) { b.setAttribute("aria-expanded", String(!v)); b.setAttribute("aria-label", v ? "Show list" : "Hide list"); b.title = v ? "Show list" : "Hide list"; }
  if (save) try { localStorage.setItem("socal-listhidden", v ? "1" : "0"); } catch {}
  pinBox = null; placePin(); if (!v && save) scheduleList();
}
(function initPanelToggle() {
  const b = document.createElement("button"); b.id = "panelToggle"; b.type = "button"; b.className = "ptoggle"; b.setAttribute("aria-controls", "panel");
  b.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>`;
  b.onclick = () => setListHidden(!document.documentElement.classList.contains("list-hidden"));
  document.body.appendChild(b);
  let was = false; try { was = localStorage.getItem("socal-listhidden") === "1"; } catch {}
  setListHidden(was, false);
})();
function measurePin() {
  const pv = $("#preview"); if (pv.hidden) { pinBox = null; return; }
  const c = $("#map").getBoundingClientRect();
  pinBox = { W: pv.offsetWidth, H: pv.offsetHeight, left: c.left, top: c.top, right: innerWidth - panelW() - 30 };
}
function placePin() {
  if (pinRaf) return;
  pinRaf = requestAnimationFrame(() => {
    pinRaf = 0;
    const pv = $("#preview"); if (pv.hidden || !mapReady) return;
    if (isPhone()) { pv.style.transform = ""; return; }
    const it = findKey(state.sel); if (!it) return;
    if (!pinBox) measurePin(); if (!pinBox) return;
    const { W, H, right } = pinBox, [lng, lat] = it.kind === "ev" ? [it.ev.lng, it.ev.lat] : [it.p.plng, it.p.plat], q = map.project([lng, lat]);
    const x0 = pinBox.left + q.x, y0 = pinBox.top + q.y;
    let x = Math.max(14, Math.min(x0 - W / 2, right - W)), y = y0 + 26;
    if (y + H > innerHeight - 14) y = y0 - 26 - H;
    y = Math.max(96, Math.min(y, innerHeight - 14 - H));
    pv.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  });
}
/* ---------- panel ---------- */
function setTab(t) { state.tab = t; state.detail = null; ["events", "plan", "shop"].forEach((k) => $("#t-" + k).setAttribute("aria-selected", k === t));
  document.querySelectorAll("#bnav [data-tab]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.tab === t)); renderPanel(); drawMap(); if (t === "plan") fitRoute();
  for (const id of ["#phead", "#pbody"]) { const el = $(id); el.classList.remove("tabin"); void el.offsetWidth; el.classList.add("tabin"); } }
$("#t-events").onclick = () => setTab("events"); $("#t-shop").onclick = () => setTab("shop"); $("#t-plan").onclick = () => setTab("plan");
function fitRoute() { const st = routeStops(), og = routeOrigin(); if (st.length + (og ? 1 : 0) < 2 || !mapReady) return; const b = new maplibregl.LngLatBounds(); st.forEach((e) => b.extend([e.lng, e.lat])); if (og) b.extend([og.lng, og.lat]); map.fitBounds(b, { padding: padding(), maxZoom: 13, duration: 600 }); }
function inView(lng, lat) { if (!state.inView || !mapReady) return true; const a = mapArea(), q = map.project([lng, lat]); return q.x >= a.x0 && q.x <= a.x1 && q.y >= a.y0 && q.y <= a.y1; }
let listTimer = null; function scheduleList() { clearTimeout(listTimer); listTimer = setTimeout(() => { if (!state.detail && state.tab !== "plan" && state.tab !== "shop") renderPanel({ quiet: true }); }, 80); }
function counts() { $("#n-events").textContent = E.filter(evMatch).length + SHOW.filter(instMatch).length; $("#n-plan").textContent = favs.size; $("#bn-plan").textContent = favs.size; $("#bn-plan").hidden = !favs.size; }
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
const STOCK_BY_SEASON = { halloween: { park: "haunt" }, christmas: { park: "xmaspark", tour: "walk", show: "tree" }, newyear: { family: "nye", parade: "roseparade", show: "nye" }, summer: { park: "zoo" } };
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
// A gallery: the main photo first, then any extra photos stored for the event (ev.imgs)
function photosOf(ev, hero) {
  const first = photoOf(ev, hero), out = first ? [first] : [];
  (ev.imgs || []).forEach((u) => { if (u && u !== ev.img) out.push({ src: u, credit: "Photo: " + hostOf(ev.u || u), link: ev.u }); });
  return out;
}
const ARW_L = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>`;
const ARW_R = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>`;
// Official images live on other sites: fetch them without a referrer, load them lazily, and fall back to the stock photo if one fails
const photoImg = (ph, eager) => `<img class="evimg" src="${esc(ph.src)}"${ph.fb ? ` data-fb="${esc(ph.fb)}" data-fbc="${esc(ph.fbc)}" data-fbl="${esc(ph.fbl)}"` : ""} alt="" loading="${eager ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer">`;
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
const HEART = `<svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;
let toastT;
function toast(msg) {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
}
async function shareItem(k) {
  const it = findKey(k); if (!it) return;
  const title = it.kind === "ev" ? it.ev.n : it.p.title, url = location.origin + "/#" + (it.kind === "ev" ? "e-" + it.ev.id : "h-" + it.p.id);
  try { if (navigator.share) { await navigator.share({ title, text: title + " on SoCal Lights", url }); return; } } catch (err) { if (err && err.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); }
}
const SHARE = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>`;
// "Free", "From $25", or the price text itself
function priceLine(ev) {
  if (ev.free) return "Free";
  const m = String(ev.p || "").match(/\$[\d,.]+/);
  return m ? "From " + m[0] : cut(String(ev.p || "Price not listed"), 24);
}
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const hoursOf = (ev) => (ev.h && !/^check/i.test(ev.h) ? cut(ev.h, 30) : "");
function evItem(ev, i = 99, x = null) {
  const f = favs.has(ev.id), k = "e:" + ev.id, now = ev.s <= TODAY, ph = photoOf(ev), conf = ev.st === "c", hrs = hoursOf(ev);
  // Same layout as the card that opens when you tap a dot on the map
  return `<article class="item ev${state.sel === k ? " sel" : ""}" data-key="${k}"><div class="tile${ev.free ? " free" : ""}">${ph ? photoImg(ph, i < 8) : ""}<span class="when${now ? " now" : ""}">${whenShort(ev)}</span>${x ? `<span class="stopn" title="Stop ${x.n}">${x.n}</span>` : ""}</div><div class="ibody"><div class="pv-top"><h3>${esc(ev.n)}</h3><span class="pv-acts"><button class="shr" type="button" data-share="e:${esc(ev.id)}" aria-label="Share ${esc(ev.n)}" title="Share">${SHARE}</button><button class="star" type="button" data-fav="${esc(ev.id)}" aria-pressed="${f}" aria-label="${f ? "Remove from" : "Add to"} my night">${HEART}</button></span></div><div class="meta">${esc(ev.city)} · ${esc(ev.c)} County</div><div class="dates">${range(ev)}${hrs ? " · " + esc(hrs) : ""}</div>${x ? legLine(x) : ""}<div class="tags">${ev.f ? `<span class="tag feat">Featured</span>` : ""}<span class="tag ${ev.free ? "free" : "paid"}">${esc(priceLine(ev))}</span><span class="tag ${conf ? "conf" : "exp"}">${conf ? "Confirmed" : "Expected"}</span></div></div></article>`;
}
// My night help: three simple steps, which can be folded into a ? button next to the stop count (remembered on this device)
let nightHelp = true; try { nightHelp = localStorage.getItem("socal-nighthelp") !== "0"; } catch {}
function setNightHelp(v) { nightHelp = v; try { localStorage.setItem("socal-nighthelp", v ? "1" : "0"); } catch {} renderPanel(); }
const helpHtml = (n) => `<section class="nhelp" aria-label="How My night works"><div class="nh-top"><b>Plan your night in 3 steps</b><button type="button" class="nh-x" data-nhelp="0" aria-label="Hide these steps" title="Hide"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div><ol><li class="${n ? "is-done" : ""}"><span>${n ? "✓" : "1"}</span><div><b>Tap the heart</b><small>On any place you want to visit.</small></div></li><li class="${n > 1 ? "is-done" : ""}"><span>${n > 1 ? "✓" : "2"}</span><div><b>Check your stops here</b><small>We put them in a sensible driving order.</small></div></li><li><span>3</span><div><b>Tap Open route</b><small>Your maps app takes you there.</small></div></li></ol></section>`;
// My night: the stop number and the drive from the previous stop
const legLine = (x) => `<div class="legline">${x.leg ? `↓ ${x.leg.mi} mi · ~${x.leg.min} min from ${esc(x.leg.from)}` : "Start here"}</div>`;
function instItem(p, x = null) {
  const ph = p.photos || [], k = "i:" + p.id, f = favs.has(hfav(p)), sn = SEASONS[p.season] ? SEASONS[p.season].short : "";
  return `<article class="item home${state.sel === k ? " sel" : ""}" data-key="${esc(k)}"><div class="thumb${ph.length ? " has-photo" : ""}">${ph.length ? `<img src="${photoUrl(ph[0])}" alt="">` : ""}<span class="when">Home display</span>${x ? `<span class="stopn" title="Stop ${x.n}">${x.n}</span>` : ""}</div><div class="ibody"><div class="pv-top"><h3>${esc(p.title)}</h3><span class="pv-acts"><button class="shr" type="button" data-share="${esc(k)}" aria-label="Share ${esc(p.title)}" title="Share">${SHARE}</button><button class="star" type="button" data-fav="${esc(hfav(p))}" aria-pressed="${f}" aria-label="${f ? "Remove from" : "Add to"} my night">${HEART}</button></span></div><div class="meta">${p.kind === "installer" ? "" : "Posted by "}${esc(p.biz)} · ${esc(p.city)}</div><div class="dates">${esc(sn)} display · Free to view</div>${x ? legLine(x) : ""}<div class="tags"><span class="tag ice">Home display</span>${p.kind === "installer" ? `<span class="tag">Professional installer</span>` : ""}${ph.length > 1 ? `<span class="tag">${ph.length} photos</span>` : ""}</div></div></article>`;
}
// Quick picks above the events list; they set the same date and cost filters as the chips
function nextSat() { const [y, m, d] = TODAY.split("-").map(Number), dt = new Date(y, m - 1, d), wd = dt.getDay(); if (wd === 0 || wd === 6) return TODAY; dt.setDate(d + 6 - wd); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }
const sortHtml = () => `<label class="sortl">Sort <select class="sortsel" id="sortSel" aria-label="Sort places">${SORTS.map(([v, l]) => `<option value="${v}"${state.sort === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>`;
function quickPicks() {
  const sat = nextSat(), q = [["date", TODAY, "Tonight"], ...(sat !== TODAY ? [["date", sat, "Saturday"]] : []), ["cost", "free", "Free"]];
  const nf = activeFilters().length;
  return `<div class="quick" role="group" aria-label="Quick picks">${q.map(([f, v, l]) => `<button type="button" data-quick="${f}" data-v="${v}" aria-pressed="${state[f] === v}">${l}</button>`).join("")}<button type="button" class="qf${fOpen ? " open" : ""}" data-openfilters aria-haspopup="dialog" aria-expanded="${fOpen}">Filters${nf ? ` <span class="fn">${nf}</span>` : ""}</button>${isPhone() ? "" : sortHtml()}</div>`;
}
const LIST_PAGE = 60; let listVis = [], listShown = 0, listSig = "", listIO = null;
function listCard(it, i) { return it.t === "e" ? evItem(it.o, i) : instItem(it.o); }
// the next page of cards is added when the end of the list scrolls into view
function moreCards(upTo) {
  const list = document.querySelector("#pbody .list"); if (!list || listShown >= listVis.length) return;
  const to = Math.min(listVis.length, Math.max(upTo || 0, listShown + LIST_PAGE));
  list.insertAdjacentHTML("beforeend", listVis.slice(listShown, to).map((it, i) => listCard(it, listShown + i)).join("")); listShown = to;
  const sen = $("#listmore"); if (sen && listShown >= listVis.length) sen.remove();
}
function renderPanel(opts) {
  counts();
  const head = $("#phead"), body = $("#pbody");
  document.body.classList.toggle("detail-open", !!state.detail);
  if (state.detail) { head.hidden = true; body.innerHTML = detailHtml(state.detail); wireDetail(); return; }
  head.hidden = false;
  // One list of places: events and home displays together
  if (state.tab === "events") {
    const ctr = mapReady ? map.getCenter() : null, dist = (o) => (ctr ? miles({ lat: ctr.lat, lng: ctr.lng }, { lat: o.lat, lng: o.lng }) : 0);
    const items = [
      ...E.filter(evMatch).map((e) => ({ t: "e", o: e, lat: e.lat, lng: e.lng, free: !!e.free, f: e.f === 2 ? 1 : 0, st: effStart(e), nm: e.n, key: "e:" + e.id })),
      ...SHOW.filter(instMatch).map((h) => ({ t: "i", o: h, lat: h.plat, lng: h.plng, free: true, f: 0, st: TODAY, nm: h.title, key: "i:" + h.id })),
    ];
    const lead = (a, b) => b.f - a.f; // paid "top of the list" placements stay first in every order
    const soon = (a, b) => lead(a, b) || a.st.localeCompare(b.st) || a.nm.localeCompare(b.nm);
    items.sort(state.sort === "free" ? (a, b) => lead(a, b) || (b.free ? 1 : 0) - (a.free ? 1 : 0) || soon(a, b) : state.sort === "soon" ? soon : (a, b) => lead(a, b) || dist(a) - dist(b) || soon(a, b));
    const vis = items.filter((it) => inView(it.lng, it.lat) || state.sel === it.key || state.keep === it.key); // keep: the card you just came back from stays listed
    const act = activeFilters();
    head.innerHTML = `<div class="hrow"><span class="hcount"><b>${vis.length.toLocaleString("en-US")}</b> place${vis.length === 1 ? "" : "s"}<span class="hmv"> in map view</span></span>${isPhone() ? `<span class="hright">${sortHtml()}</span>` : ""}</div>${quickPicks()}${act.length ? `<div class="actchips">${act.map(([k, l]) => `<button type="button" class="achip" data-clear="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)} <span aria-hidden="true">✕</span></button>`).join("")}<button type="button" class="linkbtn" data-clear="all">Clear all</button></div>` : ""}`;
    const sig = vis.map((it) => it.key).join("|") + "#" + state.sel + "#" + state.keep + "#" + favs.size + "#" + state.sort;
    if (opts && opts.quiet && sig === listSig) return; // the map moved but the same places are in view: leave the list alone
    listSig = sig; listVis = vis; listShown = Math.min(vis.length, LIST_PAGE);
    body.innerHTML = vis.length ? `<div class="list">${vis.slice(0, listShown).map((it, i) => listCard(it, i)).join("")}</div>${listShown < vis.length ? `<div id="listmore" class="listmore" aria-hidden="true"></div>` : ""}${teaser()}${IN_APP ? "" : `<p class="keepfree"><button type="button" class="linkbtn" data-support>Enjoying SoCal Lights? Keep it free ♥</button></p>`}`
      : `<div class="empty">No places in this part of the map.<button class="linkbtn" type="button" id="showall">Show all of Southern California</button></div>`;
  } else if (state.tab === "shop") {
    const cats = shopCats(), c = cats[Math.min(state.shopCat, cats.length - 1)];
    head.innerHTML = `<div class="hrow"><button class="chip" type="button" data-pop="shopseason" aria-haspopup="true"><span>Shop for ${esc(SEASONS[shopSeason()].short || SEASONS[shopSeason()].label)}</span><svg class="caret" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7l5 5 5-5"/></svg></button></div><div class="quick" role="group" aria-label="Shop categories">${cats.map(([l], i) => `<button type="button" data-shop="${i}" aria-pressed="${cats.indexOf(c) === i}">${esc(l)}</button>`).join("")}</div>`;
    body.innerHTML = `<div class="shopgrid">${c[1].map(([em, l, q]) => `<a class="shopcard" href="${amzUrl(q)}" target="_blank" rel="sponsored noopener"><span class="shopem" aria-hidden="true">${em}</span><span class="shoptx">${esc(l)}</span><span class="shopgo">Amazon ↗</span></a>`).join("")}</div><p class="meta" style="padding:4px 14px 14px">As an Amazon Associate we earn from qualifying purchases, at no extra cost to you.</p>`;
  } else {
    // My night uses the same layout as Places: buttons row, count line, then the cards
    const st = routeStops();
    if (state.start === "me" && st.length) locateMe(false);
    let prev = routeOrigin(), total = 0, mins = 0;
    const legs = st.map((ev, i) => { let l = null; if (prev) { const m = miles(prev, ev) * 1.3, mn = Math.max(5, Math.round(m * 1.6)); total += m; mins += mn; l = { mi: Math.round(m), min: mn, from: i === 0 ? (state.start === "me" ? "your location" : state.start) : "stop " + i }; } prev = ev; return l; });
    // With "My location" we leave out the starting point, so the maps app starts from wherever the phone is right now.
    const pts = st.map(destOf), og = routeOrigin();
    const origin = state.start === "me" ? "" : og ? og.lat + "," + og.lng : pts[0];
    const url = st.length ? navUrl(origin && !og && pts.length > 1 ? pts.slice(1) : pts, origin) : ""; // with a single stop and "First stop", the stop is also the destination
    const dur = mins >= 60 ? Math.floor(mins / 60) + " hr" + (mins % 60 ? " " + (mins % 60) + " min" : "") : mins + " min";
    const startSel = `<label class="qsel">Start <select id="startFrom" aria-label="Start from"><option value="me" ${state.start === "me" ? "selected" : ""}>My location</option><option value="first" ${state.start === "first" ? "selected" : ""}>First stop</option>${Object.keys(CITY).sort().map((c) => `<option ${c === state.start ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>`;
    const mapsSel = `<label class="qsel">Maps <select id="mapsSel" aria-label="Maps app">${Object.entries(MAPS).map(([k, l]) => `<option value="${k}"${k === mapsApp ? " selected" : ""}>${l}</option>`).join("")}</select></label>`;
    head.innerHTML = `<div class="hrow"><span class="hcount"><b>${st.length}</b> stop${st.length === 1 ? "" : "s"}${st.length && total >= 1 ? `<span class="hmv"> · about ${Math.round(total)} mi · ${dur}</span>` : ""}</span>${nightHelp ? "" : `<button type="button" class="helpbtn" data-nhelp="1" aria-label="How My night works" title="How My night works">?</button>`}</div>${st.length ? `<div class="quick" role="group" aria-label="Route options"><a class="qgo" href="${esc(url)}" target="_blank" rel="noopener" title="Open route in ${MAPS[mapsApp]}">Open route ↗</a>${startSel}${mapsSel}</div>` : ""}`;
    const sf = $("#startFrom"); if (sf) sf.onchange = (e) => { state.start = e.target.value; if (state.start === "me") locateMe(true); renderPanel(); drawMap(); fitRoute(); };
    const ms = $("#mapsSel"); if (ms) ms.onchange = (e) => setMapsApp(e.target.value);
    if (!st.length) { body.innerHTML = nightHelp ? helpHtml(0) : `<div class="empty">No stops yet. Tap the heart on any place to add it.</div>`; return; }
    const notes = [];
    if (state.start === "me" && !state.me) notes.push(state.meErr ? esc(state.meErr) : "Finding your location…");
    const nights = [...new Set(st.filter((e) => !e.house && e.s === e.e).map((e) => fmt(e.s)))];
    if (nights.length) notes.push(`One-night events: ${nights.join(", ")}.`);
    if (mapsApp === "apple" && st.length > 1) notes.push("Multi-stop routes in Apple Maps need iOS 18.4 or later. Older iPhones open with the first stop.");
    body.innerHTML = (nightHelp ? helpHtml(st.length) : "") + `<div class="list">${st.map((ev, i) => (ev.house ? instItem(ev.p, { n: i + 1, leg: legs[i] }) : evItem(ev, i, { n: i + 1, leg: legs[i] }))).join("")}</div>${notes.length ? `<div class="routenotes">${notes.map((n) => `<p><span aria-hidden="true">i</span>${n}</p>`).join("")}</div>` : ""}`;
  }
  if (listIO) listIO.disconnect(); const sen = $("#listmore"); if (sen && window.IntersectionObserver) { listIO = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) moreCards(); }, { root: body, rootMargin: "600px" }); listIO.observe(sen); }
  body.querySelectorAll("[data-goseason]").forEach((b) => (b.onclick = () => { setSeason(b.dataset.goseason); $("#pbody").scrollTop = 0; }));
  const sa = $("#showall"); if (sa) sa.onclick = () => { state.city = ""; applyFilters(); fitSoCal(true); };
}
document.getElementById("panel").addEventListener("click", (e) => { const h = e.target.closest("[data-nhelp]"); if (h) setNightHelp(h.dataset.nhelp === "1"); });
$("#pbody").addEventListener("click", (e) => {
  const mp = e.target.closest("[data-maps]"); if (mp) { e.stopPropagation(); setMapsApp(mp.dataset.maps); return; }
  const f = e.target.closest("[data-fav]");
  if (f) { e.stopPropagation(); const id = f.dataset.fav; favs.has(id) ? favs.delete(id) : favs.add(id); saveFavs(); if (state.tab === "plan" && !favs.size) { setTab("events"); if (isPhone()) setSheet("peek"); fitSoCal(true); return; } renderPanel(); drawMap(); return; }
  const it = e.target.closest(".item"); if (it && !e.target.closest("button,a,input,select")) { selectKey(it.dataset.key, "list"); if (e.target.closest(".tile,.thumb") && state.detail !== it.dataset.key) openDetail(it.dataset.key); }
});
$("#phead").addEventListener("change", (e) => { if (e.target.id === "sortSel") { state.sort = e.target.value; renderPanel(); $("#pbody").scrollTop = 0; } });
$("#pbody").addEventListener("click", (e) => {
  if (e.target.closest("[data-support]")) { openSupport(); return; }
  const sh = e.target.closest("[data-share]"); if (sh) { e.stopPropagation(); shareItem(sh.dataset.share); }
});
$("#phead").addEventListener("click", (e) => {
  const of = e.target.closest("[data-openfilters]"); if (of) { fOpen ? closeFilters() : openFilters(of); renderPanel(); return; }
  const cl = e.target.closest("[data-clear]"); if (cl) { clearFilter(cl.dataset.clear); return; }
  const sc = e.target.closest("[data-pop=shopseason]"); if (sc) { popFor === "shopseason" ? closePop() : openPop(sc); return; }
  const sb = e.target.closest("[data-shop]"); if (sb) { state.shopCat = +sb.dataset.shop; renderPanel(); $("#pbody").scrollTop = 0; return; }
  const b = e.target.closest("[data-quick]"); if (!b) return;
  const f = b.dataset.quick, v = b.dataset.v;
  if (f === "date") state.date = state.date === v ? "" : v; else state.cost = state.cost === v ? "all" : v;
  applyFilters();
});
$("#pbody").addEventListener("mouseover", (e) => { const it = e.target.closest(".item"); setHot(it ? it.dataset.key : null); });
$("#pbody").addEventListener("mouseleave", () => setHot(null));
function markItems() { document.querySelectorAll(".item").forEach((el) => el.classList.toggle("sel", el.dataset.key === state.sel)); }

/* ---------- full-size photo viewer ---------- */
function lbItems(it) {
  if (!it) return [];
  if (it.kind === "ev") return photosOf(it.ev, true).map((q) => ({ src: q.src, fb: q.fb || "", credit: q.credit || "", link: safeUrl(q.link) || "" }));
  return (it.p.photos || []).map((k) => ({ src: photoUrl(k), fb: "", credit: "", link: "" }));
}
let lbEl = null, lbBack = null;
function closeLightbox() {
  if (!lbEl) return;
  document.removeEventListener("keydown", lbKey, true); lbEl.remove(); lbEl = null; document.body.classList.remove("lb-open");
  if (lbBack && lbBack.isConnected) lbBack.focus({ preventScroll: true }); lbBack = null;
}
function lbKey(e) {
  if (!lbEl) return;
  const tr = lbEl.querySelector(".lbtrack");
  if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeLightbox(); }
  else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); tr.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * tr.clientWidth, behavior: "smooth" }); }
}
function openLightbox(items, start = 0, title = "") {
  if (!items.length) return;
  closeLightbox(); lbBack = document.activeElement;
  const many = items.length > 1;
  lbEl = document.createElement("div"); lbEl.id = "lightbox"; lbEl.setAttribute("role", "dialog"); lbEl.setAttribute("aria-modal", "true"); lbEl.setAttribute("aria-label", (title || "Photos") + ", full size");
  lbEl.innerHTML = `<div class="lbtrack">${items.map((q, i) => `<div class="lbslide" data-credit="${esc(q.credit)}" data-link="${esc(q.link)}"><img src="${esc(q.src)}"${q.fb ? ` data-fb="${esc(q.fb)}"` : ""} alt="${esc(title)}${many ? `, photo ${i + 1} of ${items.length}` : ""}" referrerpolicy="no-referrer" draggable="false"></div>`).join("")}</div>
    <button class="lbx" type="button" aria-label="Close photos">${`<svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>`}</button>
    ${many ? `<button class="lbn l" type="button" data-lb="-1" aria-label="Previous photo">${ARW_L}</button><button class="lbn r" type="button" data-lb="1" aria-label="Next photo">${ARW_R}</button><span class="lbcount">${start + 1} / ${items.length}</span>` : ""}
    <a class="lbcredit" target="_blank" rel="noopener" hidden></a>`;
  document.body.appendChild(lbEl); document.body.classList.add("lb-open");
  const tr = lbEl.querySelector(".lbtrack"), cr = lbEl.querySelector(".lbcredit"), cnt = lbEl.querySelector(".lbcount");
  const show = () => { const i = Math.round(tr.scrollLeft / tr.clientWidth), sl = tr.children[i]; if (cnt) cnt.textContent = i + 1 + " / " + items.length;
    if (sl && sl.dataset.credit) { cr.hidden = false; cr.textContent = sl.dataset.credit; if (sl.dataset.link) { cr.href = sl.dataset.link; cr.removeAttribute("aria-disabled"); } else cr.removeAttribute("href"); } else cr.hidden = true; };
  tr.addEventListener("scroll", show, { passive: true });
  tr.scrollLeft = start * tr.clientWidth; show();
  lbEl.addEventListener("click", (e) => {
    const g = e.target.closest("[data-lb]"); if (g) { tr.scrollBy({ left: +g.dataset.lb * tr.clientWidth, behavior: "smooth" }); return; }
    if (e.target.closest(".lbx") || !e.target.closest("img,.lbn,.lbcredit")) closeLightbox();
  });
  lbEl.addEventListener("error", (e) => { const i = e.target; if (i instanceof HTMLImageElement && i.dataset.fb) { i.src = i.dataset.fb; i.removeAttribute("data-fb"); } }, true);
  document.addEventListener("keydown", lbKey, true);
  lbEl.querySelector(".lbx").focus({ preventScroll: true });
}
function openDetail(k) { state.detail = k; state.sel = k; renderPanel(); renderPreview(); $("#pbody").scrollTop = 0; if (isPhone()) setSheet("full"); drawHL(); }
function detailHtml(k) {
  const it = findKey(k); if (!it) return "";
  if (it.kind === "ev") {
    const ev = it.ev, f = favs.has(ev.id), url = safeUrl(ev.u), phs = photosOf(ev, true), ph = phs[0], cl = ph && safeUrl(ph.link), manyD = phs.length > 1;
    return `<div class="detail">
    <div class="hero${ev.free ? " free" : ""}${ph ? " photo" : ""}">${manyD ? `<div class="pvtrack" id="track">${phs.map((q, i) => `<div class="pvslide" data-credit="${esc(q.credit || "")}" data-link="${esc(safeUrl(q.link) || "")}">${photoImg(q, i < 2)}</div>`).join("")}</div><button class="pvnav l" type="button" data-g="-1" aria-label="Previous photo">${ARW_L}</button><button class="pvnav r" type="button" data-g="1" aria-label="Next photo">${ARW_R}</button><span class="pvcount" id="gcount">1 / ${phs.length}</span>` : ph ? photoImg(ph) : ""}<button class="back" type="button" id="back" aria-label="Back to results"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
      ${ph ? (cl ? `<a class="credit" id="hcredit" href="${esc(cl)}" target="_blank" rel="noopener">${esc(ph.credit)}</a>` : `<span class="credit" id="hcredit">${esc(ph.credit)}</span>`) : ""}
      <div class="htext"><div class="kicker">${esc(TYPE_SHORT[ev.t] || "Event")} · ${esc(ev.city)}</div><h2>${esc(ev.n)}</h2></div></div>
    <div class="tags">${ev.f ? `<span class="tag feat">Featured</span>` : ""}<span class="tag ${ev.st === "c" ? "conf" : "exp"}">${ev.st === "c" ? "Dates confirmed" : "Expected from past years · check site"}</span><span class="tag">${esc(ev.c)} County</span></div>
    <div class="boxes"><div><span>When</span><b>${whenShort(ev)}</b></div><div><span>Hours</span><b>${esc(ev.h)}</b></div><div><span>Cost</span><b>${esc(ev.p)}</b></div></div>
    <p class="blurb">${esc(ev.b)}</p>
    <dl class="facts">${ev.v || ev.a ? `<dt>Where</dt><dd>${esc(ev.v)}${ev.v && ev.a && !ev.a.startsWith(ev.v) ? "<br>" : ""}${ev.a && !ev.a.startsWith(ev.v) ? `<span class="meta">${esc(ev.a)}</span>` : ""}</dd>` : ""}<dt>Dates</dt><dd class="dates">${range(ev)}</dd></dl>
    ${mapsPicker()}
    ${ev.st !== "c" ? `<p class="meta">These dates follow last year's schedule. Check the event link before you go.</p>` : ""}
    <div class="actionbar"><button class="abtn" type="button" data-fav="${esc(ev.id)}" aria-pressed="${f}" aria-label="${f ? "Remove from" : "Add to"} my night" title="${f ? "In my night" : "Add to my night"}">${HEART}</button>${url ? `<a class="abtn" href="${esc(infoUrl(affUrl(url), ev.n))}" target="_blank" rel="noopener${isAff(url) ? " sponsored" : ""}" aria-label="Event info" title="Event info"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg></a>` : ""}<a class="btn go" href="${esc(dirUrl(ev))}" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3 3 10.5l7.5 3L13.5 21z"/></svg>Directions</a></div></div>`;
  }
  const p = it.p, ph = p.photos || [], web = safeUrl(p.web || "");
  return `<div class="detail">  ${ph.length ? `<div class="gallery"><button class="back" type="button" id="back" aria-label="Back to results"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><div class="track" id="track">${ph.map((key, i) => `<div class="slide"><img src="${photoUrl(key)}" alt="${esc(p.title)}, photo ${i + 1} of ${ph.length}" loading="${i ? "lazy" : "eager"}"></div>`).join("")}</div>${ph.length > 1 ? `<button class="nav l" type="button" data-g="-1" aria-label="Previous photo">${ARW_L}</button><button class="nav r" type="button" data-g="1" aria-label="Next photo">${ARW_R}</button><span class="count" id="gcount">1 / ${ph.length}</span>` : ""}</div>` : `<div class="gallery"><button class="back" type="button" id="back" aria-label="Back to results"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><div class="ph-none">No photos yet</div></div>`}
  <div class="row" style="gap:6px;justify-content:flex-start;flex-wrap:wrap"><span class="tag ice">Home display</span>${p.kind === "installer" ? `<span class="tag">Professional installer</span>` : ""}</div>
  <h2>${esc(p.title)}</h2><div class="meta">${p.kind === "installer" ? "" : "Posted by "}<b style="color:var(--ink)">${esc(p.biz)}</b> · ${esc(p.city)}</div>
  <p style="margin:0;white-space:pre-line">${esc(p.desc)}</p>
  <dl class="facts">${p.address ? `<dt>Address</dt><dd>${esc(p.address)}</dd>` : ""}${p.where ? `<dt>See it</dt><dd>${esc(p.where)}</dd>` : ""}${p.kind === "installer" && p.area ? `<dt>Service area</dt><dd>${esc(p.area)}</dd>` : ""}${p.phone ? `<dt>Quotes</dt><dd style="user-select:all">${esc(p.phone)}</dd>` : ""}${web ? `<dt>Web</dt><dd><a href="${esc(web)}" target="_blank" rel="noopener">${esc(web.replace(/^https?:\/\//, "").replace(/\/$/, ""))} ↗</a></dd>` : ""}</dl>
  <div class="actionbar"><button class="abtn" type="button" data-fav="${esc(hfav(p))}" aria-pressed="${favs.has(hfav(p))}" aria-label="${favs.has(hfav(p)) ? "Remove from" : "Add to"} my night" title="${favs.has(hfav(p)) ? "In my night" : "Add to my night"}">${HEART}</button><a class="btn go" href="${esc(navUrl([p.address || p.plat + "," + p.plng], ""))}" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3 3 10.5l7.5 3L13.5 21z"/></svg>Directions</a></div></div>`;
}
function wireDetail() {
  const area = document.querySelector(".detail .hero.photo, .detail .gallery:has(.track)");
  if (area) area.addEventListener("click", (e) => {
    if (e.target.closest("button,a")) return;
    const it = findKey(state.detail), items = lbItems(it), t = area.querySelector(".pvtrack,.track");
    if (items.length) openLightbox(items, t ? Math.round(t.scrollLeft / t.clientWidth) : 0, it.kind === "ev" ? it.ev.n : it.p.title);
  });
  $("#back").onclick = () => { state.keep = state.detail; state.detail = null; if (isPhone()) state.sel = null; renderPanel(); renderPreview(); keepSelectedVisible(); };
  const tr = $("#track"); if (tr) { const n = tr.children.length;
    document.querySelectorAll(".gallery .nav, .hero .pvnav").forEach((b) => (b.onclick = () => tr.scrollBy({ left: tr.clientWidth * Number(b.dataset.g), behavior: "smooth" })));
    tr.onscroll = () => { const i = Math.round(tr.scrollLeft / tr.clientWidth), c = $("#gcount"); if (c) c.textContent = i + 1 + " / " + n;
      const sl = tr.children[i], cr = $("#hcredit"); if (sl && cr && sl.dataset.credit) { cr.textContent = sl.dataset.credit; if (cr.tagName === "A" && sl.dataset.link) cr.href = sl.dataset.link; } }; }
}

/* ---------- Showcase a House form ---------- */
/* ---------- monetization: affiliate links, support box ---------- */
// Add the affiliate tracking parameter to ticket links on hosts configured in site-config.js (no-op when none are set).
function affRule(u) { try { const h = new URL(u).hostname.replace(/^www\./, ""); return SITE.ticketAffiliates[h] || SITE.ticketAffiliates[h.split(".").slice(-2).join(".")] || null; } catch { return null; } }
const isAff = (u) => !!affRule(u);
// Two kinds of rule: add a tracking parameter ({ param, value }), or wrap the link in a network deep link ({ template: "https://…?u={url}" }, the form Impact/CJ give you).
function affUrl(u) { const r = affRule(u); if (!r) return u; if (r.template) return r.template.replace("{url}", encodeURIComponent(u)); try { const x = new URL(u); x.searchParams.set(r.param, r.value); return x.href; } catch { return u; } }
// High-end first: the search words get a "premium" nudge and Amazon sorts the results by price, high to low.
const amzUrl = (q) => `https://www.amazon.com/s?k=${encodeURIComponent(SITE.shopHighEnd ? q + " " + SITE.shopHighEnd : q)}${SITE.shopSort ? "&s=" + encodeURIComponent(SITE.shopSort) : ""}&tag=${encodeURIComponent(SITE.amazonTag)}`;
const shopSeason = () => (SITE.shop[state.shopSeason] ? state.shopSeason : state.season);
const shopCats = () => (SITE.amazonTag ? SITE.shop[shopSeason()] || [] : []);
// The Shop tab only exists when there is an Amazon tag and shop list for the season.
function syncShopTab() {
  const on = shopCats().length > 0;
  $("#t-shop").hidden = !on; document.querySelector('#bnav [data-tab="shop"]').hidden = !on;
  if (!on && state.tab === "shop") setTab("events");
}
function openSupport() {
  const m = $("#modal"), donate = safeUrl(SITE.donateUrl);
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="sh"><div class="row" style="justify-content:space-between"><h2 id="sh">Keep SoCal Lights free</h2><button class="xbtn" type="button" id="sClose" aria-label="Close" title="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div>
    <p class="blurb">SoCal Lights is built and kept up to date by one small team: checking dates, adding events and fixing links all season long. There are no ads and no paywall. If it helped you find something fun, you can help keep it going.</p>
    ${donate ? `<a class="btn go" href="${esc(donate)}" target="_blank" rel="noopener">♥ ${esc(SITE.donateLabel)}</a>` : ""}
    ${shopCats().length ? `<button class="btn ghost" type="button" id="sShop">🛍️ Browse the shop</button>` : ""}
    ${SITE.amazonTag || Object.keys(SITE.ticketAffiliates).length ? `<p class="meta">Some links are affiliate links: we may earn a small commission at no extra cost to you.</p>` : ""}
  </div>`;
  m.hidden = false; $("#sClose").onclick = closeForm; $("#sClose").focus();
  if ($("#sShop")) $("#sShop").onclick = () => { closeForm(); setTab("shop"); if (isPhone()) setSheet("full"); };
}
function closeForm() { $("#modal").hidden = true; $("#modal").innerHTML = ""; }
document.addEventListener("keydown", (e) => { if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && $("#pvtrack") && !e.target.closest("input,select,textarea") && $("#modal").hidden) { const t = $("#pvtrack"); t.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * t.clientWidth, behavior: "smooth" }); return; }
  if (e.key === "Escape") { if (!$("#modal").hidden) closeForm(); else if (fOpen) { closeFilters(); renderPanel(); } else if (!$("#moremenu").hidden) closeMore(); else if (!$("#pop").hidden) closePop(); else if ($("#seasonmenu")) closeSeasonMenu(); else if (!$("#preview").hidden) closePin(); } });
/* ---------- popovers, filters panel, menu ---------- */
let popFor = null;
function closePop() { $("#pop").hidden = true; popFor = null; }
document.addEventListener("click", (e) => { if (!e.target.isConnected) return; const p = $("#pop"); if (!p.hidden && !p.contains(e.target) && !e.target.closest("[data-pop]")) closePop(); });
function setCity(n) {
  state.city = n; applyFilters(); const c = CITY_OPTS[n]; if (!c || !mapReady) return;
  const dLat = state.radius / 69, dLng = state.radius / (69 * Math.cos(c[0] * Math.PI / 180));
  map.fitBounds([[c[1] - dLng, c[0] - dLat], [c[1] + dLng, c[0] + dLat]], { padding: padding(), duration: 600 });
}
// The small drop-down under the Shop tab's "Shop for" button
function openPop(chip) {
  const k = chip.dataset.pop, p = $("#pop"); popFor = k; let h = "";
  if (k === "shopseason") h = `<h4>Shop for</h4>${Object.keys(SITE.shop).filter((x) => SEASONS[x]).map((x) => `<label class="opt"><input type="radio" name="ss" value="${x}" ${x === shopSeason() ? "checked" : ""}> ${esc(SEASONS[x].short || SEASONS[x].label)}</label>`).join("")}`;
  p.innerHTML = h; p.hidden = false;
  const r = chip.getBoundingClientRect(), pw = p.offsetWidth; p.style.top = r.bottom + 6 + "px"; p.style.left = Math.max(12, Math.min(r.left, innerWidth - pw - 12)) + "px";
  p.querySelectorAll("input[name=ss]").forEach((r) => (r.onchange = () => { state.shopSeason = r.value; state.shopCat = 0; closePop(); renderPanel(); $("#pbody").scrollTop = 0; }));
}

/* Filters: one panel for everything that narrows the list (a popover on desktop, a full-height sheet on phones) */
let fOpen = false, fAnchor = null;
const SORTS = [["near", "Nearest"], ["soon", "Soonest"], ["free", "Free first"]];
function activeFilters() {
  const a = [], sat = nextSat();
  if (state.date && state.date !== TODAY && state.date !== sat) a.push(["date", "Open " + fmt(state.date)]);
  if (state.city) a.push(["city", "Near " + state.city + (state.radius !== 10 ? " · " + state.radius + " mi" : "")]);
  state.counties.forEach((c) => a.push(["county:" + c, c + " County"]));
  if (state.cost === "paid") a.push(["cost", "Ticketed only"]);
  if (state.type) a.push(["type", state.type === "house" ? "Home displays" : TYPE_SHORT[state.type] || "Type"]);
  if (state.conf) a.push(["conf", "Confirmed dates"]);
  return a;
}
function clearFilter(k) {
  if (k === "all") { state.date = ""; state.city = ""; state.counties.clear(); state.cost = "all"; state.type = ""; state.conf = false; }
  else if (k === "date") state.date = ""; else if (k === "city") state.city = ""; else if (k === "cost") state.cost = "all";
  else if (k === "type") state.type = ""; else if (k === "conf") state.conf = false; else if (k.startsWith("county:")) state.counties.delete(k.slice(7));
  applyFilters();
}
function filtersHtml() {
  const S = SEASONS[state.season], sat = nextSat(), nShow = E.filter(evMatch).length + SHOW.filter(instMatch).length;
  const ch = (on, attrs, label) => `<button type="button" class="fchip${on ? " on" : ""}" aria-pressed="${on}" ${attrs}>${label}</button>`;
  return `<div class="fhead"><h2>Filters</h2><button class="xbtn" type="button" data-fdone aria-label="Close" title="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg></button></div>
  <div class="fbody">
    <section><h4>When</h4><div class="fchips">${ch(!state.date, 'data-fwhen="any"', "Any date")}${ch(state.date === TODAY, 'data-fwhen="today"', "Tonight")}${sat !== TODAY ? ch(state.date === sat, 'data-fwhen="sat"', "Saturday") : ""}</div>
      <label class="fdate">or pick a day<input type="date" id="fDate" min="${S.dateRange[0]}" max="${S.dateRange[1]}" value="${esc(state.date)}"></label></section>
    <section><h4>Near</h4>${state.city ? `<div class="fchips">${ch(true, 'data-clear="city"', esc(state.city) + " ✕")}</div>` : ""}
      <input type="search" id="fCityQ" class="fq" placeholder="Type a city" aria-label="Find a city" autocomplete="off"><div class="fcities" id="fCityList"></div>
      <div class="fseg" role="group" aria-label="Distance">${[5, 10, 25].map((r) => `<button type="button" data-rad="${r}" class="${state.radius === r ? "on" : ""}">${r} mi</button>`).join("")}</div></section>
    <section><h4>County</h4><div class="fchips">${COUNTIES.map((c) => ch(state.counties.has(c), `data-county="${esc(c)}"`, esc(c.replace(/^Los Angeles$/, "LA")))).join("")}</div></section>
    <section><h4>Cost</h4><div class="fseg" role="group" aria-label="Cost">${[["all", "All"], ["free", "Free"], ["paid", "Ticketed"]].map(([v, l]) => `<button type="button" data-fcost="${v}" class="${state.cost === v ? "on" : ""}">${l}</button>`).join("")}</div></section>
    <section><h4>Type</h4><div class="fchips">${ch(!state.type, 'data-ftype=""', "All")}${Object.entries(S.types).map(([v, l]) => ch(state.type === v, `data-ftype="${v}"`, esc(l))).join("")}${ch(state.type === "house", 'data-ftype="house"', "Home displays")}</div></section>
    <section class="frow"><span><b>Confirmed dates only</b></span><button type="button" class="sw${state.conf ? " on" : ""}" role="switch" aria-checked="${state.conf}" data-fconf aria-label="Confirmed dates only"><i></i></button></section>
  </div>
  <div class="ffoot"><button type="button" class="linkbtn" data-clear="all">Clear all</button><button type="button" class="btn" data-fdone>Show ${nShow.toLocaleString("en-US")} place${nShow === 1 ? "" : "s"}</button></div>`;
}
function fPanel() {
  let f = $("#fpanel");
  if (!f) {
    f = document.createElement("div"); f.id = "fpanel"; f.className = "fpanel"; f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-label", "Filters"); f.hidden = true;
    const bk = document.createElement("div"); bk.id = "fback"; bk.className = "fback"; bk.hidden = true; bk.onclick = closeFilters;
    document.body.append(bk, f);
    f.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-fdone]")) { closeFilters(); return; }
      let c;
      if ((c = t.closest("[data-clear]"))) { clearFilter(c.dataset.clear); return; }
      if ((c = t.closest("[data-fwhen]"))) { const v = c.dataset.fwhen; state.date = v === "any" ? "" : v === "today" ? TODAY : nextSat(); applyFilters(); return; }
      if ((c = t.closest("[data-county]"))) { const n = c.dataset.county; state.counties.has(n) ? state.counties.delete(n) : state.counties.add(n); applyFilters(); return; }
      if ((c = t.closest("[data-fcost]"))) { state.cost = c.dataset.fcost; applyFilters(); return; }
      if ((c = t.closest("[data-ftype]"))) { state.type = c.dataset.ftype; applyFilters(); return; }
      if ((c = t.closest("[data-rad]"))) { state.radius = +c.dataset.rad; state.city ? setCity(state.city) : applyFilters(); return; }
      if (t.closest("[data-fconf]")) { state.conf = !state.conf; applyFilters(); return; }
      if ((c = t.closest("[data-city]"))) { setCity(c.dataset.city); return; }
    });
    f.addEventListener("change", (e) => {
      if (e.target.id === "fDate") { state.date = e.target.value; applyFilters(); }
      else if (e.target.dataset.layer) { state.layers[e.target.dataset.layer] = e.target.checked; applyFilters(); }
    });
    f.addEventListener("input", (e) => { if (e.target.id === "fCityQ") drawCityList(e.target.value); });
  }
  return f;
}
function drawCityList(q) {
  const L = $("#fCityList"); if (!L) return; const v = (q || "").trim().toLowerCase();
  if (!v) { L.innerHTML = ""; return; }
  const hits = Object.keys(CITY_OPTS).sort().filter((n) => n.toLowerCase().includes(v)).slice(0, 6);
  L.innerHTML = hits.map((n) => `<button type="button" class="linkbtn" data-city="${esc(n)}">${esc(n)}</button>`).join("") || `<span class="meta">No matching city</span>`;
}
function placeFilters() {
  const f = $("#fpanel"); if (!f || f.hidden) return;
  if (isPhone()) { f.style.top = f.style.left = f.style.maxHeight = ""; return; }
  const r = fAnchor.getBoundingClientRect(), w = f.offsetWidth;
  f.style.left = Math.max(12, Math.min(r.right - w, innerWidth - w - 12)) + "px"; f.style.top = r.bottom + 10 + "px";
  f.style.maxHeight = Math.max(320, innerHeight - r.bottom - 24) + "px";
}
function refreshFilters() {
  const f = $("#fpanel"); if (!f || f.hidden) return;
  const sc = f.querySelector(".fbody")?.scrollTop || 0, q = f.querySelector("#fCityQ")?.value || "";
  f.innerHTML = filtersHtml(); const b = f.querySelector(".fbody"); if (b) b.scrollTop = sc;
  const qi = f.querySelector("#fCityQ"); if (qi && q) { qi.value = q; drawCityList(q); }
}
function openFilters(anchor) {
  closeMore(); closePop(); closeSeasonMenu();
  fAnchor = anchor; fOpen = true;
  const f = fPanel(); f.hidden = false; f.innerHTML = filtersHtml(); $("#fback").hidden = !isPhone();
  document.body.classList.add("filters-open"); placeFilters();
}
function closeFilters() { fOpen = false; const f = $("#fpanel"); if (f) f.hidden = true; const bk = $("#fback"); if (bk) bk.hidden = true; document.body.classList.remove("filters-open"); }
document.addEventListener("click", (e) => { if (!e.target.isConnected) return; if (fOpen && !isPhone() && !e.target.closest("#fpanel,[data-openfilters]")) closeFilters(); });
addEventListener("resize", placeFilters);

/* ⋯ menu: keep it free, night mode, contact (Add event and Add house live in the list header) */
function closeMore() { const m = $("#moremenu"); if (m) m.hidden = true; const b = $("#morebtn"); if (b) b.setAttribute("aria-expanded", "false"); }
function moreHtml() {
  const dark = theme() === "dark";
  const row = (tag, attrs, ic, t, sub, tail = "") => `<${tag} class="mrow" role="menuitem" ${attrs}><span class="mi">${ic}</span><span class="mt"><b>${t}</b><small>${sub}</small></span>${tail}</${tag}>`;
  return row("a", 'href="/add"', `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`, "Add", "An event, a contest or a home display")
    + (IN_APP ? "" : row("button", 'type="button" data-m="support"', `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--heart)" aria-hidden="true"><path fill="currentColor" d="M12 11.5s-5.5-3.3-5.5-7a3 3 0 0 1 5.5-1.6 3 3 0 0 1 5.5 1.6c0 3.7-5.5 7-5.5 7z"/><path d="M3 16v5"/><path d="M3 17h4.5l3 1.8h5.5a1.8 1.8 0 0 0 0-3.6h-4"/><path d="m10.5 18.8 7.5-1 3-2.800"/></svg>`, "Keep SoCal Lights Free", SITE.donateUrl ? "Tip us or shop the season" : "Shop the season"))
    + row("button", `type="button" data-m="night" role="menuitemcheckbox" aria-checked="${dark}"`, dark
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`,
      "Night mode", dark ? "On · tap to go back to day" : "Off · switches automatically after 6pm", `<span class="sw${dark ? " on" : ""}"><i></i></span>`)
    + row("a", `href="mailto:${esc(SITE.contactEmail || "info@socallights.app")}"`, `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`, "Contact us", esc(SITE.contactEmail || "info@socallights.app"));
}
function openMore() {
  closeFilters(); closePop(); closeSeasonMenu();
  const m = $("#moremenu"), b = $("#morebtn"); m.innerHTML = moreHtml(); m.hidden = false; b.setAttribute("aria-expanded", "true");
  const r = b.getBoundingClientRect(), w = m.offsetWidth; m.style.top = r.bottom + 10 + "px"; m.style.left = Math.max(10, Math.min(r.right - w, innerWidth - w - 10)) + "px";
}
$("#morebtn").onclick = () => ($("#moremenu").hidden ? openMore() : closeMore());
$("#moremenu").addEventListener("click", (e) => {
  const b = e.target.closest("[data-m]"); if (!b) { if (e.target.closest("a")) closeMore(); return; }
  const k = b.dataset.m;
  if (k === "night") {
    setTheme(theme() === "dark" ? "light" : "dark");
    // update the row in place so the switch slides and the icon swaps
    const row = $("#moremenu [data-m=night]"), t = document.createElement("div"); t.innerHTML = moreHtml(); const nr = t.querySelector("[data-m=night]");
    if (row && nr) { row.querySelector(".mi").innerHTML = nr.querySelector(".mi").innerHTML; row.querySelector("small").textContent = nr.querySelector("small").textContent; row.setAttribute("aria-checked", nr.getAttribute("aria-checked")); row.querySelector(".sw").className = nr.querySelector(".sw").className; }
    else $("#moremenu").innerHTML = moreHtml();
    return;
  }
  closeMore(); if (k === "support") openSupport();
});
document.addEventListener("click", (e) => { if (!e.target.isConnected) return; const m = $("#moremenu"); if (m && !m.hidden && !e.target.closest("#moremenu,#morebtn")) closeMore(); });

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
  document.documentElement.dataset.season = state.season;
  const sl = $("#seasonlbl"); if (sl) sl.textContent = SEASONS[state.season].short;
  repaintMap();
}
// One "Halloween ▾" button lists the five seasons (beside the search on desktop, under it on phones)
function toggleSeasonPick(btn) {
  if ($("#seasonmenu")) { closeSeasonMenu(); return; }
  closeFilters(); closeMore(); closePop();
  const m = document.createElement("div"); m.id = "seasonmenu"; m.setAttribute("role", "menu");
  m.innerHTML = seasonsFrom(NOW_SEASON).map((k) => `<button type="button" role="menuitemradio" aria-checked="${k === state.season}" data-sp="${k}" class="${k === state.season ? "on" : ""}">${esc(SEASONS[k].label)}${k === NOW_SEASON ? ` <span class="nowtag">On now</span>` : ""}</button>`).join("");
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(), w = m.offsetWidth; m.style.top = r.bottom + 8 + "px"; m.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
  btn.setAttribute("aria-expanded", "true");
  m.onclick = (e) => { const b = e.target.closest("[data-sp]"); if (!b) return; closeSeasonMenu(); setSeason(b.dataset.sp); };
  setTimeout(() => document.addEventListener("click", function off(e) { if (!$("#seasonmenu")) { document.removeEventListener("click", off); return; } if (!e.target.closest("#seasonmenu,#seasonbtn")) { closeSeasonMenu(); document.removeEventListener("click", off); } }), 0);
}
$("#seasonbtn").onclick = (e) => toggleSeasonPick(e.currentTarget);
function closeSeasonMenu() {
  const m = $("#seasonmenu"); if (m) m.remove();
  const dd = document.querySelector("[data-sdrop]"); if (dd) dd.setAttribute("aria-expanded", "false");
  const sb = $("#seasonbtn"); if (sb) sb.setAttribute("aria-expanded", "false");
}
function repaintMap() {
  if (!mapReady || !map.getLayer("clusters")) return;
  const C = mapColors();
  map.setPaintProperty("clusters", "circle-color", C.season);
  map.setPaintProperty("pt", "circle-color", catColor(C));
  map.setPaintProperty("hl", "circle-color", catColor(C));
}
// Day / night: automatic (dark from 6 pm to 6 am, device time); the toggle overrides it until the next switch
const autoTheme = () => { const h = new Date().getHours(); return h >= 18 || h < 6 ? "dark" : "light"; };
function nextSwitch() { const d = new Date(); d.setMinutes(0, 0, 0); const h = d.getHours(); if (h < 6) d.setHours(6); else if (h < 18) d.setHours(18); else { d.setDate(d.getDate() + 1); d.setHours(6); } return d.getTime(); }
function setTheme(t, manual = true) {
  document.documentElement.dataset.theme = t;
  if (manual) { try { localStorage.setItem("socal-theme", t); localStorage.setItem("socal-theme-until", String(nextSwitch())); } catch {} }
  const night = t === "dark";
  document.querySelector('meta[name="theme-color"]').content = night ? "#0b0d12" : "#f6f4f0";
  map.setStyle(MAP_STYLES[t], { diff: false });
}
// A page left open flips at 6 pm / 6 am unless the toggle is overriding it
setInterval(() => {
  let until = 0; try { until = +localStorage.getItem("socal-theme-until") || 0; } catch {}
  if (until > Date.now()) return;
  const t = autoTheme(); if (t !== theme()) setTheme(t, false);
}, 60000);
if (theme() === "dark") document.querySelector('meta[name="theme-color"]').content = "#0b0d12";
function setSeason(k) {
  if (!SEASONS[k] || k === state.season) return;
  state.season = k; state.shopCat = 0; state.shopSeason = ""; state.type = ""; state.date = ""; state.sel = null; state.detail = null;
  try { history.replaceState(null, "", "#" + k); } catch {}
  renderSeasonBar(); applyFilters(); if (mapReady) fitSoCal(true);
}
function applyFilters() {
  syncShopTab(); state.keep = null;
  state.detail = null; renderPanel(); drawMap(); renderPreview();
  if (fOpen) { refreshFilters(); placeFilters(); }
}
// Phone: the floating tab bar drives the same three tabs as the panel
document.querySelectorAll("#bnav [data-tab]").forEach((b) => (b.onclick = () => $("#t-" + b.dataset.tab).click()));
// the phone's search box shares its row with the logo and night-mode button, so keep the hint short enough to fit
const fitHint = () => { $("#q").placeholder = innerWidth > 860 ? "Search places or a city" : innerWidth > 380 ? "Search places" : "Search"; };
fitHint(); addEventListener("resize", fitHint);
let qT; $("#q").oninput = (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 120); };

/* ---------- bottom sheet (phone) ---------- */
// The sheet is one full-height panel that only slides up and down (a GPU transform), so the buttons, the count / sort line and the
// cards never move relative to the sheet and nothing is rebuilt while it moves. Peek shows the handle and the buttons row above the
// floating tab bar; a soft fade at the bottom hides the rest of the sheet behind the tab bar and fades away as the sheet rises.
const PEEK = 153; // visible height at Peek: handle + the buttons row, which end just above the tab bar zone
let safeBottom = null;
function peekH() {
  if (safeBottom === null) { const t = document.createElement("div"); t.style.cssText = "position:fixed;visibility:hidden;height:env(safe-area-inset-bottom,0px)"; document.body.appendChild(t); safeBottom = t.offsetHeight; t.remove(); }
  return PEEK + safeBottom;
}
let sheetState = "peek";
const fullH = () => $("#panel").offsetHeight || innerHeight * 0.85;
const stopH = (s) => (s === "peek" ? Math.min(peekH(), fullH()) : fullH());
function sheetVisible() { return isPhone() ? stopH(sheetState) : 0; }
const peekY = () => Math.max(0, fullH() - stopH("peek")); // how far the sheet is pushed down at Peek
// y = how far down the sheet is (0 = Full); the fade behind the tab bar follows
function placeSheet(y) {
  const panel = $("#panel"), py = peekY(), v = Math.max(0, Math.min(py, y));
  panel.style.transform = `translate3d(0,${v}px,0)`;
  const f = $("#navfade"); if (f) f.style.opacity = py ? Math.min(1, Math.max(0, v / py)) : 1;
  return v;
}
const sheetNow = () => new DOMMatrix(getComputedStyle($("#panel")).transform).m42 || 0;
// After the sheet moves, scroll the list just enough to keep the selected card on screen (above the tab bar, below the header)
let keepT = null;
function keepSelectedVisible() {
  clearTimeout(keepT);
  keepT = setTimeout(() => {
    if (!isPhone() || state.detail || !state.sel || sheetState === "peek") return;
    const body = $("#pbody"), el = body.querySelector(`.item[data-key="${CSS.escape(state.sel)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect(), top = body.getBoundingClientRect().top, bottom = $("#bnav").getBoundingClientRect().top - 8;
    if (r.top >= top && r.bottom <= bottom) return;
    body.scrollTo({ top: Math.max(0, body.scrollTop + r.top - top - 10), behavior: "auto" });
  }, 340); // after the sheet's slide transition
}
function setSheet(s) {
  sheetState = s; const panel = $("#panel");
  if (!isPhone()) { panel.style.removeProperty("transform"); return; }
  placeSheet(s === "peek" ? peekY() : 0);
  document.documentElement.style.setProperty("--peek", sheetVisible() + "px");
  keepSelectedVisible();
}
// Drag the sheet from its top (handle, tabs, header) or from the list itself:
// swiping up on a list that isn't full height expands the sheet; swiping down at the top of the list collapses it.
(function () {
  const panel = $("#panel"), body = $("#pbody"), g = $("#grab");
  const d = { y0: null, startY: 0, y: 0, moved: false, justDragged: false };
  const NEXT = { peek: "full", full: "peek" }; // tapping the handle switches between the two
  function begin(y) { d.y0 = y; d.startY = sheetNow(); d.y = d.startY; d.moved = false; }
  function move(y) {
    if (d.y0 === null) return false;
    const dy = y - d.y0;
    if (!d.moved) { if (Math.abs(dy) < 6) return false; d.moved = true; panel.classList.add("dragging"); }
    d.y = placeSheet(d.startY + dy); // the sheet follows the finger
    return true;
  }
  function end(y) {
    if (d.y0 === null) return false;
    const dy = y - d.y0, moved = d.moved; d.y0 = null; panel.classList.remove("dragging");
    if (!moved) return false;
    setSheet(dy < -40 ? "full" : dy > 40 ? "peek" : d.y < peekY() / 2 ? "full" : "peek"); // a flick decides; a slow drag snaps to the nearer position
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
      // a sideways swipe never drags the sheet
      if (Math.abs(dx) > Math.abs(dy)) { mode = "scroll"; d.y0 = null; return; }
      mode = (sheetState !== "full" && dy < 0) || (body.scrollTop <= 0 && dy > 0) ? "sheet" : "scroll";
      if (mode === "scroll") { d.y0 = null; return; }
    }
    e.preventDefault(); move(y);
  }, { passive: false });
  const tend = (e) => { if (mode === "sheet") end(e.changedTouches[0].clientY); else d.y0 = null; mode = null; };
  body.addEventListener("touchend", tend); body.addEventListener("touchcancel", tend);

  g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSheet(NEXT[sheetState]); } });
  document.querySelectorAll(".ptab").forEach((t) => t.addEventListener("click", () => { if (isPhone() && sheetState === "peek") setSheet("full"); }));
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
  const h = location.hash.slice(1), dl = h.match(/^([eh])-(.+)$/);
  if (dl) {
    const ev = dl[1] === "e" ? E.find((x) => x.id === dl[2]) : null, ho = dl[1] === "h" ? SHOW.find((x) => x.id === dl[2]) : null, sn = ev ? ev.sn : ho ? ho.season : "";
    if (SEASONS[sn]) setSeason(sn);
    if (ev) selectKey("e:" + ev.id, "list"); else if (ho) selectKey("i:" + ho.id, "list");
  }
  if (SEASONS[h]) setSeason(h);
  if (h === "showcase") location.replace("/add-house?s=" + state.season); if (h === "night") setTab("plan");
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
let wasPhone = isPhone(); matchMedia("(max-width:860px)").addEventListener("change", () => { if (wasPhone !== isPhone()) { wasPhone = isPhone(); renderPanel(); } });
let rT; addEventListener("resize", () => { pinBox = null; clearTimeout(rT); rT = setTimeout(() => { setSheet(sheetState); renderPanel(); }, 120); });
load();
