// "Areas served": pick several cities and counties from the same dropdown service as street addresses (/api/address?kind=area).
// areaHtml({ id, value }) builds the field (a hidden input with that id holds "Orange County, Irvine"); wireAreas(root) makes every field inside root work.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
if (!document.getElementById("areapick-css")) { const l = document.createElement("link"); l.id = "areapick-css"; l.rel = "stylesheet"; l.href = "/areapick.css?v=20261102a"; document.head.appendChild(l); }
const MAX = 240;
export const parseAreas = (v) => [...new Set(String(v || "").split(/\s*(?:,|;|&|\band\b)\s*/i).map((x) => x.trim()).filter(Boolean))];
const tags = (list) => list.map((a) => `<span class="atag" data-v="${esc(a)}">${esc(a)}<button type="button" aria-label="Remove ${esc(a)}">×</button></span>`).join("");
export function areaHtml({ id, value = "", extra = "" }) {
  const list = parseAreas(value);
  return `<div class="areas" data-areas><div class="abox"><span class="atags">${tags(list)}</span><input class="ain" type="text" autocomplete="off" role="combobox" aria-expanded="false" aria-label="Add a city or county" placeholder="${list.length ? "Add another" : "Add a city or county"}"></div><input type="hidden" id="${id}" ${extra} value="${esc(list.join(", "))}"><small class="amsg" role="status"></small></div>`;
}
export function wireAreas(root) {
  root.querySelectorAll("[data-areas]:not([data-wired])").forEach((box) => {
    box.dataset.wired = "1";
    const hid = box.querySelector('input[type="hidden"]'), inp = box.querySelector(".ain"), tg = box.querySelector(".atags"), msg = box.querySelector(".amsg");
    let list = parseAreas(hid.value), n = 0, t = 0, shown = [], act = -1;
    const sync = () => { hid.value = list.join(", "); tg.innerHTML = tags(list); inp.placeholder = list.length ? "Add another" : "Add a city or county"; hid.dispatchEvent(new Event("change", { bubbles: true })); };
    const close = () => { const d = box.querySelector(".dd"); if (d) d.remove(); inp.setAttribute("aria-expanded", "false"); shown = []; act = -1; };
    const add = (label) => {
      if (!label || list.some((x) => x.toLowerCase() === label.toLowerCase())) return close();
      if ([...list, label].join(", ").length > MAX) { msg.textContent = "That's the most this field holds. Remove one to add another."; return close(); }
      msg.textContent = ""; list.push(label); inp.value = ""; close(); sync(); inp.focus();
    };
    const paint = () => { box.querySelectorAll(".dd [data-i]").forEach((b) => b.classList.toggle("on", +b.dataset.i === act)); };
    const open = (items) => {
      close(); shown = items.filter((s) => !list.some((x) => x.toLowerCase() === s.label.toLowerCase())); if (!shown.length) return;
      const ul = document.createElement("ul"); ul.className = "dd"; ul.setAttribute("role", "listbox");
      ul.innerHTML = shown.map((s, i) => `<li><button type="button" role="option" data-i="${i}">${esc(s.label)}<small>${s.kind === "county" ? "County" : "City"}</small></button></li>`).join("");
      box.appendChild(ul); inp.setAttribute("aria-expanded", "true"); act = 0; paint();
    };
    inp.addEventListener("input", () => {
      clearTimeout(t); const q = inp.value.trim(); close(); if (q.length < 2) return;
      t = setTimeout(async () => { const me = ++n; let j = { suggestions: [] }; try { j = await (await fetch("/api/address?kind=area&q=" + encodeURIComponent(q))).json(); } catch {} if (me === n && inp.isConnected && inp.value.trim() === q) open(j.suggestions || []); }, 150);
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!shown.length) return; e.preventDefault(); act = (act + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length; paint(); }
      else if (e.key === "Enter") { e.preventDefault(); if (shown.length) add(shown[Math.max(0, act)].label); }
      else if (e.key === "Escape") { if (shown.length) { e.stopPropagation(); close(); } }
      else if (e.key === "Backspace" && !inp.value && list.length) { list.pop(); sync(); }
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".dd [data-i]"); if (b) return add(shown[+b.dataset.i].label);
      const x = e.target.closest(".atag button"); if (x) { const v = x.parentElement.dataset.v; list = list.filter((a) => a !== v); msg.textContent = ""; sync(); inp.focus(); return; }
      if (e.target.closest(".abox")) inp.focus();
    });
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) close(); });
  });
}
