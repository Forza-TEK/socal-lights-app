// Admin > From Grok: the events Grok sent from its browser pass (docs/monetization/grok-browser-pass.md) and the changes it made to events already on the map.
// Same format as Events: pill tabs, a table, and a full-page record with a Back link and the actions at the top right.
import { esc, btn, toast, tap, askBox, mdy, localTime } from "/admin/kit.js?v=20261121a";
import { SEASONS } from "/seasons.js?v=20261115a";

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || "Something went wrong. Try again."); e.data = d; throw e; }
  return d;
}
const LABEL = { published: ["On the map", "ok"], held: ["Held for you", "warn"], unpublished: ["Taken down", "bad"], rejected: ["Rejected", "bad"] };
const VIEWS = [["published", "On the map"], ["held", "Held"], ["unpublished", "Taken down"], ["rejected", "Rejected"], ["updates", "Updates"]];
const ULABEL = { applied: ["Applied", "ok"], held: ["Needs you", "warn"], reverted: ["Undone", "bad"], dismissed: ["Dismissed", ""], removed: ["Event removed", "bad"] };
const KIND = { confirm: "Confirmed from its page", change: "Corrected from its page", photo: "Photo link", cancelled: "Page says cancelled" };
const NAMES = { start: "Starts", end: "Ends", hours: "Hours", price: "Price", free: "Free", status: "Status", image: "Photo" };
const DONE = { publish: "Published", unpublish: "Unpublished", remove_photo: "Photo removed", update_revert: "Undone", update_apply: "Applied", update_remove: "Event taken off the map", update_dismiss: "Left as is", reject: "Rejected" };
const diff = (b, a) => Object.keys(a).filter((k) => String(a[k]) !== String(b[k])).map((k) => `${NAMES[k] || k}: <s>${esc(String(b[k] ?? "") || "none")}</s> → <b>${esc(String(a[k] ?? "") || "none")}</b>`).join("<br>");
const jp = (v) => { try { return JSON.parse(v || "{}"); } catch { return {}; } };
const when = (s) => esc(localTime(s));
const link = (u) => (u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>` : "");
const detail = (name) => document.dispatchEvent(new CustomEvent("admin:detail", { detail: name })); // the breadcrumb in the top bar (admin.js)
const kv = (pairs) => `<div class="kv">${pairs.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join("")}</div>`;
const card = (title, inner) => `<section class="rcard"><h3>${esc(title)}</h3>${inner}</section>`;
let VIEW = "published", OPEN = "", SHOWN = 30, QUERY = "";

const intakeActions = (x) => (x.status === "published" ? `<a class="btn ghost" href="/e/${encodeURIComponent(x.id)}" target="_blank" rel="noopener">View card</a>` + (x.image ? btn("ghost", "Remove photo", 'data-ga="remove_photo"') : "") + btn("danger", "Unpublish", 'data-ga="unpublish"')
  : x.status === "held" ? btn("main", "Publish", 'data-ga="publish"') + btn("ghost", "Reject", 'data-ga="reject"') : x.status === "unpublished" ? btn("main", "Publish", 'data-ga="publish"') : x.status === "rejected" ? btn("ghost", "Publish anyway", 'data-ga="publish"') : "");
const updateActions = (x) => `<a class="btn ghost" href="/e/${encodeURIComponent(x.event_id)}" target="_blank" rel="noopener">View card</a>` + (x.status === "applied" ? btn("danger", "Undo", 'data-ga="update_revert"') : x.status === "held" ? (x.kind === "cancelled" ? btn("danger", "Take off the map", 'data-ga="update_remove"') + btn("ghost", "Keep on map", 'data-ga="update_dismiss"') : btn("main", "Apply", 'data-ga="update_apply"') + btn("ghost", "Ignore", 'data-ga="update_dismiss"')) : "");

function intakeDetail(x) {
  const [lab, kind] = LABEL[x.status] || [x.status, ""], season = SEASONS[x.season] ? SEASONS[x.season].label : x.season;
  return card("Overview", kv([["Name", esc(x.name || "(no name)")], ["Status", `<span class="tag ${kind}">${lab}</span>`], ["Season", esc(season)], ["Type", esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)],
    ["Dates", mdy(x.start_date) + (x.end_date !== x.start_date ? " to " + mdy(x.end_date) : "")], ["Hours", esc(x.hours)], ["Price", esc(x.price)], ["Received", when(x.received_at)]]))
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
    const g = b.dataset.ga, rej = open && VIEW !== "updates" && open.status === "rejected";
    if ((g === "unpublish" || g === "update_revert" || g === "remove_photo" || g === "update_remove" || (g === "publish" && rej)) && !tap(b, { unpublish: "unpublish", update_revert: "undo", remove_photo: "remove the photo", update_remove: "take it off the map", publish: "publish anyway" }[g])) return; // a second tap goes ahead
    b.disabled = true;
    const send = (force) => api("/api/admin/grok", { method: "POST", body: JSON.stringify({ action: g, id: OPEN || b.closest("[data-gid]").dataset.gid, force }) });
    try { try { await send(false); } catch (er) { if (er.data && er.data.code === "duplicate" && (await askBox({ title: "Possible duplicate", message: er.message, go: "Publish anyway", danger: true }))) await send(true); else throw er; } toast(DONE[b.dataset.ga]); OPEN = ""; detail(""); renderGrok(main); }
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
  // One stacked row per record (no table, so nothing scrolls sideways). Rows that need you are pulled out into the "Needs you" box at the top.
  const isUpd = (x) => String(x.id).startsWith("gu-");
  const dates = (x) => (x.start_date ? mdy(x.start_date) + (x.end_date && x.end_date !== x.start_date ? " to " + mdy(x.end_date) : "") : "");
  const sub = (x) => (isUpd(x) ? [esc(KIND[x.kind] || x.kind), when(x.received_at)] : [esc(x.city), dates(x), when(x.received_at)]).filter(Boolean).join(" · ");
  const status = (x) => { const [lab, kind] = (isUpd(x) ? ULABEL : LABEL)[x.status] || [x.status, ""]; return `<span class="tag ${kind}">${lab}</span>`; };
  const gacts = (x) => (isUpd(x) ? updateActions(x) : intakeActions(x)).replace(/class="btn ghost"/g, 'class="btn ghost sm"').replace(/class="btn main"/g, 'class="btn main sm"').replace(/class="btn danger"/g, 'class="btn danger sm"');
  const grow = (x, need) => `<div class="gr${need ? " need" : ""}" data-gid="${esc(x.id)}" data-q="${esc([x.name, x.event_name, x.city, x.venue, x.event_id].join(" ").toLowerCase())}">
    ${isUpd(x) ? "" : `<span class="rthumb">${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'}</span>`}
    <div class="gm"><div class="gt"><a class="rl" href="#grok" data-open="${esc(x.id)}">${esc(x.name || x.event_name || x.event_id || "(no name)")}</a> ${status(x)}</div>
      <div class="gmeta">${sub(x)}</div>${isUpd(x) ? `<div class="gd">${diff(jp(x.before), jp(x.after)) || '<span class="sub">no change yet</span>'}</div>` : x.status === "rejected" && x.reason ? `<div class="gd">${esc(x.reason)}</div>` : ""}</div>
    <div class="ga">${gacts(x)}</div></div>`;
  const needs = [...d.rows.filter((r) => r.status === "held"), ...(d.updates || []).filter((u) => u.status === "held")];
  const needBox = needs.length ? `<section class="gneed" aria-label="Needs you"><h3>Needs you <span class="gn">${needs.length}</span></h3><p class="meta">Held until you decide. Open a row for the full record, or use the buttons.</p><div class="gl">${needs.map((x) => grow(x, true)).join("")}</div></section>` : `<div class="gclear">Nothing is waiting on you.</div>`;
  const rest = list.filter((x) => x.status !== "held"), heldHere = list.length - rest.length;
  main.innerHTML = `<div class="pghead"><div><h2>From Grok</h2><p>Events Grok found, and the changes it made to events already on the map.</p></div></div>${state}
    ${needBox}
    <div class="pgtabs"><div class="seg" role="group" aria-label="Show">${VIEWS.map(([k, l]) => `<button type="button" data-gv="${k}" aria-pressed="${VIEW === k}">${l}${n(k) && k !== "held" ? ` <span>${n(k)}</span>` : ""}</button>`).join("")}</div></div>
    ${rest.length ? `<input type="search" id="gq" class="gq" placeholder="Search this list by name or city" aria-label="Search this list" value="${esc(QUERY)}"><div class="gl" id="gList">${rest.map((x) => grow(x, false)).join("")}</div><div class="pager"><span class="meta" id="gCount"></span><button type="button" class="btn ghost sm" id="gMore">Show more</button></div>`
      : `<div class="empty">${VIEW === "published" ? "Nothing from Grok is on the map yet." : VIEW === "updates" ? (heldHere ? "Everything here is waiting in the Needs you box above." : "No updates from Grok yet. They appear here when Grok confirms or corrects an event already on the map.") : heldHere ? "Everything here is waiting in the Needs you box above." : "Nothing here."}</div>`}`;
  const fit = () => { // show the first SHOWN rows that match the search
    const rows = [...main.querySelectorAll("#gList .gr")], q = QUERY.trim().toLowerCase(), hit = rows.filter((r) => !q || r.dataset.q.includes(q)); if (!rows.length) return;
    rows.forEach((r) => (r.hidden = true)); hit.slice(0, SHOWN).forEach((r) => (r.hidden = false));
    main.querySelector("#gCount").textContent = hit.length ? `Showing ${Math.min(SHOWN, hit.length)} of ${hit.length}` : "No match";
    main.querySelector("#gMore").hidden = hit.length <= SHOWN;
  };
  const gq = main.querySelector("#gq"); if (gq) { gq.oninput = () => { QUERY = gq.value; SHOWN = 30; fit(); }; main.querySelector("#gMore").onclick = () => { SHOWN += 30; fit(); }; fit(); }
  main.querySelectorAll("[data-gv]").forEach((b) => (b.onclick = () => { VIEW = b.dataset.gv; SHOWN = 30; QUERY = ""; renderGrok(main); }));
  main.querySelectorAll("[data-open]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); OPEN = a.dataset.open; renderGrok(main); }));
  main.querySelectorAll("[data-ga]").forEach((b) => (b.onclick = () => act(b)));
}
