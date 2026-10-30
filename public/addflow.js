// Step-by-step engine shared by the add forms (event, home display, contest). One question per screen, a segmented
// progress bar, Back and Next. Each form supplies its steps; this file does the rest (state, validation, photos,
// address suggestions, "I am human" check, saved drafts).
import { me, signIn } from "/auth.js?v=20261030a";
export const $ = (q, r = document) => r.querySelector(q);
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // roughly Pacific time
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmt = (s) => (s ? MON[parse(s).getMonth()] + " " + parse(s).getDate() : "");
export const OPT = '<span class="opt-lbl">Optional</span>', PRIV = "<b>Private</b>";
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());

// Domain-name format check (RFC 1035/1123): labels of letters, digits and hyphens, a letters-only top-level domain, no IP addresses
export function validSite(s) {
  s = String(s || "").trim(); if (!s) return true; if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  let u; try { u = new URL(s); } catch { return false; } if (!/^https?:$/.test(u.protocol)) return false;
  const h = u.hostname.replace(/\.$/, ""), L = h.split(".");
  return h.length <= 253 && L.length >= 2 && L.every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) && /^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(L[L.length - 1]);
}

/* ---------- field builders ---------- */
export const input = (d, k, { label = "", ph = "", max = 200, type = "text", opt = false, ac = "", mode = "", addr = false } = {}) =>
  `<div class="field${addr ? " combo" : ""}">${label ? `<label for="f-${k}">${label}${opt ? " " + OPT : ""}</label>` : ""}<input class="in" id="f-${k}" data-k="${k}" ${addr ? "data-addr" : ""} type="${type}" maxlength="${max}" ${ac ? `autocomplete="${ac}"` : 'autocomplete="off"'} ${mode ? `inputmode="${mode}"` : ""} placeholder="${esc(ph)}" value="${esc(d[k] ?? "")}"></div>`;
export const area = (d, k, { label = "", ph = "", max = 300, opt = false } = {}) =>
  `<div class="field">${label ? `<label for="f-${k}">${label}${opt ? " " + OPT : ""}</label>` : ""}<textarea class="in" id="f-${k}" data-k="${k}" maxlength="${max}" placeholder="${esc(ph)}">${esc(d[k] ?? "")}</textarea></div>`;
export const select = (d, k, options, { label = "", blank = "", ac = "" } = {}) =>
  `<div class="field">${label ? `<label for="f-${k}">${label}</label>` : ""}<select class="in" id="f-${k}" data-k="${k}" ${ac ? `autocomplete="${ac}"` : ""}>${blank ? `<option value="">${esc(blank)}</option>` : ""}${options.map(([v, l]) => `<option value="${esc(v)}" ${String(d[k]) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
export const tile = (d, k, v, title, desc = "", sm = false) =>
  `<button type="button" class="tile${sm ? " sm" : ""}" data-tile="${k}|${esc(v)}" aria-pressed="${String(d[k]) === String(v)}"><b>${title}</b>${desc ? `<span>${desc}</span>` : ""}</button>`;
export const check = (d, k, text) => `<label class="chk"><input type="checkbox" data-k="${k}" ${d[k] ? "checked" : ""}> <span>${text}</span></label>`;
export const photoField = (d, { max = 8, help = "" } = {}) =>
  `<div class="drop" id="drop"><span>${help || `Up to ${max} photos. The first one is the cover. They shrink on your phone, so uploads are quick.`}</span><label class="btn out sm" for="f-photos" style="margin:0">Choose photos</label><input id="f-photos" data-photos type="file" accept="image/*" multiple hidden></div><div class="thumbs" id="thumbs">${thumbsHtml(d)}</div><p class="err" id="perr" role="alert" hidden></p>`;
const thumbsHtml = (d) => (d.photos || []).map((p, i) => `<div class="t"><img src="${p.url}" alt="Photo ${i + 1}"><button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">×</button>${i === 0 ? "<em>COVER</em>" : ""}</div>`).join("");
export const sumRow = (k, v, goto) => `<div><span>${k}</span><b>${v}</b><button class="link" type="button" data-goto="${goto}">Edit</button></div>`;
export const ICON = {
  event: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
  contest: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a2 2 0 0 0 2 4M16 6h3a2 2 0 0 1-2 4M12 13v4M9 20h6"/></svg>',
  display: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/></svg>',
};

/* ---------- photos: resized on the device (at most 1600px, JPEG) before upload ---------- */
async function shrink(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.82));
}

/* ---------- Cloudflare Turnstile ("I am human") ---------- */
export const ts = {
  key: "", cfg: {}, widget: null,
  async init() {
    this.cfg = await fetch("/api/config").then((r) => r.json()).catch(() => ({})); this.key = this.cfg.turnstileSiteKey || "";
    if (this.key) await new Promise((res) => { const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = res; s.onerror = res; document.head.appendChild(s); });
    return this.cfg;
  },
  mount() { const el = $("#ts"); this.widget = null; if (el && this.key && window.turnstile) this.widget = window.turnstile.render(el, { sitekey: this.key }); },
  token() { return this.widget != null && window.turnstile ? window.turnstile.getResponse(this.widget) || "" : ""; },
  reset() { if (this.widget != null && window.turnstile) window.turnstile.reset(this.widget); },
};

/* ---------- the engine ---------- */
// o: { steps, data, root, exit, season(d), persist (localStorage key), noPersist: [keys], account: { kind, title(d) }, addr: { cities }, actions: { name(arg, api) }, after(step) }
// step: { id, sec, title, help, body(d), check(d) -> error text, skip(d), cta, redraw, submit(d, api) }
export function run(o) {
  const d = o.data, root = o.root || $("#app"), S = { i: 0, err: "", busy: false, done: null };
  const T = (v) => (typeof v === "function" ? v(d) : v), steps = () => o.steps.filter((s) => !(s.skip && s.skip(d)));
  if (o.persist) try {
    const sv = JSON.parse(localStorage.getItem(o.persist) || "null");
    if (sv && sv.d) { Object.assign(d, sv.d); S.i = sv.i || 0; }
  } catch {}
  const save = () => { if (!o.persist) return; try { const c = {}; for (const [k, v] of Object.entries(d)) if (!(o.noPersist || []).includes(k) && typeof v !== "function") c[k] = v; localStorage.setItem(o.persist, JSON.stringify({ d: c, i: S.i })); } catch {} };
  const hdr = () => `<div class="hdr"><a class="brand" href="/" aria-label="SoCal Lights home"><img class="mark" src="/img/badge-160.webp" width="40" height="40" alt=""><span class="wm">SoCal <b>Lights</b></span></a>${o.account ? '<button class="link" type="button" data-a="saveexit">Save &amp; exit</button>' : `<a class="link" href="${esc(o.exit || "/add")}">Exit</a>`}</div>`;
  function draw(focus) {
    if (S.done !== null) { root.innerHTML = `${hdr()}<div class="main">${S.done}</div>`; window.scrollTo(0, 0); return; }
    const st = steps(); S.i = Math.max(0, Math.min(S.i, st.length - 1)); const s = st[S.i];
    if (o.season) document.documentElement.dataset.season = o.season(d);
    const secs = [...new Set(st.map((x) => x.sec))], cur = secs.indexOf(s.sec);
    const segs = secs.map((sc, k) => { const inSec = st.filter((x) => x.sec === sc), idx = inSec.indexOf(s), f = k < cur ? 1 : k > cur ? 0 : (idx + 1) / inSec.length; return `<div class="seg" aria-hidden="true"><i style="width:${f * 100}%"></i></div>`; }).join("");
    const last = !!s.submit;
    root.innerHTML = `${hdr()}<div class="main"><h1>${esc(T(s.title))}</h1>${s.help ? `<p class="help">${T(s.help)}</p>` : ""}${s.body(d)}<p class="err" id="err" role="alert" ${S.err ? "" : "hidden"}>${esc(S.err)}</p></div>
    <div class="bar"><div class="segs" role="progressbar" aria-label="Progress: ${esc(s.sec)}">${segs}</div><div class="nav"><button class="link" type="button" data-a="back">${S.i === 0 ? "Cancel" : "Back"}</button><button class="btn" type="button" data-a="next" id="nextbtn">${esc(T(s.cta) || (last ? "Submit" : "Next"))}</button></div></div>`;
    if (focus) { const f = root.querySelector(".in,[data-tile]"); if (f && f.classList.contains("in")) f.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    if (o.after) o.after(s, d);
  }
  const showErr = (t) => { S.err = t; const e = $("#err"); if (e) { e.textContent = t; e.hidden = !t; if (t) e.scrollIntoView({ block: "center", behavior: "smooth" }); } };
  const api = { draw: () => draw(), err: showErr, finish(html) { S.done = html; if (d._draftId) fetch("/api/drafts/" + d._draftId, { method: "DELETE" }).catch(() => {}); if (o.persist) try { localStorage.removeItem(o.persist); } catch {} draw(); }, goto(id) { const i = steps().findIndex((x) => x.id === id); if (i > -1) { S.i = i; S.err = ""; save(); draw(true); } }, data: d, step: () => steps()[S.i] };
  async function next() {
    if (S.busy) return;
    const s = steps()[S.i], e = s.check ? s.check(d) : ""; if (e) return showErr(e); showErr("");
    if (s.submit) {
      S.busy = true; const b = $("#nextbtn"), label = b.textContent; b.disabled = true; b.textContent = "Sending…";
      try { await s.submit(d, api); } catch (x) { S.busy = false; if (S.done === null) { showErr(x.message || "Something went wrong. Please try again."); const bb = $("#nextbtn"); if (bb) { bb.disabled = false; bb.textContent = label; } ts.reset(); } return; }
      S.busy = false; return;
    }
    S.i++; save(); draw(true);
  }
  // Save & exit: sign in if needed, keep the answers on your account (photos are not saved), and go to your profile
  const cleanData = () => { const c = {}; for (const [k, v] of Object.entries(d)) if (!(o.noPersist || []).includes(k) && !k.startsWith("_") && typeof v !== "function") c[k] = v; return c; };
  async function saveExit() {
    if (S.busy) return; S.busy = true; save();
    try {
      let u = (await me()).user;
      if (!u) { u = await signIn({ title: "Sign in to save your draft", next: "/profile?save=" + o.account.kind }); if (!u) { S.busy = false; return; } }
      const r = await fetch("/api/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: d._draftId, kind: o.account.kind, title: o.account.title(d), data: cleanData(), step: S.i }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Couldn't save your draft. Try again.");
      d._draftId = j.id; save(); location.href = "/profile";
    } catch (e) { showErr(e.message || "Couldn't save your draft."); }
    S.busy = false;
  }
  function back() { if (S.i === 0) return (location.href = o.exit || "/add"); S.i--; S.err = ""; save(); draw(true); }

  // typing, choosing, clicking
  const onValue = (t) => {
    const k = t.dataset.k; d[k] = t.type === "checkbox" ? t.checked : t.value; if (t.getAttribute("aria-invalid")) t.removeAttribute("aria-invalid");
    save(); if (o.onInput) o.onInput(k, d, api);
    if (t.hasAttribute("data-addr")) suggest(t);
    const s = steps()[S.i]; if (s && s.redraw && (t.type === "checkbox" || t.tagName === "SELECT")) { draw(); }
  };
  document.addEventListener("input", (e) => { if (root.contains(e.target) && e.target.matches("[data-k]") && e.target.type !== "checkbox" && e.target.tagName !== "SELECT") onValue(e.target); });
  document.addEventListener("change", (e) => {
    const t = e.target; if (!root.contains(t)) return;
    if (t.matches("[data-k]") && (t.type === "checkbox" || t.tagName === "SELECT")) onValue(t);
    if (t.matches("[data-photos]")) { const f = [...t.files]; t.value = ""; addFiles(f); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && root.contains(e.target) && e.target.tagName === "INPUT" && !["checkbox", "file"].includes(e.target.type)) { e.preventDefault(); const dd = $(".dd"); if (dd) dd.remove(); next(); } });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tile],[data-a],[data-goto],[data-rm],[data-copy],.dd button"); if (!t || !root.contains(t) && !t.closest(".dd")) return;
    if (t.matches(".dd button")) { pick(+t.dataset.i); return; }
    if (t.dataset.tile) {
      const [k, ...v] = t.dataset.tile.split("|"); d[k] = v.join("|"); save();
      const s = steps()[S.i];
      if (s && s.redraw) draw(); else root.querySelectorAll(`[data-tile^="${k}|"]`).forEach((x) => x.setAttribute("aria-pressed", x === t));
      if (o.onInput) o.onInput(k, d, api); return;
    }
    if (t.dataset.goto) return api.goto(t.dataset.goto);
    if (t.dataset.rm) { const i = +t.dataset.rm; URL.revokeObjectURL(d.photos[i].url); d.photos.splice(i, 1); $("#thumbs").innerHTML = thumbsHtml(d); return; }
    if (t.dataset.copy) { const old = t.textContent; navigator.clipboard.writeText(t.dataset.copy).then(() => (t.textContent = "Copied"), () => (t.textContent = "Select it")); setTimeout(() => (t.textContent = old), 1500); return; }
    const [a, p] = (t.dataset.a || "").split(/:(.*)/s);
    if (a === "next") return next(); if (a === "back") return back(); if (a === "saveexit") return saveExit();
    if (o.actions && o.actions[a]) return o.actions[a](p, api);
  });
  const dz = () => $("#drop");
  document.addEventListener("dragover", (e) => { if (dz() && dz().contains(e.target)) { e.preventDefault(); dz().classList.add("over"); } });
  document.addEventListener("dragleave", () => dz() && dz().classList.remove("over"));
  document.addEventListener("drop", (e) => { if (dz() && dz().contains(e.target)) { e.preventDefault(); dz().classList.remove("over"); addFiles([...e.dataTransfer.files]); } });
  async function addFiles(list) {
    const pe = $("#perr"), say = (t) => { if (pe) { pe.textContent = t; pe.hidden = !t; } }; say(""); d.photos ||= [];
    for (const f of list) {
      if (d.photos.length >= 8) { say("That's the limit of 8 photos."); break; }
      if (!f.type.startsWith("image/")) { say("Skipped a file that isn't a photo."); continue; }
      try { const b = await shrink(f); d.photos.push({ blob: b, url: URL.createObjectURL(b) }); } catch { say("One photo couldn't be read. Try a JPG or PNG."); }
      const th = $("#thumbs"); if (th) th.innerHTML = thumbsHtml(d);
    }
  }

  // street-address suggestions (Geoapify through our server). Waits for 5+ characters and a pause in typing.
  let sugT = 0, sugN = 0, sugList = [];
  function suggest(inp) {
    if (!o.addr) return; clearTimeout(sugT); const q = inp.value.trim(); const old = $(".dd"); if (q.length < 5 || !/\d/.test(q)) { if (old) old.remove(); return; }
    sugT = setTimeout(async () => {
      const me = ++sugN; let j = { suggestions: [] }; try { j = await (await fetch("/api/address?q=" + encodeURIComponent(d.city && !q.toLowerCase().includes(d.city.toLowerCase()) ? q + " " + d.city : q))).json(); } catch {}
      const o2 = $(".dd"); if (o2) o2.remove(); if (me !== sugN || !j.suggestions.length || !inp.isConnected) return;
      sugList = j.suggestions; const ul = document.createElement("ul"); ul.className = "dd"; ul.setAttribute("role", "listbox");
      ul.innerHTML = sugList.map((s, i) => `<li><button type="button" role="option" data-i="${i}">${esc(s.street)}<small>${esc(s.city)}, CA ${esc(s.zip)}</small></button></li>`).join("") + `<li class="foot">Powered by Geoapify</li>`; inp.parentElement.appendChild(ul);
    }, 350);
  }
  function pick(i) {
    const s = sugList[i]; if (!s) return; d.street = s.street; if (o.addr.cities && o.addr.cities.includes(s.city)) d.city = s.city; if (/^\d{5}/.test(s.zip)) d.zip = s.zip.slice(0, 5);
    for (const k of ["street", "city", "zip"]) { const el = $("#f-" + k); if (el && d[k] != null) el.value = d[k]; }
    const dd = $(".dd"); if (dd) dd.remove(); save();
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".dd,[data-addr]")) { const dd = $(".dd"); if (dd) dd.remove(); } });

  // ?draft=<id> reopens a draft saved to your account, on the step you left
  api.ready = (async () => {
    const id = new URLSearchParams(location.search).get("draft");
    if (id) try { const r = await fetch("/api/drafts/" + encodeURIComponent(id), { cache: "no-store" }); if (r.ok) { const j = await r.json(); Object.assign(d, j.data); d._draftId = j.id; S.i = j.step || 0; } } catch {}
    draw(true);
  })();
  return api;
}
