// A profile that used to be a window, shown as a full page instead: the same content, a Back link where the X was, the title in the page head.
// It behaves like the #modal element for the code that fills it (hidden, innerHTML, querySelector), so those forms did not have to change.
import { esc } from "/admin/kit.js?v=20261121a";

export function pageHost(backText, rerender) {
  const main = document.querySelector("#main"), detail = (name) => document.dispatchEvent(new CustomEvent("admin:detail", { detail: name })); // the breadcrumb in the top bar (admin.js)
  let open = false;
  return {
    get hidden() { return !open; },
    set hidden(v) { if (v && open) { open = false; detail(""); rerender(); } else if (!v) open = true; },
    set innerHTML(html) {
      if (!html || !open) return;
      const t = document.createElement("template"); t.innerHTML = html; const card = t.content.firstElementChild, mh = card && card.querySelector(".mh"), h2 = mh && mh.querySelector("h2");
      const title = h2 ? h2.innerHTML : "", plain = h2 ? h2.textContent : ""; if (mh) mh.remove();
      main.innerHTML = `<div class="rpage"><a class="rback" href="${esc(location.hash.split("/")[0] || "#")}" id="mClose"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to ${esc(backText)}</a>${title ? `<div class="pghead"><div><h2>${title}</h2></div></div>` : ""}<section class="rcard">${card ? card.innerHTML : ""}</section></div>`;
      if (plain) detail(plain); window.scrollTo(0, 0);
    },
    querySelector: (s) => main.querySelector(s), querySelectorAll: (s) => main.querySelectorAll(s),
  };
}
