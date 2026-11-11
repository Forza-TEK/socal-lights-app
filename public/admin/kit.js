// The one way Admin shows and changes a record. Every tab builds its list from these pieces, so a house, an event,
// an installer, a person or a report all look the same and behave the same:
//   toolbar  : views (segmented), search, extra filters, Add button, running count
//   rec      : title + status tags + date, key facts, then ONE action row:  Edit | main action(s) .... danger (always last, right)
//   tap      : destructive buttons ask for a second tap ("Tap again to remove"), same wording everywhere
//   toast    : one confirmation after every change ("Approved", "Saved", "Removed")
//   pager    : Newer / Older, same on every long list
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// kind: edit | main | ghost | danger
export const btn = (kind, label, attrs = "") => `<button type="button" class="btn ${kind === "main" ? "ice" : "ghost"}${kind === "danger" ? " danger" : ""}" ${attrs}>${esc(label)}</button>`;

// tags: [[text, tone?]]; tone: ok | warn | bad | "" ; actions: already-built buttons, the danger one goes in `danger`
export function rec({ attrs = "", title, tags = [], meta = "", lead = "", facts = "", body = "", edit = "", main = "", danger = "", compact = false, cls = "" }) {
  const head = `<div class="rh"><div class="rt"><h3>${title}</h3>${tags.map(([t, tone]) => `<span class="tag ${tone || ""}">${esc(t)}</span>`).join("")}</div>${meta ? `<span class="meta rm">${meta}</span>` : ""}</div>`;
  const acts = `<div class="ra">${edit}${main}<span class="sp"></span>${danger}<span class="msg" role="status"></span></div>`;
  const open = `<article class="acard rec${compact ? " compact" : ""}${cls ? " " + cls : ""}" ${attrs}>`;
  if (compact) return `${open}<div class="rl">${head}${lead}${body}</div>${acts}</article>`;
  return `${open}${head}${lead}${facts ? `<dl class="facts">${facts}</dl>` : ""}${body}${acts}</article>`;
}
export const fact = (k, v) => (v === "" || v == null ? "" : `<dt>${esc(k)}</dt><dd>${v}</dd>`);

// views: [{k, label, n}]; search: {value, placeholder}; add: {id, label}; right: extra html (a select, a download link)
export function toolbar({ views = [], active = "", search, add, right = "", count = "" }) {
  return `<div class="tbar">${views.length ? `<div class="seg" role="group" aria-label="Show">${views.map((v) => `<button type="button" data-view="${esc(v.k)}" aria-pressed="${v.k === active}">${esc(v.label)}${v.n != null ? ` <span>${v.n}</span>` : ""}</button>`).join("")}</div>` : ""}
    ${search ? `<input class="tsearch" type="search" data-search placeholder="${esc(search.placeholder || "Search")}" value="${esc(search.value || "")}" aria-label="${esc(search.placeholder || "Search")}">` : ""}${right}
    <span class="grow"></span>${count ? `<span class="meta tcount" data-tcount>${count}</span>` : ""}${add ? `<button type="button" class="btn ice" id="${add.id}">${esc(add.label)}</button>` : ""}</div>`;
}
export const wireToolbar = (root, { onView, onSearch, onSort }) => {
  root.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => onView && onView(b.dataset.view)));
  const so = root.querySelector("[data-sort]"); if (so && onSort) so.onchange = () => onSort(so.value);
  const s = root.querySelector("[data-search]"); if (s && onSearch) { let t; s.oninput = () => { clearTimeout(t); t = setTimeout(() => onSearch(s.value.trim()), 200); }; }
};
// Hide the cards that don't contain the typed words; updates the running count. Used by every list that is already on the page.
export function filterCards(root, q) {
  const w = q.toLowerCase().split(/\s+/).filter(Boolean); let n = 0;
  const cards = root.querySelectorAll(".rec");
  cards.forEach((c) => { const t = c.textContent.toLowerCase(); const ok = w.every((x) => t.includes(x)); c.hidden = !ok; if (ok) n++; });
  const el = root.querySelector("[data-tcount]"); if (el) el.textContent = q ? `${n} of ${cards.length}` : `${cards.length}`;
  let none = root.querySelector(".nomatch"); if (!n && cards.length) { if (!none) { none = document.createElement("div"); none.className = "empty nomatch"; none.textContent = "Nothing matches that."; cards[0].parentNode.after(none); } } else if (none) none.remove();
  enhanceLists(root, !!q);
}

// ---- Phones: long lists fold each card to its title line (tap the line to open it) and show 20 cards at a time ----
export const phone = () => window.matchMedia("(max-width:699px)").matches;
export const PAGE_PHONE = 20;
const FOLD = ".cards > .acard.rec:not(.compact) > .rh";
// Idempotent: safe to call after every render. searching = a search is typed, so every match is shown (no paging).
export function enhanceLists(root, searching = false) {
  const on = phone();
  root.querySelectorAll(FOLD).forEach((h) => {
    if (on) { h.setAttribute("role", "button"); h.tabIndex = 0; h.setAttribute("aria-expanded", String(h.parentNode.classList.contains("open"))); }
    else { h.removeAttribute("role"); h.removeAttribute("tabindex"); h.removeAttribute("aria-expanded"); }
  });
  root.querySelectorAll(".cards").forEach((box) => {
    const cards = [...box.children].filter((c) => c.classList.contains("rec") && !c.hidden), shown = Number(box.dataset.shown || PAGE_PHONE);
    cards.forEach((c, i) => c.classList.toggle("pg-hide", on && !searching && i >= shown));
    const hidden = on && !searching ? Math.max(0, cards.length - shown) : 0;
    let more = box.nextElementSibling && box.nextElementSibling.classList.contains("pgmore") ? box.nextElementSibling : null;
    if (hidden && !more) { more = document.createElement("div"); more.className = "pager pgmore"; box.after(more); }
    if (more) { if (!hidden) more.remove(); else more.innerHTML = `<span class="meta">Showing ${shown} of ${cards.length}</span><button class="btn ghost" type="button" data-pgmore>Show ${Math.min(PAGE_PHONE, hidden)} more</button>`; }
  });
}
export function wireFold(root) {
  root.addEventListener("click", (e) => {
    const more = e.target.closest("[data-pgmore]");
    if (more) { const box = more.closest(".pgmore").previousElementSibling; box.dataset.shown = String(Number(box.dataset.shown || PAGE_PHONE) + PAGE_PHONE); enhanceLists(root); return; }
    const h = e.target.closest(FOLD);
    if (!h || !phone() || e.target.closest("a,button,input,label,select,textarea")) return;
    const card = h.parentNode; card.classList.toggle("open"); h.setAttribute("aria-expanded", String(card.classList.contains("open")));
  });
  root.addEventListener("keydown", (e) => { const h = e.target.closest && e.target.closest(FOLD); if (h && e.target === h && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); h.click(); } });
  new MutationObserver(() => enhanceLists(root, !!(root.querySelector("[data-search]") || {}).value)).observe(root, { childList: true });
  window.matchMedia("(max-width:699px)").addEventListener("change", () => enhanceLists(root));
}

// A sort control for a toolbar: [[value, label], ...]
export const sortSelect = (options, value) => `<select class="tsort" data-sort aria-label="Sort by">${options.map(([k, l]) => `<option value="${esc(k)}" ${k === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;

// Asks inside the page instead of the browser's own box. Resolves true / false (confirm) or the typed text / null (text). Same look as the other edit windows.
export function askBox({ title, message = "", go = "Yes", input = null, danger = false }) {
  return new Promise((done) => {
    const m = document.getElementById("modal"); m.hidden = false;
    m.innerHTML = modalFrame(title, `<form class="f" id="abForm" novalidate>${message ? `<p style="margin:0 0 12px;white-space:pre-line">${esc(message)}</p>` : ""}${input ? `<div class="ff c6"><label for="ab-t">${esc(input.label)}</label><input id="ab-t" maxlength="200" placeholder="${esc(input.placeholder || "")}" autocomplete="off">${input.hint ? `<small class="fhint">${esc(input.hint)}</small>` : ""}</div>` : ""}<div class="mfoot"><button class="btn ${danger ? "danger-solid" : "ice"}" type="submit">${esc(go)}</button><button class="btn ghost" type="button" data-mcancel>Cancel</button></div></form>`);
    const end = (v) => { m.hidden = true; m.innerHTML = ""; done(v); };
    document.getElementById("mClose").onclick = () => end(input ? null : false); m.querySelector("[data-mcancel]").addEventListener("click", () => end(input ? null : false), { once: true });
    document.getElementById("abForm").onsubmit = (e) => { e.preventDefault(); if (!input) return end(true); const v = document.getElementById("ab-t").value.trim(); if (!v) return document.getElementById("ab-t").focus(); end(v); };
    const t = document.getElementById("ab-t"); if (t) t.focus();
  });
}

// Destructive buttons: the first tap arms (text + red), the second within 5 seconds goes ahead. Returns true when it should proceed.
export function tap(b, verb) {
  if (b.dataset.armed === "1") { clearTimeout(b._t); b.dataset.armed = ""; b.classList.remove("armed"); if (b.dataset.label) b.textContent = b.dataset.label; return true; }
  b.dataset.armed = "1"; b.dataset.label = b.textContent; b.classList.add("armed"); b.textContent = "Tap again to " + verb;
  b._t = setTimeout(() => { b.dataset.armed = ""; b.classList.remove("armed"); b.textContent = b.dataset.label; }, 5000);
  return false;
}

let tt;
// opts.undo: a function; the message gets an Undo button for a few seconds
export function toast(text, bad, opts = {}) {
  let el = document.getElementById("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = text; el.className = "show" + (bad ? " bad" : "");
  if (opts.undo) { const b = document.createElement("button"); b.type = "button"; b.className = "tundo"; b.textContent = "Undo"; b.onclick = () => { clearTimeout(tt); el.className = ""; opts.undo(); }; el.appendChild(b); }
  clearTimeout(tt); tt = setTimeout(() => (el.className = ""), opts.undo ? 9000 : bad ? 5000 : 2600);
}
export const pager = ({ offset, shown, total, page, idPrev = "pgPrev", idNext = "pgNext" }) =>
  `<div class="pager"><span class="meta">${total ? `${offset + 1}–${offset + shown} of ${total}` : "0"}</span><span class="row" style="gap:8px"><button class="btn ghost" type="button" id="${idPrev}" ${offset ? "" : "disabled"}>Newer</button><button class="btn ghost" type="button" id="${idNext}" ${offset + page < total ? "" : "disabled"}>Older</button></span></div>`;
// One modal frame for every edit window
export const modalFrame = (title, inner, wide = false) => `<div class="card${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h2>${esc(title)}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>${inner}</div>`;
