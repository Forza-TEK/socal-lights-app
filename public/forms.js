// Shared edit-form pieces for Profile, the installer page and the contest dashboard (the same layout the Admin edit windows use).
import { areaHtml, wireAreas } from "/areapick.js?v=20261102a";
export { wireAreas };
if (!document.getElementById("forms-css")) { const l = document.createElement("link"); l.id = "forms-css"; l.rel = "stylesheet"; l.href = "/forms.css?v=20261106zb"; document.head.appendChild(l); }
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fsec = (title, desc, inner, o = {}) => `<fieldset class="fsec"${o.hide ? " hidden" : ""}><legend>${title}</legend>${desc ? `<p class="fdesc">${desc}</p>` : ""}<div class="fgrid">${inner}</div></fieldset>`;
export const ff = (label, control, o = {}) => `<div class="ff ${o.c || "c6"}"><label>${label}${control}</label>${o.hint ? `<small class="fhint">${o.hint}</small>` : ""}</div>`;
const inp = (k, v, ex = "") => `<input data-k="${k}" value="${esc(v ?? "")}" ${ex}>`;
const sel = (k, v, opts) => `<select data-k="${k}">${opts.map(([a, b]) => `<option value="${a}" ${String(v ?? "") === a ? "selected" : ""}>${b}</option>`).join("")}</select>`;
const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const MAXP = 8;
// The photo box of a home's edit sheet: the real photos (live homes only: a taken-down or in-review home keeps them private), each with Remove and Make cover, and the add button.
export function photoBoxHtml(h, keys = h.photos || []) {
  const live = h.status === "approved", id = esc(h.id || "x"), full = keys.length >= MAXP;
  const tile = (k, i) => `<div class="t"><img src="/api/photo/${esc(k)}" alt="Photo ${i + 1}" loading="lazy"><button type="button" data-ph-rm="${esc(k)}" aria-label="Remove photo ${i + 1}">&times;</button>${i === 0 ? "<em>COVER</em>" : `<button type="button" class="mk" data-ph-cover="${esc(k)}" aria-label="Make photo ${i + 1} the cover">Cover</button>`}</div>`;
  const grid = live && keys.length ? `<div class="thumbs">${keys.map(tile).join("")}</div>` : "";
  const note = !keys.length ? '<p class="small muted">No photos yet.</p>' : !live ? `<p class="small muted">${keys.length} photo${keys.length === 1 ? "" : "s"}, kept private while this home is not on the map. They show again when it is.</p>` : "";
  return `${grid}${note}<div class="padd"><label class="btn out sm" for="ph-${id}">Add photos</label><input id="ph-${id}" type="file" accept="image/*" multiple hidden data-ephotos ${full ? "disabled" : ""}><span class="small muted" data-pstat role="status">${full ? "That is the limit of 8 photos. Remove one to add another." : ""}</span></div>`;
}
// The listing's edit form (a display). pro = a professional installer's listing (adds phone, website, areas served). changes = html of recent changes.
// own = the signed-in person posted this home (Your profile): the form also has the season, the photos and the address, and they go through the same checks as a new submission.
export function homeForm(h, { pro = false, changes = "", cancelAttr = "data-mcancel", own = false, cities = [], seasons = [] } = {}) {
  return `<form class="mform f" hidden novalidate>
    ${fsec("Listing", "", ff("Display name", inp("title", h.title, 'maxlength="90"'), { hint: "The name on the map card." }) + ff("About it", `<textarea data-k="desc" rows="4" maxlength="1200">${esc(h.descr || "")}</textarea>`) + (own ? ff("Season", sel("season", h.season || "christmas", seasons.map(([k, l]) => [k, l])), { c: "c3", hint: "It shows under that season on the map." }) : ""))}
    ${own ? fsec("Photos", "Up to 8. The first one is the cover. Photos are shrunk on your phone before they upload, and they are added or removed right away (you do not need to tap Save).", `<div class="ff c6" data-pbox>${photoBoxHtml(h)}</div>`) : ""}
    ${own ? fsec("Where it is", "Changing the address moves the pin: the new address is looked up the same way as when you first added it. If the new text needs a quick look, the home goes back in review until it is approved, and you will see that when you save.", ff("City", sel("city", h.city || "", [["", "Choose a city"], ...cities.map((c) => [c, c])]), { c: "c3" }) + ff("ZIP", inp("zip", h.zip, 'maxlength="5" inputmode="numeric" autocomplete="postal-code"'), { c: "c3" }) + `<div class="ff c6 combo"><label>Street address<input data-k="street" data-addr value="${esc(h.street ?? "")}" maxlength="120" autocomplete="off"></label></div>`) : ""}
    ${fsec("Plan a visit", "Helps families decide when and how to come.", ff("Lights are on", inp("lights_on", h.lights_on, 'maxlength="60" placeholder="5 to 10 pm nightly"'), { c: "c3" }) + ff("How to see it", sel("visit", h.visit, [["", "Not sure"], ["drive", "Drive by"], ["walk", "Walk by"], ["both", "Drive or walk"]]), { c: "c3" })
      + ff("Parking", sel("parking", h.parking, [["", "Not listed"], ["free", "Free parking nearby"], ["street", "Street parking"], ["none", "Hard to park"]]), { c: "c3" }) + ff("Radio station for the music", inp("radio", h.radio, 'maxlength="40" placeholder="88.1 FM"'), { c: "c3" })
      + ff("Tips for visitors", inp("where", h.where_txt, 'maxlength="120"')) + `<div class="ff c6"><label class="chk"><input type="checkbox" data-k="accessible" ${h.accessible ? "checked" : ""}> Stroller and wheelchair friendly</label></div>`)}
    ${pro ? fsec("How people reach you", "Shown on your listing so families can ask for a quote.", ff("Phone for quotes", inp("phone", h.phone, 'maxlength="80" type="tel"'), { c: "c3" }) + ff("Website", inp("web", h.web, 'maxlength="200" type="url" placeholder="https://"'), { c: "c3" })
      + `<div class="ff c6"><div class="ffl"><span class="lt">Areas served</span>${areaHtml({ id: "a-" + (h.id || "x"), value: h.service_area, extra: 'data-k="area"' })}</div><small class="fhint">The cities or counties you work in, such as Orange County and Los Angeles.</small></div>`) : ""}
    ${changes}<p class="err" role="alert" hidden></p>
    <div class="mfoot sticky"><button class="btn" type="submit">Save</button><button class="btn out" type="button" ${cancelAttr}>Cancel</button></div></form>`;
}
// An event's edit form. cities / seasons ([key, label, { type: label }]) fill the Where, Season and Type fields (the type list follows the season: see wireSeasonType).
export function eventForm(e, { cancelAttr = "data-mcancel", cities = [], seasons = [] } = {}) {
  const cur = seasons.find((x) => x[0] === (e.season || "christmas")) || seasons[0] || ["", "", {}];
  return `<form class="mform f" hidden novalidate>
    ${fsec("Event", "", ff("Event name", inp("name", e.name, 'maxlength="120"')) + (seasons.length ? ff("Season", sel("season", cur[0], seasons.map(([k, l]) => [k, l])), { c: "c3" }) + ff("Type", sel("type", e.type || "", Object.entries(cur[2]).map(([k, l]) => [k, l])), { c: "c3" }) : ""))}
    ${cities.length ? fsec("Where", "Changing the address moves the pin: it is looked up the same way as when you first added the event.", ff("City", sel("city", e.city || "", cities.map((c) => [c, c])), { c: "c3" }) + `<div class="ff c3 combo"><label>Street address<input data-k="address" data-addr value="${esc(e.address ?? "")}" maxlength="160" autocomplete="off"></label></div>`) : ""}
    ${fsec("When", "", ff("Starts", inp("start", e.start_date, 'type="date"'), { c: "c3" }) + ff("Ends", inp("end", e.end_date, 'type="date"'), { c: "c3" }) + ff("Hours", inp("hours", e.hours, 'maxlength="120" placeholder="6 to 10 pm nightly"')))}
    ${fsec("Where and price", "", ff("Venue", inp("venue", e.venue, 'maxlength="120"'), { c: "c4" }) + ff("Price (or Free)", inp("price", e.price, 'maxlength="80"'), { c: "c2" }))}
    ${fsec("Details", "", ff("Description", `<textarea data-k="blurb" rows="4" maxlength="200">${esc(e.blurb || "")}</textarea>`) + ff("Event web page", inp("url", e.url, 'maxlength="300" type="url" placeholder="https://"')))}
    <p class="err" role="alert" hidden></p>
    <div class="mfoot sticky"><button class="btn" type="submit">Save</button><button class="btn out" type="button" ${cancelAttr}>Cancel</button></div></form>`;
}
// When the season changes in an event's edit form, the Type list becomes that season's types.
export function wireSeasonType(form, seasons) {
  const se = form.querySelector('[data-k="season"]'), ty = form.querySelector('[data-k="type"]'); if (!se || !ty) return;
  se.onchange = () => { const s = seasons.find((x) => x[0] === se.value); ty.innerHTML = '<option value="">Choose a type</option>' + Object.entries(s ? s[2] : {}).map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join(""); };
}
// Show an existing form in a window (like Admin's edit windows). Returns close(). The form goes back to its row when the window closes.
export function openFormWindow(form, title) {
  const mark = document.createComment("form"); form.before(mark);
  const w = document.createElement("div"); w.className = "fwin";
  w.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h2>${esc(title)}</h2><button class="xbtn" type="button" aria-label="Close" title="Close">${X}</button></div></div>`;
  w.firstChild.appendChild(form); form.hidden = false; document.body.appendChild(w); wireAreas(w);
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const close = () => { document.removeEventListener("keydown", onKey); form.hidden = true; if (mark.parentNode) mark.replaceWith(form); w.remove(); };
  w.querySelector(".xbtn").onclick = close; w.addEventListener("click", (e) => { if (e.target === w) close(); }); document.addEventListener("keydown", onKey);
  const first = form.querySelector("input,select,textarea"); if (first) first.focus();
  return close;
}
