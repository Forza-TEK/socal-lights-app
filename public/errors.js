// Sends a short note to /api/client-error when one of our own scripts throws (at most 3 per page load); see functions/api/client-error.js. Nothing personal is sent.
(function () {
  var n = 0;
  function send(m, f, l) {
    if (n++ >= 3) return;
    try { var b = JSON.stringify({ m: String(m).slice(0, 160), f: String(f || "").replace(/^.*\//, "").replace(/[?#].*$/, "").slice(0, 60), l: l || 0, p: location.pathname.slice(0, 80) }); if (navigator.sendBeacon) navigator.sendBeacon("/api/client-error", new Blob([b], { type: "application/json" })); } catch (e) {}
  }
  addEventListener("error", function (e) { if (!e.message || (e.filename && e.filename.indexOf(location.origin) !== 0)) return; send(e.message, e.filename, e.lineno); });
  addEventListener("unhandledrejection", function (e) { var r = e.reason; send((r && r.message) || String(r), "", 0); });
})();
