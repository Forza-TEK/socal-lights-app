// One plan card, used by /pricing and /feature so the two pages cannot drift apart.
//   price: "$25", unit: "per season", name, blurb (one line), bullets (optional, short lists such as installer plans),
//   collapse: a label such as "What's included"; the bullets then sit in a closed fold-out inside the card.
//   popular: true shows the "Most popular" marker, action: the button or link HTML (already escaped), selected: marks the chosen plan.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function planCard({ key = "", price, unit = "", name, blurb = "", bullets = [], popular = false, action = "", selected = false, extra = "", cls = "", collapse = "" }) {
  return `<section class="pcard${popular ? " popular" : ""}${selected ? " sel" : ""}${cls ? " " + cls : ""}" data-p="${esc(key)}"${popular ? ' data-popular="1"' : ""}>${popular ? '<span class="pribbon">Most popular</span>' : ""}${selected ? '<span class="pcheck" aria-hidden="true">✓</span>' : ""}
<div class="pprice">${esc(price)}${unit ? ` <small>${esc(unit)}</small>` : ""}</div><h3 class="pname">${esc(name)}</h3>${blurb ? `<p class="pblurb">${esc(blurb)}</p>` : ""}${bullets.length ? (collapse ? `<details class="pdet"><summary>${esc(collapse)}</summary><ul class="pbul">${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></details>` : `<ul class="pbul">${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`) : ""}${extra}<div class="pact">${action}</div></section>`;
}

// Which parts each event plan includes: one row per part, one column per plan (the comparison table on /pricing)
export const EVENT_PARTS = [
  { label: "Gold-ringed pin on the map", in: ["ev_pin", "ev_banner", "ev_top", "ev_all"] },
  { label: "“Featured” badge on your listing", in: ["ev_pin", "ev_banner", "ev_top", "ev_all"] },
  { label: "“Featured” pill in the strip at the top of the map list", in: ["ev_banner", "ev_all"] },
  { label: "Banner views and taps on your Feature page", in: ["ev_banner", "ev_all"] },
  { label: "Listed first when people browse your area", in: ["ev_top", "ev_all"] },
];
export function compareTable(keys, names, prices, partsList = EVENT_PARTS) {
  const head = keys.map((k) => `<th scope="col">${esc(names[k])}<small>${esc(prices[k])}</small></th>`).join("");
  const rows = partsList.map((r) => `<tr><th scope="row">${esc(r.label)}</th>${keys.map((k) => (r.in.includes(k) ? '<td><span aria-hidden="true">✓</span><span class="sr">Included</span></td>' : '<td class="no"><span aria-hidden="true">–</span><span class="sr">Not included</span></td>')).join("")}</tr>`).join("");
  return `<div class="cmpwrap" role="region" aria-label="Plan comparison table, scrolls sideways on a small screen" tabindex="0"><table class="cmp"><caption class="sr">What each event plan includes</caption><thead><tr><th scope="col"><span class="sr">Part</span></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
