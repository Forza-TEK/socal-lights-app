// Copyright line and links at the bottom of every page except the map (the map has its own, in the credit pill and under the Places list).
(function () {
  if (document.getElementById("sitefoot")) return;
  var y = new Date().getFullYear();
  var css = ".sitefoot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 18px;margin:36px auto 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(128,128,128,.28));font:400 13px/1.5 var(--font,system-ui,sans-serif);color:var(--muted,#6b6760);text-align:center}"
    + ".sitefoot .sf-l{display:inline-flex;gap:16px}.sitefoot a{color:inherit;text-underline-offset:3px;min-height:24px;display:inline-flex;align-items:center}.sitefoot a:hover{color:var(--ink,inherit)}";
  var add = function () {
    var host = document.querySelector("main") || document.querySelector(".sh-content") || document.body;
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    var f = document.createElement("footer"); f.id = "sitefoot"; f.className = "sitefoot";
    f.innerHTML = "<span>© " + y + " Forza-TEK. SoCal Lights. All rights reserved.</span><span class=\"sf-l\"><a href=\"/pricing\">Pricing</a><a href=\"/privacy\">Privacy</a><a href=\"/terms\">Terms</a><a href=\"mailto:info@socallights.app\">Contact</a></span>";
    host.appendChild(f);
  };
  if (document.readyState === "complete") add(); else window.addEventListener("load", add);
})();
