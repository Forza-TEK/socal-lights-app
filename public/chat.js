/* AI assistant widget. Loads nothing visible unless /api/config says chatEnabled (off by default; Admin > AI assistant).
   Accessible: a real button opens a modal dialog with a focus trap, Esc closes it and returns focus, replies are announced through a polite live region.
   The conversation is kept in this browser tab only (sessionStorage) so it survives moving between pages of the site; it goes when the tab closes or on "Start over". Nothing is kept on our servers.
   Replies are inserted as text, never as HTML. */
(function () {
  "use strict";
  if (window.__sclChat) return;
  window.__sclChat = true;
  var CSS = "/chat.css?v=20261111e", MAX = 500, TURNS = 6, KEEP = 40, KEY = "scl-chat";
  var store = { get: function () { try { var v = JSON.parse(sessionStorage.getItem(KEY) || "null"); return v && Array.isArray(v.log) && Array.isArray(v.h) ? v : null; } catch (e) { return null; } }, set: function (v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }, clear: function () { try { sessionStorage.removeItem(KEY); } catch (e) {} } };
  var cfgP = window.__pre && window.__pre["/api/config"];
  (cfgP || fetch("/api/config").then(function (r) { return r.json(); })).then(function (c) { if (c && c.chatEnabled) start(c); }).catch(function () {});

  function el(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    for (k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  // The AI mark: a big four-point sparkle with two small ones (built with DOM calls).
  function sparkle() {
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "18"); svg.setAttribute("height", "18"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    ["M10 3l1.9 5.1L17 10l-5.1 1.9L10 17l-1.9-5.1L3 10l5.1-1.9z", "M18.5 13l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z", "M18 2.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"].forEach(function (d) {
      var path = document.createElementNS(NS, "path"); path.setAttribute("d", d); path.setAttribute("fill", "currentColor"); svg.appendChild(path);
    });
    return svg;
  }
  // Turns a reply into DOM nodes: plain text, with our own links (https://socallights.app/... or the support email) made clickable. Everything else stays text.
  var LINK = /(https:\/\/(?:www\.)?socallights\.app(?:[\/?#][^\s)]*)?|info@socallights\.app)/gi;
  function fill(p, text) {
    var last = 0, m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(text))) {
      var raw = m[0].replace(/[.,;:!?]+$/, "");
      if (m.index > last) p.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el("a", { href: raw.indexOf("@") > 0 ? "mailto:" + raw : raw, text: raw.replace(/^https:\/\/(www\.)?socallights\.app/i, "") || "socallights.app" });
      if (raw.indexOf("@") < 0) a.setAttribute("rel", "noopener");
      p.appendChild(a);
      last = m.index + raw.length;
      LINK.lastIndex = last;
    }
    if (last < text.length) p.appendChild(document.createTextNode(text.slice(last)));
  }

  function start(cfg) {
    var link = el("link", { rel: "stylesheet", href: CSS });
    document.head.appendChild(link);
    var saved = store.get() || { h: [], log: [], v: false }, history = saved.h.slice(-KEEP), busy = false, verified = !!saved.v, token = "", widget = null, tsKey = cfg.turnstileSiteKey || "", tsLoaded = false, opener = null;

    var fab = el("button", { type: "button", class: "scl-chat-fab", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": "scl-chat" }, [
      el("span", { class: "scl-chat-fab-ic", "aria-hidden": "true" }, [sparkle()]), el("span", { text: "Ask SoCal Lights" })]);
    var title = el("h2", { id: "scl-chat-title", text: "Ask SoCal Lights (AI assistant)" });
    var close = el("button", { type: "button", class: "scl-chat-x", "aria-label": "Close the AI assistant", text: "×" });
    var reset = el("button", { type: "button", class: "scl-chat-reset", text: "Start over" });
    // Short notice with a "More info" button: the longer privacy details open only when asked for
    var note = el("div", { class: "scl-chat-note" }), noteTop = el("p", {}), more = el("button", { type: "button", class: "scl-chat-more", "aria-expanded": "false", "aria-controls": "scl-chat-more", text: "More info" });
    noteTop.appendChild(document.createTextNode("Automated AI assistant, not a person. It can be wrong, so check prices on "));
    noteTop.appendChild(el("a", { href: "/pricing", text: "Pricing" }));
    noteTop.appendChild(document.createTextNode(". "));
    noteTop.appendChild(more);
    var moreBox = el("p", { id: "scl-chat-more", hidden: "" });
    moreBox.appendChild(document.createTextNode("Please don't enter personal information in your questions; buttons below an answer ask only for what they need. Your chat stays in this browser tab only and is erased when you close the tab or tap Start over. "));
    moreBox.appendChild(el("a", { href: "/privacy#ai-assistant", text: "Privacy" }));
    moreBox.appendChild(document.createTextNode(" · "));
    moreBox.appendChild(el("a", { href: "mailto:info@socallights.app", text: "Email us" }));
    note.appendChild(noteTop); note.appendChild(moreBox);
    more.addEventListener("click", function () { var open = moreBox.hidden; moreBox.hidden = !open; more.setAttribute("aria-expanded", String(open)); more.textContent = open ? "Less info" : "More info"; });
    var log = el("div", { class: "scl-chat-log", role: "log", "aria-live": "polite", "aria-relevant": "additions", "aria-label": "Conversation", tabindex: "0" });
    var status = el("p", { class: "scl-chat-status", role: "status" });
    var chips = el("div", { class: "scl-chat-chips" });
    var ts = el("div", { class: "scl-chat-ts", hidden: "" });
    var tsNote = el("p", { class: "scl-chat-tsnote", text: "One quick check, then ask away." });
    var label = el("label", { class: "scl-chat-sr", for: "scl-chat-in", text: "Your question" });
    var input = el("textarea", { id: "scl-chat-in", rows: "2", maxlength: String(MAX), placeholder: "Ask about events, homes, how the site works, or prices", autocomplete: "off", enterkeyhint: "send" });
    var send = el("button", { type: "submit", class: "scl-chat-send", text: "Send" });
    var form = el("form", { class: "scl-chat-form" }, [label, input, send]);
    var panel = el("div", { id: "scl-chat", class: "scl-chat", role: "dialog", "aria-modal": "true", "aria-labelledby": "scl-chat-title", hidden: "" }, [
      el("div", { class: "scl-chat-head" }, [title, reset, close]), note, log, status, chips, ts, form]);
    ts.appendChild(tsNote);
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    function keep(role, text) { saved.log.push({ r: role, t: text }); saved.log = saved.log.slice(-KEEP); saved.h = history.slice(-KEEP); saved.v = verified; store.set(saved); }
    function say(role, text, quiet) {
      if (!quiet) keep(role, text);
      var p = el("p", { class: "scl-chat-msg scl-chat-" + role });
      var who = el("span", { class: "scl-chat-who", text: role === "user" ? "You: " : "SoCal Lights AI: " });
      p.appendChild(who);
      fill(p, text);
      log.appendChild(p);
      log.scrollTop = log.scrollHeight; panel.scrollTop = panel.scrollHeight; // a short window scrolls the whole panel: keep the newest message and the box in view
      return p;
    }
    // coming back from another page of the site: put the earlier conversation back (the panel stays closed until the person opens it)
    saved.log.forEach(function (m) { say(m.r, m.t, true); });
    if (saved.log.some(function (m) { return m.r === "user"; })) chips.hidden = true;
    ["How much does it cost to feature my event?", "How do I add my home?", "What events are on this weekend?"].forEach(function (q) {
      var b = el("button", { type: "button", class: "scl-chat-chip", text: q });
      b.addEventListener("click", function () { input.value = q; submit(); });
      chips.appendChild(b);
    });


    // ---- action cards (docs/ai-assistant-actions-design.md): the assistant proposes, the visitor fills in and taps. Everything is inserted as text; links must stay on this site.
    var NAV = /^\/(add-event|add-house|add-contest)$/;
    var CALL = /^\/api\/(me\/(homes|events)\/[A-Za-z0-9_-]{1,64}|submit-event|contests\/[A-Za-z0-9_-]{1,64}\/mine\?id=[A-Za-z0-9_-]{1,64}|drafts)$/;
    function callSite(call, vals) {
      var body = {}, k; for (k in (call.body || {})) body[k] = call.body[k]; for (k in vals) body[k] = vals[k];
      if (body.free === "true" || body.free === "false") body.free = body.free === "true"; // the Free or Paid choice
      var m = String(call.method || "POST").toUpperCase(); if (m !== "POST" && m !== "DELETE") m = "POST";
      return fetch(call.url, { method: m, credentials: "same-origin", headers: { "content-type": "application/json" }, body: m === "DELETE" ? undefined : JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.error == null, d: d, msg: r.status === 401 ? "Please sign in first (open Your profile), then ask me again." : (d.error || "That did not go through. Please try again, or email info@socallights.app.") }; }); })
        .catch(function () { return { ok: false, msg: "I couldn't reach the server. Please try again, or email info@socallights.app." }; });
    }
    var SAFE = /^\/(?!\/)[A-Za-z0-9\-_\/#?=.&%,]*$/;
    var seq = 0;
    function addCard(card, lastReply) {
      if (!card || typeof card !== "object") return;
      var box = el("div", { class: "scl-chat-card" });
      if (card.type === "links" && Array.isArray(card.links)) {
        box.appendChild(el("p", { class: "scl-chat-card-h", text: String(card.label || "Open") }));
        var ul = el("ul", { class: "scl-chat-card-list" });
        card.links.slice(0, 4).forEach(function (l) {
          if (!l || !SAFE.test(String(l.href || ""))) return;
          var li = el("li"), a = el("a", { href: l.href, text: String(l.label || l.href).slice(0, 80) });
          li.appendChild(a);
          if (l.sub) li.appendChild(el("span", { class: "scl-chat-card-sub", text: " " + String(l.sub).slice(0, 60) }));
          ul.appendChild(li);
        });
        if (!ul.childNodes.length) return;
        box.appendChild(ul);
      } else if (card.type === "call" && card.call && CALL.test(String(card.call.url || ""))) {
        // one confirmed call to the site's own endpoint, made with the visitor's own sign-in; the endpoint checks that the listing is theirs
        box.appendChild(el("p", { class: "scl-chat-card-h", text: String(card.label || "Confirm").slice(0, 120) }));
        if (card.summary) box.appendChild(el("p", { class: "scl-chat-card-s", text: String(card.summary).slice(0, 300) }));
        var cmsg = el("p", { class: "scl-chat-card-msg", role: "status" }), ok = el("button", { type: "button", class: "scl-chat-card-go", text: "Do it" }), nope = el("button", { type: "button", class: "scl-chat-card-no", text: "Not now" });
        ok.addEventListener("click", function () {
          if (!ok.dataset.sure) { ok.dataset.sure = "1"; ok.textContent = "Tap again to confirm"; return; }
          ok.disabled = true; cmsg.textContent = "Working…";
          callSite(card.call, {}).then(function (x) {
            if (x.ok) { box.textContent = ""; box.appendChild(el("p", { class: "scl-chat-card-done", role: "status", text: String(card.done || "Done.") })); keep("bot", String(card.done || "Done.")); history.push({ role: "assistant", content: String(card.done || "Done.") }); }
            else { ok.disabled = false; delete ok.dataset.sure; ok.textContent = "Do it"; cmsg.textContent = x.msg; }
          });
        });
        nope.addEventListener("click", function () { box.remove(); });
        box.appendChild(cmsg); box.appendChild(el("div", { class: "scl-chat-card-btns" }, [ok, nope]));
      } else if (card.type === "form" && Array.isArray(card.fields) && (NAV.test(String(card.nav || "")) || (card.call && CALL.test(String(card.call.url || ""))) || /^[a-z_]{3,30}$/.test(String(card.action || "")))) {
        var f = el("form", { class: "scl-chat-card-form", novalidate: "" }), inputs = {};
        f.appendChild(el("p", { class: "scl-chat-card-h", text: String(card.label || "Send") }));
        if (card.summary) f.appendChild(el("p", { class: "scl-chat-card-s", text: String(card.summary).slice(0, 300) }));
        card.fields.forEach(function (fd) {
          var id = "scl-cf-" + (++seq), wrap = el("div", { class: "scl-chat-card-f" }), ctl;
          if (fd.type === "checkbox") {
            ctl = el("input", { type: "checkbox", id: id });
            var lab = el("label", { for: id, class: "scl-chat-card-cb", text: " " + String(fd.label || "") }); lab.insertBefore(ctl, lab.firstChild); wrap.appendChild(lab);
          } else {
            wrap.appendChild(el("label", { for: id, text: String(fd.label || "") }));
            if (fd.type === "textarea") { ctl = el("textarea", { id: id, rows: "3", maxlength: String(fd.max || 600) }); }
            else if (fd.type === "select" && Array.isArray(fd.options)) { ctl = el("select", { id: id }); fd.options.forEach(function (o) { ctl.appendChild(el("option", { value: String(o[0]), text: String(o[1]) })); }); }
            else {
              ctl = el("input", { id: id, type: fd.type === "email" ? "email" : fd.type === "date" ? "date" : "text", maxlength: String(fd.max || 200), autocomplete: fd.type === "email" ? "email" : "off" });
              if (fd.list && Array.isArray(fd.options)) { var dl = el("datalist", { id: id + "-l" }); fd.options.slice(0, 400).forEach(function (o) { dl.appendChild(el("option", { value: String(o[0]) })); }); ctl.setAttribute("list", id + "-l"); wrap.appendChild(dl); }
            }
            if (fd.value != null) ctl.value = String(fd.value);
            wrap.appendChild(ctl);
          }
          if (fd.required) ctl.setAttribute("aria-required", "true");
          inputs[fd.name] = { ctl: ctl, fd: fd };
          f.appendChild(wrap);
        });
        var msg = el("p", { class: "scl-chat-card-msg", role: "status" });
        var go = el("button", { type: "submit", class: "scl-chat-card-go", text: String(card.go || card.label || "Send") });
        var no = el("button", { type: "button", class: "scl-chat-card-no", text: "Not now" });
        f.appendChild(msg); f.appendChild(el("div", { class: "scl-chat-card-btns" }, [go, no]));
        no.addEventListener("click", function () { box.remove(); });
        f.addEventListener("submit", function (e) {
          e.preventDefault();
          var vals = {}, bad = "";
          Object.keys(inputs).forEach(function (k) {
            var c = inputs[k].ctl, fd = inputs[k].fd, v = c.type === "checkbox" ? c.checked : String(c.value || "").trim();
            if (fd.required && (v === "" || v === false) && !bad) bad = c.type === "checkbox" ? "Please tick the box to continue." : "Please fill in: " + String(fd.label || k);
            vals[k] = v;
          });
          if (bad) { msg.textContent = bad; return; }
          if (card.call && CALL.test(String(card.call.url || ""))) { // a form that saves through the site's own endpoint with the visitor's sign-in
            go.disabled = true; msg.textContent = "Saving…";
            var cv = {}; Object.keys(vals).forEach(function (k) { if (vals[k] !== "" || (inputs[k] && inputs[k].fd.required)) cv[k] = vals[k]; });
            callSite(card.call, cv).then(function (x) {
              if (x.ok) { var dn = String((x.d && x.d.message) || card.done || "Saved."); f.remove(); box.appendChild(el("p", { class: "scl-chat-card-done", role: "status", text: dn })); keep("bot", dn); history.push({ role: "assistant", content: dn }); }
              else { go.disabled = false; msg.textContent = x.msg; }
            });
            return;
          }
          if (NAV.test(String(card.nav || ""))) { // hand-off to the form: open it with these answers; nothing is sent to our servers from here
            var qs = ["from=chat"]; Object.keys(vals).forEach(function (k) { if (vals[k] !== "" && vals[k] !== false) qs.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(vals[k]))); });
            msg.textContent = "Opening the form…"; location.href = card.nav + "?" + qs.join("&"); return;
          }
          go.disabled = true; msg.textContent = "Sending…";
          fetch("/api/chat/act", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: card.action, fields: vals, page: location.pathname, summary: lastReply || "" }) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
            .then(function (x) {
              if (x.r.ok && x.d.ok) { f.remove(); box.appendChild(el("p", { class: "scl-chat-card-done", role: "status", text: String(x.d.done || "Done. Thank you.") })); keep("bot", String(x.d.done || "Done. Thank you.")); history.push({ role: "assistant", content: String(x.d.done || "Done.") }); return; }
              go.disabled = false; msg.textContent = x.d.error || "That did not go through. Please try again, or email info@socallights.app.";
            })
            .catch(function () { go.disabled = false; msg.textContent = "I couldn't reach the server. Please try again, or email info@socallights.app."; });
        });
        box.appendChild(f);
      } else return;
      log.appendChild(box);
      log.scrollTop = log.scrollHeight;
    }

    function gate() {
      // the "I am human" check is needed once, before the first message of a visit
      var need = !verified && !!tsKey;
      ts.hidden = !need;
      send.disabled = busy || (need && !token);
      if (need && !tsLoaded) {
        tsLoaded = true;
        var s = el("script", { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", async: "" });
        s.onload = function () { if (window.turnstile) widget = window.turnstile.render(ts, { sitekey: tsKey, callback: function (t) { token = t; gate(); }, "expired-callback": function () { token = ""; gate(); } }); };
        document.head.appendChild(s);
      }
    }
    function setBusy(b) { busy = b; panel.setAttribute("aria-busy", b ? "true" : "false"); status.textContent = b ? "The AI assistant is typing…" : ""; gate(); }

    function submit() {
      var q = input.value.replace(/\s+/g, " ").trim();
      if (!q || busy) return;
      if (!verified && tsKey && !token) { status.textContent = "Please finish the quick check first."; return; }
      history.push({ role: "user", content: q.slice(0, MAX) });
      say("user", q.slice(0, MAX));
      input.value = "";
      chips.hidden = true;
      setBusy(true);
      fetch("/api/chat", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history.slice(-TURNS), token: token }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
        .then(function (x) {
          setBusy(false);
          if (x.r.status === 404 && x.d.off) { say("bot", "The AI assistant isn't available right now. Please use the Help Center (https://socallights.app/help) or email info@socallights.app."); fab.hidden = true; return; }
          if (x.d.needCheck) { verified = false; token = ""; history.pop(); if (widget != null && window.turnstile) window.turnstile.reset(widget); gate(); say("bot", x.d.error || "Please complete the quick check and ask again."); return; }
          if (!x.r.ok) { history.pop(); say("bot", x.d.error || "Something went wrong. Please try again, or email info@socallights.app."); return; }
          verified = true; token = ""; gate();
          var reply = String(x.d.reply || "");
          history.push({ role: "assistant", content: reply });
          say("bot", reply);
          if (Array.isArray(x.d.cards)) x.d.cards.slice(0, 3).forEach(function (c) { addCard(c, reply); });
        })
        .catch(function () { setBusy(false); history.pop(); say("bot", "I couldn't reach the server. Please try again, or email info@socallights.app."); });
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } });
    reset.addEventListener("click", function () { history = []; saved = { h: [], log: [], v: verified }; store.clear(); log.textContent = ""; chips.hidden = false; status.textContent = ""; input.focus(); });

    function focusables() { return [].slice.call(panel.querySelectorAll("a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), iframe, [tabindex]:not([tabindex='-1'])")).filter(function (n) { return !n.hidden && n.offsetParent !== null; }); }
    function open() {
      opener = document.activeElement;
      panel.hidden = false; fab.setAttribute("aria-expanded", "true"); fab.hidden = true;
      if (!log.childNodes.length) say("bot", "Hi! I can help with finding events and homes, how SoCal Lights works, and prices. What would you like to know?");
      gate();
      input.focus();
    }
    function shut() {
      panel.hidden = true; fab.hidden = false; fab.setAttribute("aria-expanded", "false");
      (opener && document.contains(opener) ? opener : fab).focus();
      if (opener === fab || !opener) fab.focus();
    }
    fab.addEventListener("click", open);
    close.addEventListener("click", shut);
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); shut(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    });
  }
})();
