// SoCal Lights service worker: keeps the app installable, shows a friendly page when offline, and keeps the last event list.
// Pages, scripts and data always come from the network first, so an update goes live the moment it is deployed;
// the cache is only a fallback when there is no connection. Map tiles and photos are not cached here.
const V = "scl-2";
// the event and house lists are also kept, so the list still opens with no signal (map tiles and photos are not)
const DATA = ["/api/events", "/api/posts"];
const SHELL = ["/", "/offline.html", "/img/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || (u.pathname.startsWith("/api/") && !DATA.includes(u.pathname)) || u.pathname.startsWith("/admin")) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok && (r.mode === "navigate" || DATA.includes(u.pathname) || /\.(js|css|webmanifest)$/.test(u.pathname))) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r).then((m) => m || (r.mode === "navigate" ? caches.match("/offline.html") : Response.error()))));
});
