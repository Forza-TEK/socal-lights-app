// Public home and event pages are cached for everyone. When the signed-in visitor owns the record, show a bar with a way to edit it,
// and on a "not found" page say that their own home is waiting for review or taken down. Loaded with data-ref="h:<id>" or "e:<id>".
(function () {
  var s = document.currentScript, ref = s && s.getAttribute("data-ref"); if (!ref) return;
  fetch("/api/me/owns?ref=" + encodeURIComponent(ref), { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.owned) return;
    var main = document.querySelector("main"); if (!main) return;
    var note = main.querySelector(".note"), kind = j.kind === "event" ? "event" : "home";
    var what = j.status === "pending" ? "is waiting for review, so it isn't public yet" : j.status === "paused" ? "is taken down from the map" : j.status === "declined" ? "was not accepted" : j.contest ? "is a contest entry" : "is live";
    var bar = document.createElement("div");
    bar.setAttribute("role", "status");
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:12px auto;max-width:960px;padding:12px 16px;border:1.5px solid currentColor;border-radius:12px;font-size:15px";
    bar.innerHTML = "<span>This is your " + kind + " and it " + what + ".</span>";
    var a = document.createElement("a"); a.href = "/profile"; a.className = "btn go"; a.textContent = "Edit in your profile"; bar.appendChild(a);
    if (note) { var h = note.querySelector("h1"), p = note.querySelector(".sub"); if (h) h.textContent = "This " + kind + " isn't public right now"; if (p) p.remove(); note.insertBefore(bar, note.firstChild.nextSibling); }
    else main.insertBefore(bar, main.firstChild);
  }).catch(function () {});
})();
