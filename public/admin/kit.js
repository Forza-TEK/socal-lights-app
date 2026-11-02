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
export const wireToolbar = (root, { onView, onSearch }) => {
  root.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => onView && onView(b.dataset.view)));
  const s = root.querySelector("[data-search]"); if (s && onSearch) { let t; s.oninput = () => { clearTimeout(t); t = setTimeout(() => onSearch(s.value.trim()), 200); }; }
};
// Hide the cards that don't contain the typed words; updates the running count. Used by every list that is already on the page.
export function filterCards(root, q) {
  const w = q.toLowerCase().split(/\s+/).filter(Boolean); let n = 0;
  const cards = root.querySelectorAll(".rec");
  cards.forEach((c) => { const t = c.textContent.toLowerCase(); const ok = w.every((x) => t.includes(x)); c.hidden = !ok; if (ok) n++; });
  const el = root.querySelector("[data-tcount]"); if (el) el.textContent = q ? `${n} of ${cards.length}` : `${cards.length}`;
  let none = root.querySelector(".nomatch"); if (!n && cards.length) { if (!none) { none = document.createElement("div"); none.className = "empty nomatch"; none.textContent = "Nothing matches that."; cards[0].parentNode.after(none); } } else if (none) none.remove();
}

// Destructive buttons: the first tap arms (text + red), the second within 5 seconds goes ahead. Returns true when it should proceed.
export function tap(b, verb) {
  if (b.dataset.armed === "1") { clearTimeout(b._t); b.dataset.armed = ""; b.classList.remove("armed"); if (b.dataset.label) b.textContent = b.dataset.label; return true; }
  b.dataset.armed = "1"; b.dataset.label = b.textContent; b.classList.add("armed"); b.textContent = "Tap again to " + verb;
  b._t = setTimeout(() => { b.dataset.armed = ""; b.classList.remove("armed"); b.textContent = b.dataset.label; }, 5000);
  return false;
}

let tt;
export function toast(text, bad) {
  let el = document.getElementById("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = text; el.className = "show" + (bad ? " bad" : ""); clearTimeout(tt); tt = setTimeout(() => (el.className = ""), bad ? 5000 : 2600);
}
export const pager = ({ offset, shown, total, page, idPrev = "pgPrev", idNext = "pgNext" }) =>
  `<div class="pager"><span class="meta">${total ? `${offset + 1}–${offset + shown} of ${total}` : "0"}</span><span class="row" style="gap:8px"><button class="btn ghost" type="button" id="${idPrev}" ${offset ? "" : "disabled"}>Newer</button><button class="btn ghost" type="button" id="${idNext}" ${offset + page < total ? "" : "disabled"}>Older</button></span></div>`;
// One modal frame for every edit window
export const modalFrame = (title, inner, wide = false) => `<div class="card${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h2>${esc(title)}</h2><button class="xbtn" type="button" id="mClose" aria-label="Close" title="Close">×</button></div>${inner}</div>`;
