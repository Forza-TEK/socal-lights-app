// Counts this page view (once per tab session). It sends only the page address; nothing about you.
(() => { try {
  if (navigator.webdriver || /^\/admin/.test(location.pathname)) return;
  const k = "scl-hit:" + location.pathname; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1");
  // Campaign attribution: a link ending in ?ref=<code> (letters, digits, hyphens, up to 20) counts one landing for that code (one number per day; nothing about you).
  try { const r = new URLSearchParams(location.search).get("ref"); if (/^[a-z0-9-]{1,20}$/i.test(r || "") && !sessionStorage.getItem("scl-ref")) { sessionStorage.setItem("scl-ref", r.toLowerCase()); const rb = JSON.stringify({ k: "ref:" + r.toLowerCase() }); if (navigator.sendBeacon) navigator.sendBeacon("/api/visit", new Blob([rb], { type: "application/json" })); else fetch("/api/visit", { method: "POST", headers: { "content-type": "application/json" }, body: rb, keepalive: true }); } } catch {}
  // One "new visit" per browser tab session (the first page counted in it), so views and visits can be compared
  try { if (!sessionStorage.getItem("scl-visit")) { sessionStorage.setItem("scl-visit", "1"); const vb = JSON.stringify({ k: "fn:visit" }); if (navigator.sendBeacon) navigator.sendBeacon("/api/visit", new Blob([vb], { type: "application/json" })); else fetch("/api/visit", { method: "POST", headers: { "content-type": "application/json" }, body: vb, keepalive: true }); } } catch {}
  const body = JSON.stringify({ p: location.pathname });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" })); else fetch("/api/visit", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
} catch {} })();
