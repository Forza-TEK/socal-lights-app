// The signed-in pages' frame (Profile, Tutorials), built the same way as Admin:
//   desktop: side menu | tablet: icon rail | phone: top bar + bottom bar + "More" sheet.
// mountShell moves the page's #content into the frame and returns { setActive, setCount, setTitle }.
import { themeBtn, mountAcct } from "/chrome.js?v=20261111x560";
const P = {
  map: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  add: '<path d="M12 5v14M5 12h14"/>', play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>', trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>', check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>', homeplus: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M12 13v4M10 15h4"/>', more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.file}</svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
if (!document.getElementById("appshell-css")) { const l = document.createElement("link"); l.id = "appshell-css"; l.rel = "stylesheet"; l.href = "/appshell.css?v=20261111y2"; document.head.appendChild(l); }
const SITE = [["map", "Map", "/", "map"], ["add", "Add", "/add", "add"], ["tut", "Tutorials", "/tutorials", "play"], ["help", "Help", "/help", "help"], ["prof", "Your profile", "/profile", "user"]];

// opts: { page: "tut"|"prof"|"contest"..., extra: [[key,label,href,icon]], title, items: [{k,label,icon,count?}], active, onPick(k) }
export function mountShell({ page, title, items, active, onPick, extra = [] }) {
  const content = document.getElementById("content");
  const item = (i) => i.href ? `<a class="sh-nv" href="${esc(i.href)}" title="${esc(i.label)}"${i.href === location.pathname ? ' aria-current="true"' : ""}>${svg(i.icon)}<span class="sh-lb">${esc(i.label)}</span></a>` : `<button type="button" class="sh-nv" data-k="${esc(i.k)}" ${i.hidden ? "hidden" : ""} aria-current="${i.k === active}" title="${esc(i.label)}">${svg(i.icon)}<span class="sh-lb">${esc(i.label)}</span><span class="sh-cnt" data-cnt="${esc(i.k)}" ${i.count ? "" : "hidden"}>${i.count || ""}</span></button>`;
  const site = [...extra, ...SITE.filter((s) => s[0] !== page && !items.some((i) => i.href === s[2]))].map(([, l, h, ic]) => `<a class="sh-nv" href="${h}" title="${l}">${svg(ic)}<span class="sh-lb">${l}</span></a>`).join("");
  const bottom = items.filter((i) => !i.href).slice(0, 4).map((i) => `<button type="button" class="sh-bb sh-own" data-k="${esc(i.k)}" aria-current="${i.k === active}">${svg(i.icon)}<span>${esc(i.label)}</span></button>`).join("");
  const root = document.createElement("div"); root.className = "sh-app";
  root.innerHTML = `<a class="sh-skip" href="#content">Skip to content</a>
  <nav class="sh-side" id="sh-side" aria-label="${esc(title)} sections"><a class="sh-brand" href="/" aria-label="SoCal Lights home"><img src="/img/badge-160.webp" width="40" height="40" alt=""><span class="sh-lb">SoCal <b>Lights</b></span></a>
    <div class="sh-list"><p class="sh-gh sh-own">${esc(title)}</p><div class="sh-grp sh-own">${items.map(item).join("")}</div><p class="sh-gh">SoCal Lights</p><div class="sh-grp">${site}</div></div></nav>
  <div class="sh-scrim" id="sh-scrim"></div>
  <div class="sh-col"><header class="sh-top"><a class="sh-tbrand" href="/" aria-label="SoCal Lights home"><img src="/img/badge-160.webp" width="36" height="36" alt=""></a><span class="sh-title" id="sh-title">${esc(title)}</span><span class="sh-grow"></span><a class="maplink" href="/" aria-label="Open the map"><span class="long">Open the map</span><span class="short">Map</span></a>${themeBtn()}<span id="acct"></span></header></div>
  <nav class="sh-bbar" aria-label="Quick sections">${bottom}<button type="button" class="sh-bb" id="sh-more" aria-expanded="false" aria-controls="sh-side">${svg("more")}<span>More</span></button></nav>`;
  document.querySelectorAll(".skiplink").forEach((a) => a.remove()); document.body.prepend(root);
  const col = root.querySelector(".sh-col"); content.classList.add("sh-content"); col.appendChild(content);
  mountAcct(root.querySelector("#acct"));
  const close = () => { document.body.classList.remove("sh-open"); root.querySelector("#sh-more").setAttribute("aria-expanded", "false"); };
  root.querySelector("#sh-more").onclick = () => { const o = document.body.classList.toggle("sh-open"); root.querySelector("#sh-more").setAttribute("aria-expanded", String(o)); };
  root.querySelector("#sh-scrim").onclick = close; document.addEventListener("keydown", (e) => e.key === "Escape" && close());
  root.addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; api.setActive(b.dataset.k); close(); onPick && onPick(b.dataset.k); });
  const api = {
    // Replace the menu items (for pages whose sections are known only after loading)
    setItems(next, act) {
      items = next; if (act) active = act;
      root.querySelector(".sh-grp.sh-own").innerHTML = items.map(item).join("");
      root.querySelectorAll(".sh-bbar .sh-bb[data-k]").forEach((b) => b.remove());
      const more = root.querySelector("#sh-more"); items.slice(0, 4).forEach((i) => more.insertAdjacentHTML("beforebegin", `<button type="button" class="sh-bb sh-own" data-k="${esc(i.k)}" aria-current="${i.k === active}">${svg(i.icon)}<span>${esc(i.label)}</span></button>`));
    },
    setActive(k) { root.querySelectorAll("[data-k]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.k === k)));  },
    setCount(k, n) { root.querySelectorAll(`[data-cnt="${k}"]`).forEach((el) => { el.textContent = n || ""; el.hidden = !n; }); },
    setHidden(k, h) { root.querySelectorAll(`.sh-nv[data-k="${k}"]`).forEach((b) => (b.hidden = h)); },
    own(show) { document.body.classList.toggle("sh-noown", !show); },
    setTitle(t) { root.querySelector("#sh-title").textContent = t; },
  };
  return api;
}
