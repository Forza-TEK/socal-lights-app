// One scrolling tab row for the whole site (Admin tab rows and the Pricing audience tabs).
// A row of tabs that is wider than its box scrolls sideways; this fades the edge that has more tabs beyond it, so a cut-off tab reads as "swipe for more"
// instead of as a mistake, and brings the chosen tab into view. It needs no markup change: add data-scrolltabs to a row (Admin's .seg rows get it automatically).
// Self-contained: it injects its own small stylesheet, works as a plain <script> and as a module, and does nothing when the row fits.
(function () {
  if (window.scrollTabs) return;
  var SEL = "[data-scrolltabs], .seg";
  var st = document.createElement("style");
  st.textContent =
    "[data-scrolltabs][data-fade],.seg[data-fade]{--stf:36px}" +
    "[data-fade=end]{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - var(--stf)),transparent);mask-image:linear-gradient(to right,#000 calc(100% - var(--stf)),transparent)}" +
    "[data-fade=start]{-webkit-mask-image:linear-gradient(to left,#000 calc(100% - var(--stf)),transparent);mask-image:linear-gradient(to left,#000 calc(100% - var(--stf)),transparent)}" +
    "[data-fade=both]{-webkit-mask-image:linear-gradient(to right,transparent,#000 var(--stf),#000 calc(100% - var(--stf)),transparent);mask-image:linear-gradient(to right,transparent,#000 var(--stf),#000 calc(100% - var(--stf)),transparent)}";
  (document.head || document.documentElement).appendChild(st);

  function paint(el) {
    var max = el.scrollWidth - el.clientWidth, x = Math.abs(el.scrollLeft), f = "";
    if (max > 2) f = x <= 2 ? "end" : x >= max - 2 ? "start" : "both";
    if ((el.getAttribute("data-fade") || "") !== f) { if (f) el.setAttribute("data-fade", f); else el.removeAttribute("data-fade"); }
  }
  // Keep the chosen tab inside the visible part of the row
  function reveal(el) {
    var on = el.querySelector('[aria-pressed="true"],[aria-selected="true"],[aria-current="page"]');
    if (!on || el.scrollWidth <= el.clientWidth + 2) return;
    var l = on.offsetLeft - el.offsetLeft, r = l + on.offsetWidth, pad = 36;
    if (l < el.scrollLeft + pad) el.scrollLeft = Math.max(0, l - pad);
    else if (r > el.scrollLeft + el.clientWidth - pad) el.scrollLeft = r - el.clientWidth + pad;
  }
  function enhance(el) {
    if (el.__st) { paint(el); return; }
    el.__st = 1;
    el.addEventListener("scroll", function () { paint(el); }, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(function () { paint(el); }).observe(el);
    reveal(el); paint(el);
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches(SEL)) enhance(root);
    var all = root.querySelectorAll ? root.querySelectorAll(SEL) : [];
    for (var i = 0; i < all.length; i++) enhance(all[i]);
  }
  window.scrollTabs = function (el) { if (el) { el.setAttribute("data-scrolltabs", ""); enhance(el); reveal(el); paint(el); } };
  function start() {
    scan(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) scan(ms[i].addedNodes[j]);
    }).observe(document.body, { childList: true, subtree: true });
    addEventListener("load", function () { document.querySelectorAll(SEL).forEach(function (e) { reveal(e); paint(e); }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { document.querySelectorAll(SEL).forEach(paint); });
  }
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
