// Counts this page view (once per tab session). It sends only the page address; nothing about you.
(() => { try {
  if (navigator.webdriver || /^\/admin/.test(location.pathname)) return;
  const k = "scl-hit:" + location.pathname; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1");
  const body = JSON.stringify({ p: location.pathname });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" })); else fetch("/api/visit", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
} catch {} })();
