// The "Get the weekly list" box on city and event pages (see subscribeBox in functions/_lib/shell.js).
// It posts to the same /api/alerts the map's weekly email uses: a confirmation link comes by email, nothing is sent before it is clicked.
// Turnstile (the same spam check as the map) loads when the field is first used, and stays out of sight unless it needs to ask.
(function () {
  var f = document.querySelector("form[data-sub-form]"); if (!f) return;
  var key = f.dataset.sitekey, msg = f.querySelector(".sub-msg"), btn = f.querySelector("button[type=submit]"), ts = null, wid = null;
  var say = function (t) { msg.textContent = t; };
  function turnstile() {
    if (!key) return Promise.resolve("");
    if (ts) return ts;
    ts = new Promise(function (done) {
      var go = function () {
        try { wid = window.turnstile.render(f.querySelector(".sub-ts"), { sitekey: key, appearance: "interaction-only", callback: done, "error-callback": function () { done(""); } }); } catch (e) { done(""); }
      };
      if (window.turnstile) return go();
      var s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = go; s.onerror = function () { done(""); };
      document.head.appendChild(s);
    });
    return ts;
  }
  f.addEventListener("focusin", function () { turnstile(); }, { once: true });
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = f.elements.email.value.trim();
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) { say("Enter a valid email address."); f.elements.email.focus(); return; }
    btn.disabled = true; say("Sending…");
    var wait = new Promise(function (r) { setTimeout(function () { r(""); }, 12000); });
    Promise.race([turnstile(), wait]).then(function (token) {
      return fetch("/api/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email, city: f.dataset.city, radius: 10, consent: true, website: f.elements.website.value, src: f.dataset.src, "cf-turnstile-response": token }) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return [r.ok, j]; }); })
      .then(function (a) {
        if (a[0]) { f.innerHTML = '<p class="sub-msg" role="status">' + (a[1].already ? "You are already signed up. We updated your city." : "Almost done. Check your email and tap the link to confirm.") + "</p>"; return; }
        say(a[1].error || "That did not work. Please try again."); btn.disabled = false;
        if (wid !== null && window.turnstile) { try { window.turnstile.remove(wid); } catch (e) {} wid = null; ts = null; } // a used token cannot be sent twice: the next try asks for a fresh one
      })
      .catch(function () { say("No connection. Please try again."); btn.disabled = false; });
  });
})();
