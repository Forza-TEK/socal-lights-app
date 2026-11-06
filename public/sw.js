// SoCal Lights service worker: keeps the app installable, shows a friendly page when offline, and keeps the last event list.
// It is registered from every page (the map and, through footer.js, every other page), so a page you have opened once opens again with no signal.
// Pages, scripts and data always come from the network first, so an update goes live the moment it is deployed;
// the cache is only a fallback when there is no connection (or the connection is so slow it has not answered in 6 seconds and a saved copy exists).
// Not cached: map tiles and photos (only the map library itself, so the page does not break without it), /api/* except the two lists below and the details of events you opened, /admin.
const V = "scl-6";
// opened events keep their full details (/api/events/<id>: the blurb and link the list leaves out) in a cache of their own, so the list cache, the offline page (which reads the newest "scl-" cache) and the page limit stay as they were
const DV = "scld-5", KEEP_D = 120;
const isDetail = (u) => /^\/api\/events\/[^/]+$/.test(u.pathname);
// the event and house lists are also kept, so the list still opens with no signal (map tiles and photos are not)
const DATA = ["/api/events", "/api/posts"];
// Cloudflare Pages answers /offline.html with a redirect to /offline, and a redirected response cannot be shown for a page navigation (it fails with a blank error), so the clean address is the one saved.
const OFFLINE = "/offline";
const SHELL = [OFFLINE, "/img/icon-192.png"];                                  // must be cached for the worker to install
const LIBS = ["/vendor/maplibre-gl-4.7.1.js", "/vendor/maplibre-gl-4.7.1.css"];                // our own copy of the map library: the file name carries the version, so it is answered from the cache first and saved when the worker installs
const WARM = ["/", "/contests", "/pricing", "/privacy", "/terms", "/tutorials", ...DATA, ...LIBS]; // saved on install when they answer; a failure here never blocks the install
const LIB = /^https:\/\/unpkg\.com\/maplibre-gl@[\d.]+\/dist\/maplibre-gl\.(js|css)$/;   // the map library (cross-origin): cache first, it never changes for a version
const KEEP = 80;                                                                         // most saved pages; the oldest beyond this are dropped
const SLOW_MS = 6000;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then(async (c) => { await c.addAll(SHELL); await Promise.all(WARM.map((u) => fetch(u, { cache: "reload" }).then((res) => { if (res.ok && !res.redirected) return c.put(u, res); }).catch(() => {}))); }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== DV).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

const worth = (r, u, res) => res && res.ok && !res.redirected && (r.mode === "navigate" || DATA.includes(u.pathname) || isDetail(u) || /\.(js|css|webmanifest)$/.test(u.pathname));
async function keep(r, res, u) {
  if (isDetail(u)) { const d = await caches.open(DV); await d.put(r, res); const ds = await d.keys(); for (const k of ds.slice(0, Math.max(0, ds.length - KEEP_D))) await d.delete(k); return; }
  const c = await caches.open(V); await c.put(r, res);
  const ks = await c.keys(); // drop the oldest saved pages when there are too many (the fixed ones are never dropped)
  const fixed = new Set([...SHELL, ...WARM].map((p) => new URL(p, self.location.origin).href));
  for (const k of ks.slice(0, Math.max(0, ks.length - KEEP))) if (!fixed.has(k.url)) await c.delete(k);
}
const saved = (r) => caches.match(r).then((m) => m || (r.mode === "navigate" ? caches.match(r, { ignoreSearch: true }) : undefined));

self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  if (u.origin !== location.origin) { // only the map library from unpkg
    if (LIB.test(r.url)) e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); } return res; })));
    return;
  }
  if (LIBS.includes(u.pathname)) { e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res && res.ok) { const copy = res.clone(); e.waitUntil(caches.open(V).then((c) => c.put(r, copy))); } return res; }))); return; }
  if ((u.pathname.startsWith("/api/") && !DATA.includes(u.pathname) && !isDetail(u)) || u.pathname.startsWith("/admin")) return;
  // a query string on the events list (?all=1, ?ended=1) is another request; only the plain one is kept
  e.respondWith((async () => {
    const fromNet = fetch(r).then((res) => { if (worth(r, u, res)) e.waitUntil(keep(r, res.clone(), u)); return res; });
    const have = await saved(r);
    try {
      if (!have) return await fromNet;
      // a saved copy exists: use the network, but not if it is stuck (a weak signal is the same as none)
      return await Promise.race([fromNet, new Promise((_, no) => setTimeout(() => no(new Error("slow")), SLOW_MS))]);
    } catch {
      fromNet.catch(() => {});
      return have || (r.mode === "navigate" ? (await caches.match(OFFLINE)) || Response.error() : Response.error());
    }
  })());
});
