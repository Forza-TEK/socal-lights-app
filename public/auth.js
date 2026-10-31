// Sign-in for the contest pages: Continue with Google, or an emailed 6-digit code. Both prove the same email address.
const $ = (q, r = document) => r.querySelector(q);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let cache = null;

export async function me(force) {
  if (cache && !force) return cache;
  cache = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ user: null, methods: {} }));
  return cache;
}
export async function signOut() { await fetch("/api/auth/logout", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }); cache = null; }

export function toast(msg) {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200);
}

// Google sends people back with ?signin=cancelled|failed when it didn't work
export function noteSigninResult() {
  const u = new URL(location.href), s = u.searchParams.get("signin");
  if (!s) return;
  u.searchParams.delete("signin"); history.replaceState(null, "", u.pathname + u.search + u.hash);
  toast(s === "cancelled" ? "Sign-in was cancelled." : s === "suspended" ? "This account has been suspended. Email info@socallights.app if you think that is a mistake." : "Google sign-in didn't work. Try again, or use your email.");
}

// Shows the sign-in sheet. Resolves with the user once signed in by email code, or null if cancelled.
// (Google leaves the page and comes back, so it doesn't resolve.)
export function signIn({ title = "Sign in to continue", next = location.pathname + location.search } = {}) {
  return new Promise(async (resolve) => {
    const info = await me(true);
    const host = document.createElement("div");
    const close = (v) => { host.remove(); document.removeEventListener("keydown", onKey); resolve(v); };
    const onKey = (e) => { if (e.key === "Escape") close(null); };
    document.addEventListener("keydown", onKey);
    let stage = "choose", email = "", err = "", devCode = "", widget = null;
    const G = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>`;
    const draw = () => {
      const m = { ...(info.methods || {}) };
      if (/SoCalLightsApp/.test(navigator.userAgent)) m.google = false; // Google refuses sign-in inside an app's embedded browser; the emailed code works there
      let body = "";
      if (stage === "choose") {
        body = `${m.google ? `<a class="gbtn" href="/api/auth/google/start?next=${encodeURIComponent(next)}">${G} Continue with Google</a>` : ""}
          ${m.google && m.email ? `<div class="or">or</div>` : ""}
          ${m.email ? `<div><label for="si-email">Use your email instead</label><p class="help">We'll email you a 6-digit code. No password.</p><input id="si-email" type="email" inputmode="email" autocomplete="email" value="${esc(email)}"${err ? ' aria-invalid="true"' : ""}>${err ? `<p class="err">${esc(err)}</p>` : ""}<div id="si-ts" style="margin-top:8px"></div></div><button class="ebtn" id="si-send" type="button">Email me a code</button>` : ""}
          ${!m.google && !m.email ? `<p class="status no">Sign-in isn't switched on for this site yet.</p>` : ""}`;
      } else {
        body = `<p class="muted small">We sent a 6-digit code to <b>${esc(email)}</b>. It works for 10 minutes.</p>
          ${devCode ? `<div class="hint">Local test mode: your code is <b>${esc(devCode)}</b>.</div>` : ""}
          <div><label for="si-code">6-digit code</label><input id="si-code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code"${err ? ' aria-invalid="true"' : ""}>${err ? `<p class="err">${esc(err)}</p>` : ""}</div>
          <button class="btn org" id="si-verify" type="button">Continue</button><button class="link" id="si-back" type="button">Use a different email</button>`;
      }
      host.innerHTML = `<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="si-t"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><h2 id="si-t">${esc(stage === "choose" ? title : "Enter your code")}</h2><button class="link" id="si-x" type="button" aria-label="Close">Close</button></div>${body}</div></div>`;
      $("#si-x", host).onclick = () => close(null);
      const f = $("#si-email", host) || $("#si-code", host); if (f) f.focus();
      const send = $("#si-send", host);
      if (send) {
        $("#si-email", host).oninput = (e) => (email = e.target.value);
        $("#si-email", host).onkeydown = (e) => { if (e.key === "Enter") send.click(); };
        if (info.turnstileSiteKey && !widget) loadTurnstile(info.turnstileSiteKey, $("#si-ts", host)).then((w) => (widget = w));
        send.onclick = async () => {
          err = ""; send.disabled = true;
          const body = { email }; if (window.turnstile && widget != null) body["cf-turnstile-response"] = window.turnstile.getResponse(widget) || "";
          const r = await fetch("/api/auth/email/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { err = j.error || "Couldn't send the code. Try again."; widget = null; draw(); return; }
          devCode = j.devCode || ""; stage = "code"; draw();
        };
      }
      const ver = $("#si-verify", host);
      if (ver) {
        $("#si-code", host).onkeydown = (e) => { if (e.key === "Enter") ver.click(); };
        $("#si-back", host).onclick = () => { stage = "choose"; err = ""; widget = null; draw(); };
        ver.onclick = async () => {
          ver.disabled = true;
          const r = await fetch("/api/auth/email/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: $("#si-code", host).value }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { err = j.error || "That code didn't work."; draw(); return; }
          cache = null; close(j.user);
        };
      }
    };
    document.body.appendChild(host); draw();
  });
}

function loadTurnstile(key, el) {
  return new Promise((res) => {
    const go = () => res(window.turnstile ? window.turnstile.render(el, { sitekey: key }) : null);
    if (window.turnstile) return go();
    const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = go; s.onerror = () => res(null); document.head.appendChild(s);
  });
}

// A "Signed in as … Sign out" line
export async function whoBar(el) {
  const i = await me();
  el.innerHTML = i.user ? `<span class="small muted">Signed in as <b>${esc(i.user.email)}</b></span> <button class="link" id="so" type="button">Sign out</button>` : `<button class="link" id="si" type="button">Sign in</button>`;
  const o = $("#so", el), n = $("#si", el);
  if (o) o.onclick = async () => { await signOut(); location.reload(); };
  if (n) n.onclick = async () => { if (await signIn({})) location.reload(); };
}
export { esc };
