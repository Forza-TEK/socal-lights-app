/* Admin "act as": loaded into a user page opened through /admin/as (functions/admin/as.js). It sends the page's own /api/... calls to /api/admin/as/..., which run as the person
   (the ?as= value, or the owner of the contest, event, home or installer in the path), and shows a red bar so nobody forgets they are acting for someone. */
(function () {
  "use strict";
  var me = document.currentScript, q = me ? new URL(me.src).searchParams : new URLSearchParams(), AS = q.get("as") || "", LABEL = q.get("label") || AS || "the owner", HASH = q.get("hash") || "", TO = q.get("to") || "";
  var KEEP = /^\/api\/(admin|config|events|photo|help|health|heartbeat|visit|banner|alerts|archive|posts|address|stripe|sponsor-invite|home-photos)(\/|$)/; // public pages stay public
  var AUTH_OK = /^\/api\/auth\/me$/;
  function rewrite(u) {
    try {
      var url = new URL(u, location.href);
      if (url.origin !== location.origin || url.pathname.indexOf("/api/") !== 0 || KEEP.test(url.pathname)) return null;
      if (url.pathname.indexOf("/api/auth/") === 0 && !AUTH_OK.test(url.pathname)) return null;
      url.pathname = "/api/admin/as" + url.pathname.slice(4);
      if (AS && !url.searchParams.has("as")) url.searchParams.set("as", AS);
      return url.pathname + url.search;
    } catch (e) { return null; }
  }
  var native = window.fetch;
  window.fetch = function (input, init) {
    var raw = typeof input === "string" ? input : input && input.url ? input.url : "", to = raw ? rewrite(raw) : null;
    if (to) input = typeof input === "string" ? to : new Request(to, input);
    return native.call(this, input, init);
  };
  // The pages read their own address (the organizer page takes the contest from /c/<slug>/manage), so the address bar shows the page's real path while the Admin view is open.
  // (A reload then opens the plain page; use the Admin link again to come back in.) This script runs before the page's own scripts.
  if (TO && /^\/[A-Za-z0-9/_-]{1,160}$/.test(TO) && location.pathname === "/admin/as") history.replaceState(null, "", TO + location.hash);
  if (HASH && !location.hash) history.replaceState(null, "", location.pathname + location.search + "#" + HASH);
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.createElement("div");
    bar.setAttribute("role", "status");
    bar.style.cssText = "position:sticky;top:0;z-index:2147483647;background:#b00020;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:8px 14px;text-align:center";
    bar.textContent = "Admin view: you are acting as " + LABEL + ". Everything you do here is saved as them and is written to the Admin log. ";
    var back = document.createElement("a"); back.href = "/admin/"; back.textContent = "Back to Admin"; back.style.cssText = "color:#fff;text-decoration:underline";
    bar.appendChild(back);
    document.body.insertBefore(bar, document.body.firstChild);
  });
})();
