// Admin > From Grok: the events Grok sent from its browser pass (docs/monetization/grok-browser-pass.md) and the changes it made to events already on the map.
// Same format as Events: pill tabs, a table, and a full-page record with a Back link and the actions at the top right.
import { esc, btn, toast } from "/admin/kit.js?v=20261113a";
import { SEASONS } from "/seasons.js?v=20261115a";

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
const LABEL = { published: ["On the map", "ok"], held: ["Held for you", "warn"], unpublished: ["Taken down", "bad"], rejected: ["Rejected", "bad"] };
const VIEWS = [["published", "On the map"], ["held", "Held"], ["unpublished", "Taken down"], ["rejected", "Rejected"], ["updates", "Updates"]];
const ULABEL = { applied: ["Applied", "ok"], held: ["Needs you", "warn"], reverted: ["Undone", "bad"], dismissed: ["Dismissed", ""] };
const KIND = { confirm: "Confirmed from its page", change: "Corrected from its page", photo: "Photo link", cancelled: "Page says cancelled" };
const NAMES = { start: "Starts", end: "Ends", hours: "Hours", price: "Price", free: "Free", status: "Status", image: "Photo" };
const DONE = { publish: "Published", unpublish: "Unpublished", remove_photo: "Photo removed", update_revert: "Undone", update_apply: "Applied", update_dismiss: "Dismissed" };
const diff = (b, a) => Object.keys(a).filter((k) => String(a[k]) !== String(b[k])).map((k) => `${NAMES[k] || k}: <s>${esc(String(b[k] ?? "") || "none")}</s> → <b>${esc(String(a[k] ?? "") || "none")}</b>`).join("<br>");
const jp = (v) => { try { return JSON.parse(v || "{}"); } catch { return {}; } };
const when = (s) => esc(String(s || "").slice(0, 16).replace("T", " ")) + " UTC";
const link = (u) => (u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>` : "");
const detail = (name) => document.dispatchEvent(new CustomEvent("admin:detail", { detail: name })); // the breadcrumb in the top bar (admin.js)
const kv = (pairs) => `<div class="kv">${pairs.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join("")}</div>`;
const card = (title, inner) => `<section class="rcard"><h3>${esc(title)}</h3>${inner}</section>`;
let VIEW = "published", OPEN = "";

const intakeActions = (x) => (x.status === "published" ? `<a class="btn ghost" href="/e/${encodeURIComponent(x.id)}" target="_blank" rel="noopener">View card</a>` + (x.image ? btn("ghost", "Remove photo", 'data-ga="remove_photo"') : "") + btn("danger", "Unpublish", 'data-ga="unpublish"')
  : x.status === "held" || x.status === "unpublished" ? btn("main", "Publish", 'data-ga="publish"') : x.status === "rejected" ? btn("ghost", "Publish anyway", 'data-ga="publish"') : "");
const updateActions = (x) => `<a class="btn ghost" href="/e/${encodeURIComponent(x.event_id)}" target="_blank" rel="noopener">View card</a>` + (x.status === "applied" ? btn("danger", "Undo", 'data-ga="update_revert"') : x.status === "held" ? (x.kind !== "cancelled" ? btn("main", "Apply", 'data-ga="update_apply"') : "") + btn("ghost", "Dismiss", 'data-ga="update_dismiss"') : "");

function intakeDetail(x) {
  const [lab, kind] = LABEL[x.status] || [x.status, ""], season = SEASONS[x.season] ? SEASONS[x.season].label : x.season;
  return card("Overview", kv([["Name", esc(x.name || "(no name)")], ["Status", `<span class="tag ${kind}">${lab}</span>`], ["Season", esc(season)], ["Type", esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)],
    ["Dates", esc(x.start_date) + (x.end_date !== x.start_date ? " to " + esc(x.end_date) : "")], ["Hours", esc(x.hours)], ["Price", esc(x.price)], ["Received", when(x.received_at)]]))
    + card("Where", kv([["Venue", esc(x.venue)], ["Address", esc(x.address)], ["City", esc(x.city)], ["County", esc(x.county)]]))
    + card("Source", kv([["Page Grok read", link(x.url) + (x.seen ? ` <span class="meta">(read ${esc(x.seen)})</span>` : "")], ["What it said", esc(x.evidence)], [x.status === "rejected" ? "Why it was rejected" : "Note", esc(x.reason)]]))
    + (x.image ? card("Photo", `<a href="${esc(x.image)}" target="_blank" rel="noopener"><img class="gimg" src="${esc(x.image)}" alt="Linked photo for ${esc(x.name)}" loading="lazy" referrerpolicy="no-referrer"></a><p class="meta" style="margin:8px 0 0">Linked from the event's site, not copied.</p>`) : "");
}
function updateDetail(x) {
  const [lab, kind] = ULABEL[x.status] || [x.status, ""];
  return card("Overview", kv([["Event", esc(x.event_name || x.event_id)], ["Status", `<span class="tag ${kind}">${lab}</span>`], ["Kind", esc(KIND[x.kind] || x.kind)], ["Received", when(x.received_at)]]))
    + card("What changed", `<div class="v">${diff(jp(x.before), jp(x.after)) || (x.kind === "cancelled" ? "Nothing yet: the page says the event is cancelled." : "Nothing.")}</div>`)
    + card("Source", kv([["Page Grok read", link(x.url) + (x.seen ? ` <span class="meta">(read ${esc(x.seen)})</span>` : "")], ["What it said", esc(x.evidence)], ["Note", esc(x.reason)]]));
}

export async function renderGrok(main) {
  const d = await api("/api/admin/grok"), n = (k) => (k === "updates" ? (d.updates || []).filter((x) => x.status === "held").length : d.counts[k] || 0);
  const list = VIEW === "updates" ? d.updates || [] : d.rows.filter((r) => r.status === VIEW);
  const open = OPEN && (VIEW === "updates" ? (d.updates || []).find((x) => x.id === OPEN) : d.rows.find((r) => r.id === OPEN));
  if (OPEN && !open) OPEN = "";
  const act = async (b) => {
    b.disabled = true;
    try { await api("/api/admin/grok", { method: "POST", body: JSON.stringify({ action: b.dataset.ga, id: OPEN || b.closest("[data-gid]").dataset.gid }) }); toast(DONE[b.dataset.ga]); OPEN = ""; detail(""); renderGrok(main); }
    catch (er) { b.disabled = false; toast(er.message, true); }
  };
  if (open) { // the full record
    detail(open.name || open.event_name || open.event_id);
    main.innerHTML = `<div class="rpage"><a class="rback" href="#grok" id="gBack"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to From Grok</a>
      <div class="pghead"><div><h2>${VIEW === "updates" ? "Update detail" : "Event detail"}</h2></div><div class="pgacts" data-gid="${esc(open.id)}">${VIEW === "updates" ? updateActions(open) : intakeActions(open)}</div></div>
      ${VIEW === "updates" ? updateDetail(open) : intakeDetail(open)}</div>`;
    window.scrollTo(0, 0);
    main.querySelector("#gBack").onclick = (e) => { e.preventDefault(); OPEN = ""; detail(""); renderGrok(main); };
    main.querySelectorAll("[data-ga]").forEach((b) => (b.onclick = () => act(b)));
    return;
  }
  detail("");
  const state = !d.configured ? `<div class="empty">Not set up yet: no <code>GROK_INTAKE_KEY</code> secret exists. Setup steps are in docs/monetization/grok-browser-pass.md.</div>`
    : `<p class="meta" style="margin:0 0 4px">${d.publishing ? "Publishing is <b>on</b>: rows that pass every check go on the map right away, tagged From Grok." : "Publishing is <b>off</b> (the secret <code>GROK_INTAKE_PUBLISH</code> is 0): rows that pass every check wait under Held, and you publish them with one click. Delete the secret or set it to 1 to publish automatically."}</p>`;
  const head = VIEW === "updates"
    ? `<thead><tr><th>Event</th><th>What changed</th><th>Kind</th><th>Status</th><th>Received</th><th class="ac">Actions</th></tr></thead>`
    : `<thead><tr><th>Event</th><th>City</th><th>Dates</th><th>Status</th><th>Received</th><th class="ac">Actions</th></tr></thead>`;
  const row = (x) => {
    if (VIEW === "updates") { const [lab, kind] = ULABEL[x.status] || [x.status, ""]; return `<tr data-gid="${esc(x.id)}"><td><a class="rl" href="#grok" data-open="${esc(x.id)}">${esc(x.event_name || x.event_id)}</a></td><td>${diff(jp(x.before), jp(x.after)) || '<span class="sub">no change yet</span>'}</td><td>${esc(KIND[x.kind] || x.kind)}</td><td><span class="tag ${kind}">${lab}</span></td><td>${when(x.received_at)}</td><td class="ac">${updateActions(x).replace('class="btn ghost"', 'class="btn ghost sm"')}</td></tr>`; }
    const [lab, kind] = LABEL[x.status] || [x.status, ""];
    return `<tr data-gid="${esc(x.id)}"><td><a class="rl" href="#grok" data-open="${esc(x.id)}">${esc(x.name || "(no name)")}</a><span class="sub">${esc(x.venue || "")}</span></td><td>${esc(x.city)}<span class="sub">${esc(x.county || "")}</span></td><td>${x.start_date ? esc(x.start_date) + (x.end_date !== x.start_date ? " to " + esc(x.end_date) : "") : ""}<span class="sub">${esc(x.hours || "")}</span></td><td><span class="tag ${kind}">${lab}</span></td><td>${when(x.received_at)}</td><td class="ac"><a class="rl" href="#grok" data-open="${esc(x.id)}">Open</a></td></tr>`;
  };
  main.innerHTML = `<div class="pgtabs"><div class="seg" role="group" aria-label="Show">${VIEWS.map(([k, l]) => `<button type="button" data-gv="${k}" aria-pressed="${VIEW === k}">${l}${n(k) ? ` <span>${n(k)}</span>` : ""}</button>`).join("")}</div></div>
    <div class="pghead"><div><h2>From Grok</h2><p>Events Grok found, and the changes it made to events already on the map. Open a row for the full record.</p></div></div>${state}
    ${list.length ? `<div class="card dtc"><div class="dtw"><table class="dtab">${head}<tbody>${list.map(row).join("")}</tbody></table></div><div class="pager"><span class="meta">${list.length} row${list.length === 1 ? "" : "s"}</span></div></div>`
      : `<div class="empty">${VIEW === "published" ? "Nothing from Grok is on the map yet." : VIEW === "updates" ? "No updates from Grok yet. They appear here when Grok confirms or corrects an event already on the map." : "Nothing here."}</div>`}`;
  main.querySelectorAll("[data-gv]").forEach((b) => (b.onclick = () => { VIEW = b.dataset.gv; renderGrok(main); }));
  main.querySelectorAll("[data-open]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); OPEN = a.dataset.open; renderGrok(main); }));
  main.querySelectorAll("[data-ga]").forEach((b) => (b.onclick = () => act(b)));
}
