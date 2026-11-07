// "On this page": a list of a long page's sections beside it (above it on a phone). Built from the page's own headings, so it never goes out of date.
// Without scripts the page is simply the text, as before.
(function () {
  const main = document.querySelector("main"); if (!main) return;
  const hs = [...main.querySelectorAll(":scope > h2")]; if (hs.length < 3) return;
  const used = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
  const slug = (t) => { let s = t.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "section", n = s, i = 2; while (used.has(n) && !hs.some((h) => h.id === n)) n = s + "-" + i++; used.add(n); return n; };
  hs.forEach((h) => { if (!h.id) h.id = slug(h.textContent.trim()); });
  const nav = document.createElement("nav"); nav.className = "toc"; nav.setAttribute("aria-label", "On this page");
  nav.innerHTML = `<b class="toch">On this page</b><ol>${hs.map((h) => `<li><a href="#${h.id}">${h.textContent.trim().replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))}</a></li>`).join("")}</ol>`;
  // everything in main except the title block goes into the right-hand column
  const body = document.createElement("div"); body.className = "legalbody";
  const first = hs[0], pre = [];
  for (let n = main.firstElementChild; n && n !== first; n = n.nextElementSibling) pre.push(n);
  const kids = [...main.children].filter((k) => !pre.includes(k));
  const head = document.createElement("div"); head.className = "legalhead"; pre.forEach((k) => head.appendChild(k));
  kids.forEach((k) => body.appendChild(k));
  main.append(head, nav, body); main.classList.add("legal");
  const links = [...nav.querySelectorAll("a")];
  if ("IntersectionObserver" in window) {
    const on = (id) => links.forEach((a) => { const c = a.getAttribute("href") === "#" + id; c ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"); });
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) on(v.target.id); }, { rootMargin: "-10% 0px -75% 0px" });
    hs.forEach((h) => io.observe(h));
  }
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
