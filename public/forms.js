// Shared edit-form pieces for Profile, the installer page and the contest dashboard (the same layout the Admin edit windows use).
import { areaHtml, wireAreas } from "/areapick.js?v=20261102a";
export { wireAreas };
if (!document.getElementById("forms-css")) { const l = document.createElement("link"); l.id = "forms-css"; l.rel = "stylesheet"; l.href = "/forms.css?v=20261111fe1"; document.head.appendChild(l); }
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fsec = (title, desc, inner, o = {}) => `<fieldset class="fsec"${o.hide ? " hidden" : ""}><legend>${title}</legend>${desc ? `<p class="fdesc">${desc}</p>` : ""}<div class="fgrid">${inner}</div></fieldset>`;
export const ff = (label, control, o = {}) => `<div class="ff ${o.c || "c6"}"><label>${label}${control}</label>${o.hint ? `<small class="fhint">${o.hint}</small>` : ""}</div>`;
const inp = (k, v, ex = "") => `<input data-k="${k}" value="${esc(v ?? "")}" ${ex}>`;
const sel = (k, v, opts) => `<select data-k="${k}">${opts.map(([a, b]) => `<option value="${a}" ${String(v ?? "") === a ? "selected" : ""}>${b}</option>`).join("")}</select>`;
const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// The listing's edit form (a display). pro = a professional installer's listing (adds phone, website, areas served). changes = html of recent changes.
export function homeForm(h, { pro = false, changes = "", cancelAttr = "data-mcancel" } = {}) {
  return `<form class="mform f" hidden novalidate>
    ${fsec("Listing", "", ff("Display name", inp("title", h.title, 'maxlength="90"'), { hint: "The name on the map card." }) + ff("About it", `<textarea data-k="desc" rows="4" maxlength="1200">${esc(h.descr || "")}</textarea>`))}
    ${fsec("Plan a visit", "Helps families decide when and how to come.", ff("Lights are on", inp("lights_on", h.lights_on, 'maxlength="60" placeholder="5 to 10 pm nightly"'), { c: "c3" }) + ff("How to see it", sel("visit", h.visit, [["", "Not sure"], ["drive", "Drive by"], ["walk", "Walk by"], ["both", "Drive or walk"]]), { c: "c3" })
      + ff("Parking", sel("parking", h.parking, [["", "Not listed"], ["free", "Free parking nearby"], ["street", "Street parking"], ["none", "Hard to park"]]), { c: "c3" }) + ff("Radio station for the music", inp("radio", h.radio, 'maxlength="40" placeholder="88.1 FM"'), { c: "c3" })
      + ff("Tips for visitors", inp("where", h.where_txt, 'maxlength="120"')) + `<div class="ff c6"><label class="chk"><input type="checkbox" data-k="accessible" ${h.accessible ? "checked" : ""}> Stroller and wheelchair friendly</label></div>`)}
    ${pro ? fsec("How people reach you", "Shown on your listing so families can ask for a quote.", ff("Phone for quotes", inp("phone", h.phone, 'maxlength="80" type="tel"'), { c: "c3" }) + ff("Website", inp("web", h.web, 'maxlength="200" type="url" placeholder="https://"'), { c: "c3" })
      + `<div class="ff c6"><div class="ffl"><span class="lt">Areas served</span>${areaHtml({ id: "a-" + (h.id || "x"), value: h.service_area, extra: 'data-k="area"' })}</div><small class="fhint">The cities or counties you work in, such as Orange County and Los Angeles.</small></div>`) : ""}
    ${changes}<p class="err" role="alert" hidden></p>
    <div class="mfoot sticky"><button class="btn" type="submit">Save</button><button class="btn out" type="button" ${cancelAttr}>Cancel</button></div></form>`;
}
// An event's edit form
export function eventForm(e, { cancelAttr = "data-mcancel" } = {}) {
  return `<form class="mform f" hidden novalidate>
    ${fsec("Event", "", ff("Event name", inp("name", e.name, 'maxlength="120"')))}
    ${fsec("When", "", ff("Starts", inp("start", e.start_date, 'type="date"'), { c: "c3" }) + ff("Ends", inp("end", e.end_date, 'type="date"'), { c: "c3" }) + ff("Hours", inp("hours", e.hours, 'maxlength="120" placeholder="6 to 10 pm nightly"')))}
    ${fsec("Where and price", "", ff("Venue", inp("venue", e.venue, 'maxlength="120"'), { c: "c4" }) + ff("Price (or Free)", inp("price", e.price, 'maxlength="80"'), { c: "c2" }))}
    ${fsec("Details", "", ff("Description", `<textarea data-k="blurb" rows="4" maxlength="200">${esc(e.blurb || "")}</textarea>`) + ff("Event web page", inp("url", e.url, 'maxlength="300" type="url" placeholder="https://"')))}
    <p class="err" role="alert" hidden></p>
    <div class="mfoot sticky"><button class="btn" type="submit">Save</button><button class="btn out" type="button" ${cancelAttr}>Cancel</button></div></form>`;
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
