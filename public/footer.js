// Copyright line and links at the bottom of every page except the map (the map has its own, in the credit pill and under the Places list).
(function () {
  // every page registers the offline worker (the map does it in index.html), so any page you have opened once opens again with no signal
  try { if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); }); } catch (e) {}
  // "Skip to the content": the first Tab stop on every page that has a main area (the map has its own skip link)
  var skip = function () {
    try {
      var m = document.querySelector("main"); if (!m || document.querySelector(".skiplink")) return;
      if (!m.id) m.id = "main";
      m.setAttribute("tabindex", "-1"); m.style.outline = "none";
      var st = document.createElement("style");
      st.textContent = ".skiplink{position:absolute;left:12px;top:-60px;z-index:1000;padding:12px 18px;border-radius:8px;background:var(--ink,#14161b);color:var(--bg,#fff);font:600 15px/1.2 var(--font,system-ui,sans-serif);text-decoration:none}.skiplink:focus{top:12px;outline:3px solid var(--season,var(--accent,#2a5bd7));outline-offset:2px}";
      document.head.appendChild(st);
      var a = document.createElement("a"); a.className = "skiplink"; a.href = "#" + m.id; a.textContent = "Skip to the content";
      a.addEventListener("click", function () { m.focus(); });
      document.body.insertBefore(a, document.body.firstChild);
    } catch (e) {}
  };
  if (document.readyState === "complete") skip(); else window.addEventListener("load", skip);
  if (document.getElementById("sitefoot")) return;
  var y = new Date().getFullYear();
  var css = ".sitefoot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 18px;margin:36px auto 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(128,128,128,.28));font:400 13px/1.5 var(--font,system-ui,sans-serif);color:var(--muted,#6b6760);text-align:center}"
    + ".sitefoot .sf-l{display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:center}.sitefoot a{color:inherit;text-underline-offset:3px;min-height:44px;min-width:44px;padding:0 4px;justify-content:center;display:inline-flex;align-items:center}.sitefoot a:hover{color:var(--ink,inherit)}";
  var add = function () {
    var host = document.querySelector("main") || document.querySelector(".sh-content") || document.body;
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    var f = document.createElement("footer"); f.id = "sitefoot"; f.className = "sitefoot";
    f.innerHTML = "<span>© " + y + " Forza-TEK. SoCal Lights. All rights reserved.</span><span class=\"sf-l\"><a href=\"/pricing\">Pricing</a><a href=\"/privacy\">Privacy</a><a href=\"/terms\">Terms</a><a href=\"mailto:info@socallights.app\">Contact</a></span>";
    host.appendChild(f);
  };
  if (document.readyState === "complete") add(); else window.addEventListener("load", add);
})();
