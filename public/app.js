// SoCal Lights Finder — public map app
import { CITY } from "/cities.js";
import { SEASONS, TYPE_SHORT, defaultSeason } from "/seasons.js";

/* ---------- constants & helpers ---------- */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SOCAL = [[-120.15, 32.5], [-115.45, 35.0]];
const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
// Today in Southern California, as YYYY-MM-DD
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
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
function safeUrl(u) { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } }
const miles = (a, b) => { const R = 3958.8, r = (x) => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

/* ---------- state ---------- */
let E = [], SHOW = [], CONFIG = {};
const state = { season: defaultSeason(TODAY), q: "", date: "", city: "", radius: 10, counties: new Set(), cost: "all", type: "", conf: false, layers: { events: true, inst: true }, tab: "events", inView: true, sel: null, hot: null, detail: null, start: "" };
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
const map = new maplibregl.Map({ container: "map", style: MAP_STYLE, bounds: SOCAL, fitBoundsOptions: { padding: 40 }, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false }), "top-right");

function padding() {
  const ph = isPhone();
  return { top: ph ? 120 : 118, left: 24, right: ph ? 24 : (parseFloat(cssVar("--panel-w")) || 0) + 48, bottom: ph ? sheetVisible() + 16 : 24 };
}
function mapArea() { const p = padding(); return { x0: p.left - 24, y0: p.top - 10, x1: innerWidth - p.right + 24, y1: innerHeight - p.bottom + 16 }; }
function fitSoCal(animate) { map.fitBounds(SOCAL, { padding: padding(), duration: animate ? 600 : 0 }); }
function easeToPoint(lng, lat, minZoom = 12) { map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), minZoom), padding: padding(), duration: 600 }); }

let mapReady = false;
// Add our layers as soon as the base style is parsed ("style.load"), not on "load",
// which waits for every base-map tile and can stall on a slow or failed tile request.
map.on("style.load", initLayers);
map.on("load", initLayers);
function initLayers() {
  if (mapReady || map.getSource("pts")) return;
  const C = { ink: cssVar("--ink") || "#1d2433", free: "#1f6b4f", paid: "#c9361f", fav: "#b7790f", inst: "#2f6fa8" };
  map.addSource("pts", { type: "geojson", data: fc([]), cluster: true, clusterMaxZoom: 11, clusterRadius: 44 });
  map.addSource("hl", { type: "geojson", data: fc([]) });
  map.addSource("route", { type: "geojson", data: fc([]) });
  map.addSource("stops", { type: "geojson", data: fc([]) });
  map.addLayer({ id: "clusters", type: "circle", source: "pts", filter: ["has", "point_count"],
    paint: { "circle-color": "#1d2433", "circle-opacity": 0.88, "circle-radius": ["step", ["get", "point_count"], 15, 8, 19, 20, 24], "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
  map.addLayer({ id: "cluster-count", type: "symbol", source: "pts", filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13 }, paint: { "text-color": "#ffffff" } });
  map.addLayer({ id: "pt", type: "circle", source: "pts", filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": ["match", ["get", "cat"], "free", C.free, "paid", C.paid, "fav", C.fav, "inst", C.inst, C.paid],
      "circle-radius": ["case", ["==", ["get", "cat"], "inst"], 8.5, ["==", ["get", "cat"], "fav"], 8.5, 7.5],
      "circle-stroke-width": ["case", ["==", ["get", "cat"], "inst"], 3, 2.5], "circle-stroke-color": "#ffffff" } });
  map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": C.fav, "line-width": 3.5, "line-dasharray": [2, 2] } });
  map.addLayer({ id: "stops", type: "circle", source: "stops", paint: { "circle-color": C.fav, "circle-radius": 12, "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" } });
  map.addLayer({ id: "stops-num", type: "symbol", source: "stops", layout: { "text-field": ["get", "num"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
  map.addLayer({ id: "hl", type: "circle", source: "hl", paint: { "circle-color": ["match", ["get", "cat"], "free", C.free, "paid", C.paid, "fav", C.fav, "inst", C.inst, C.paid], "circle-radius": 11, "circle-stroke-width": 3, "circle-stroke-color": "#1d2433" } });
  map.addLayer({ id: "hl-label", type: "symbol", source: "hl",
    layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-anchor": "left", "text-offset": [1.2, 0], "text-allow-overlap": true, "text-max-width": 16 },
    paint: { "text-color": "#1d2433", "text-halo-color": "#ffffff", "text-halo-width": 2.2 } });

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

function drawMap() {
  if (!mapReady) return;
  const feats = [];
  if (state.tab !== "plan") {
    if (state.layers.events) E.filter(evMatch).forEach((e) => feats.push(pt(e.lng, e.lat, { key: "e:" + e.id, cat: favs.has(e.id) ? "fav" : e.free ? "free" : "paid" })));
    if (state.layers.inst) SHOW.filter(instMatch).forEach((p) => feats.push(pt(p.plng, p.plat, { key: "i:" + p.id, cat: "inst" })));
  }
  map.getSource("pts").setData(fc(feats));
  // planner route
  const st = state.tab === "plan" ? routeStops() : [];
  const o = state.tab === "plan" && state.start && CITY[state.start] ? [[CITY[state.start][1], CITY[state.start][0]]] : [];
  const coords = [...o, ...st.map((e) => [e.lng, e.lat])];
  map.getSource("route").setData(fc(coords.length > 1 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] : []));
  map.getSource("stops").setData(fc(st.map((e, i) => pt(e.lng, e.lat, { key: "e:" + e.id, num: String(i + 1) }))));
  drawHL();
}
function drawHL() {
  if (!mapReady) return;
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
function routeStops() {
  const fl = E.filter((e) => favs.has(e.id)); if (!fl.length) return [];
  const o = state.start && CITY[state.start] ? { lat: CITY[state.start][0], lng: CITY[state.start][1] } : null;
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
  else { renderPreview(); if (isPhone() && sheetState === "full") setSheet("peek"); }
  drawHL(); markItems();
}
function renderPreview() {
  const pv = $("#preview"), it = findKey(state.sel);
  if (!it || (state.detail === state.sel && !isPhone())) { pv.hidden = true; return; }
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
function setTab(t) { state.tab = t; state.detail = null; ["events", "inst", "plan"].forEach((k) => $("#t-" + k).setAttribute("aria-selected", k === t)); renderPanel(); drawMap(); if (t === "plan") fitRoute(); }
$("#t-events").onclick = () => setTab("events"); $("#t-inst").onclick = () => setTab("inst"); $("#t-plan").onclick = () => setTab("plan");
function fitRoute() { const st = routeStops(); if (st.length < 2 || !mapReady) return; const b = new maplibregl.LngLatBounds(); st.forEach((e) => b.extend([e.lng, e.lat])); map.fitBounds(b, { padding: padding(), maxZoom: 13, duration: 600 }); }
function inView(lng, lat) { if (!state.inView || !mapReady) return true; const a = mapArea(), q = map.project([lng, lat]); return q.x >= a.x0 && q.x <= a.x1 && q.y >= a.y0 && q.y <= a.y1; }
let listTimer = null; function scheduleList() { clearTimeout(listTimer); listTimer = setTimeout(() => { if (!state.detail && state.tab !== "plan") renderPanel(); }, 80); }
function counts() { $("#n-events").textContent = E.filter(evMatch).length; $("#n-inst").textContent = SHOW.filter(instMatch).length; $("#n-plan").textContent = favs.size; }
function datetile(ev) {
  // Running now: "THRU 31 OCT". One night: "OCT 31 1 night". Upcoming: "NOV 27 opens".
  const live = ev.s <= TODAY && ev.e >= TODAY && ev.s !== ev.e;
  const [, m, d] = (live ? ev.e : ev.s).split("-").map(Number);
  const top = live ? "thru" : M[m - 1];
  const bottom = live ? M[m - 1] : ev.s === ev.e ? (ev.s === TODAY ? "today" : "1 night") : "opens";
  return `<div class="datetile${ev.free ? " free" : ""}${live ? " live" : ""}"><span>${top}</span><b>${d}</b><span>${bottom}</span></div>`;
}
const effStart = (e) => (e.s > TODAY ? e.s : TODAY);
function evItem(ev) {
  const f = favs.has(ev.id), k = "e:" + ev.id;
  return `<article class="item${state.sel === k ? " sel" : ""}" data-key="${k}">${datetile(ev)}<div style="min-width:0"><h3>${esc(ev.n)}</h3><div class="meta">${esc(ev.city)} · ${esc(ev.c)} County</div><div class="dates">${range(ev)}</div><div class="tags"><span class="tag ${ev.free ? "free" : "paid"}">${esc(ev.p)}</span><span class="tag ${ev.st === "c" ? "conf" : "exp"}">${ev.st === "c" ? "Confirmed" : "Expected"}</span></div></div><button class="star" type="button" data-fav="${esc(ev.id)}" aria-pressed="${f}" aria-label="${f ? "Remove from" : "Add to"} my night">${f ? "★" : "☆"}</button></article>`;
}
function instItem(p) {
  const ph = p.photos || [], k = "i:" + p.id;
  return `<article class="item${state.sel === k ? " sel" : ""}" data-key="${esc(k)}"><div class="thumb">${ph.length ? `<img src="${photoUrl(ph[0])}" alt="" loading="lazy">` : "No photo"}</div><div style="min-width:0"><h3>${esc(p.title)}</h3><div class="meta">${esc(p.biz)} · ${esc(p.city)}</div><div class="tags"><span class="tag ice">Showcased house</span>${ph.length > 1 ? `<span class="tag">${ph.length} photos</span>` : ""}</div></div><span></span></article>`;
}
function renderPanel() {
  counts();
  const head = $("#phead"), body = $("#pbody");
  if (state.detail) { head.hidden = true; body.innerHTML = detailHtml(state.detail); wireDetail(); return; }
  head.hidden = false;
  const limit = `<label class="toggle"><input type="checkbox" id="inview" ${state.inView ? "checked" : ""}> Limit to map</label>`;
  if (state.tab === "events") {
    const all = E.filter(evMatch).sort((a, b) => effStart(a).localeCompare(effStart(b)) || a.e.localeCompare(b.e) || a.n.localeCompare(b.n));
    const vis = state.layers.events ? all.filter((e) => inView(e.lng, e.lat)) : [];
    head.innerHTML = `<span><b>${vis.length}</b> ${state.inView ? "in map view" : "events"}${state.date ? " · open " + fmt(state.date) : ""}</span>${limit}`;
    body.innerHTML = !state.layers.events ? `<div class="empty">The events layer is off. Turn it on under Layers.</div>`
      : vis.length ? `<div class="list">${vis.map(evItem).join("")}</div>`
      : `<div class="empty">No events ${state.inView ? "in this part of the map" : "match these filters"}.<button class="linkbtn" type="button" id="showall">Show all of Southern California</button></div>`;
  } else if (state.tab === "inst") {
    const vis = SHOW.filter(instMatch).filter((p) => inView(p.plng, p.plat));
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
    head.innerHTML = `<span><b>${favs.size}</b> starred</span><label class="toggle">Start from <select id="startFrom" style="border:1px solid var(--line);border-radius:6px;background:var(--bg);padding:2px 4px;max-width:150px"><option value="">First stop</option>${Object.keys(CITY).sort().map((c) => `<option ${c === state.start ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>`;
    $("#startFrom").onchange = (e) => { state.start = e.target.value; renderPanel(); drawMap(); fitRoute(); };
    if (!st.length) { body.innerHTML = `<div class="empty">Tap ☆ on any event to add it. Your stops get a sensible driving order, a route on the map, and a Google Maps link.</div>`; return; }
    let html = "", prev = state.start && CITY[state.start] ? { lat: CITY[state.start][0], lng: CITY[state.start][1] } : null, total = 0;
    st.forEach((ev) => { if (prev) { const m = miles(prev, ev) * 1.3; total += m; html += `<div class="meta" style="padding:2px 0 2px 74px;font-family:var(--f-mono);font-size:11.5px">↓ about ${Math.round(m)} mi · ~${Math.max(5, Math.round(m * 1.6))} min</div>`; } html += evItem(ev); prev = ev; });
    const pts = st.map((e) => e.lat + "," + e.lng), o = state.start && CITY[state.start] ? CITY[state.start].join(",") : pts[0];
    const way = (state.start && CITY[state.start] ? pts.slice(0, -1) : pts.slice(1, -1)).join("|");
    const url = "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(o) + "&destination=" + encodeURIComponent(pts[pts.length - 1]) + (way ? "&waypoints=" + encodeURIComponent(way) : "");
    const nights = st.filter((e) => e.s === e.e).map((e) => fmt(e.s));
    body.innerHTML = `<div class="list">${html}</div><div class="row" style="margin-top:14px"><a class="btn" href="${url}" target="_blank" rel="noopener">Open route in Google Maps ↗</a><span class="meta">About ${Math.round(total)} driving miles (estimate)</span></div>${nights.length ? `<p class="meta">One-night events on your list: ${nights.join(", ")}.</p>` : ""}`;
  }
  const iv = $("#inview"); if (iv) iv.onchange = (e) => { state.inView = e.target.checked; renderPanel(); };
  const sa = $("#showall"); if (sa) sa.onclick = () => { state.city = ""; applyFilters(); fitSoCal(true); };
}
$("#pbody").addEventListener("click", (e) => {
  const f = e.target.closest("[data-fav]");
  if (f) { e.stopPropagation(); const id = f.dataset.fav; favs.has(id) ? favs.delete(id) : favs.add(id); saveFavs(); renderPanel(); drawMap(); return; }
  const it = e.target.closest(".item"); if (it && !e.target.closest("button,a,input,select")) selectKey(it.dataset.key, "list");
});
$("#pbody").addEventListener("mouseover", (e) => { const it = e.target.closest(".item"); setHot(it ? it.dataset.key : null); });
$("#pbody").addEventListener("mouseleave", () => setHot(null));
function markItems() { document.querySelectorAll(".item").forEach((el) => el.classList.toggle("sel", el.dataset.key === state.sel)); }

function openDetail(k) { state.detail = k; state.sel = k; renderPanel(); renderPreview(); $("#pbody").scrollTop = 0; if (isPhone()) setSheet(sheetState === "full" ? "full" : "half"); drawHL(); }
function detailHtml(k) {
  const it = findKey(k); if (!it) return "";
  if (it.kind === "ev") {
    const ev = it.ev, f = favs.has(ev.id), url = safeUrl(ev.u);
    return `<div class="detail"><button class="back" type="button" id="back">← Back to results</button>
    <div class="tags"><span class="tag ${ev.st === "c" ? "conf" : "exp"}">${ev.st === "c" ? "2026 dates confirmed" : "Expected, based on 2025"}</span><span class="tag">${TYPE_SHORT[ev.t] || ""}</span></div>
    <h2>${esc(ev.n)}</h2><div class="meta">${esc(ev.city)} · ${esc(ev.c)} County</div>
    <p style="margin:0">${esc(ev.b)}</p>
    <dl class="facts"><dt>Dates</dt><dd class="dates" style="font-size:13px">${range(ev)}</dd><dt>Hours</dt><dd>${esc(ev.h)}</dd><dt>Cost</dt><dd>${esc(ev.p)}</dd></dl>
    <div class="row"><button class="btn${f ? " ghost" : ""}" type="button" data-fav="${esc(ev.id)}" aria-pressed="${f}">${f ? "★ In my night" : "☆ Add to my night"}</button>${url ? `<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">Event info ↗</a>` : ""}<a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${ev.lat},${ev.lng}" target="_blank" rel="noopener">Directions ↗</a></div>
    ${ev.st !== "c" ? `<p class="meta">These dates follow last year's schedule. Check the event link before you go.</p>` : ""}</div>`;
  }
  const p = it.p, ph = p.photos || [], web = safeUrl(p.web || "");
  return `<div class="detail"><button class="back" type="button" id="back">← Back to results</button>
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
function renderSeasonBar() {
  const bar = $("#seasonbar"); if (!bar) return;
  bar.innerHTML = Object.entries(SEASONS).map(([k, v]) => `<button type="button" role="tab" data-season="${k}" aria-selected="${k === state.season}">${esc(v.short)}</button>`).join("");
  bar.querySelectorAll("[data-season]").forEach((b) => (b.onclick = () => setSeason(b.dataset.season)));
  document.documentElement.dataset.season = state.season;
}
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
  state.detail = null; renderPanel(); drawMap(); renderPreview();
}
let qT; $("#q").oninput = (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 120); };

/* ---------- bottom sheet (phone) ---------- */
let sheetState = "peek";
function sheetVisible() { if (!isPhone()) return 0; const ph = $("#panel").offsetHeight || innerHeight * 0.8; return sheetState === "peek" ? Math.min(148, ph) : sheetState === "half" ? Math.round(innerHeight * 0.48) : ph; }
function setSheet(s) {
  sheetState = s; const panel = $("#panel");
  if (!isPhone()) { panel.style.removeProperty("--sheet-y"); return; }
  panel.style.setProperty("--sheet-y", panel.offsetHeight - sheetVisible() + "px");
  document.documentElement.style.setProperty("--peek", sheetVisible() + "px");
}
(function () {
  const g = $("#grab"), panel = $("#panel"); let y0 = null, start = 0, moved = false;
  g.addEventListener("pointerdown", (e) => { if (!isPhone()) return; y0 = e.clientY; start = panel.offsetHeight - sheetVisible(); moved = false; panel.classList.add("dragging"); g.setPointerCapture(e.pointerId); });
  g.addEventListener("pointermove", (e) => { if (y0 === null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 4) moved = true; panel.style.setProperty("--sheet-y", Math.max(0, Math.min(panel.offsetHeight - 80, start + dy)) + "px"); });
  const up = (e) => {
    if (y0 === null) return; panel.classList.remove("dragging"); const dy = e.clientY - y0; y0 = null;
    if (!moved) { setSheet(sheetState === "peek" ? "half" : sheetState === "half" ? "full" : "peek"); return; }
    const vis = panel.offsetHeight - (start + dy), opts = [["peek", 148], ["half", innerHeight * 0.48], ["full", panel.offsetHeight]];
    opts.sort((a, b) => Math.abs(a[1] - vis) - Math.abs(b[1] - vis)); setSheet(opts[0][0]); scheduleList();
  };
  g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
  g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSheet(sheetState === "full" ? "peek" : sheetState === "half" ? "full" : "half"); } });
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
setSheet("peek");
let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { setSheet(sheetState); renderPanel(); }, 120); });
load();
