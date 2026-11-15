// Admin > From Grok: the events Grok sent from its browser pass (docs/monetization/grok-browser-pass.md). Published rows are on the map tagged "From Grok"; one click takes one off (and Grok cannot add it again).
import { esc, btn, rec, fact, toast } from "/admin/kit.js?v=20261113a";
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
const diff = (b, a) => Object.keys(a).filter((k) => String(a[k]) !== String(b[k])).map((k) => `${NAMES[k] || k}: <s>${esc(String(b[k] ?? "") || "none")}</s> → <b>${esc(String(a[k] ?? "") || "none")}</b>`).join("<br>");
const jp = (v) => { try { return JSON.parse(v || "{}"); } catch { return {}; } };
let VIEW = "published";

function updatesHtml(list) {
  if (!list.length) return `<div class="empty">No updates from Grok yet. They appear here when Grok confirms or corrects an event already on the map.</div>`;
  return `<div class="cards">${list.map((x) => {
    const [lab, kind] = ULABEL[x.status] || [x.status, ""], b = jp(x.before), a = jp(x.after);
    return rec({
      attrs: `data-gid="${esc(x.id)}"`, title: esc(x.event_name || x.event_id), tags: [[lab, kind], [KIND[x.kind] || x.kind, ""], ["From Grok", ""]], meta: esc(String(x.received_at || "").slice(0, 16)) + " UTC",
      facts: fact("What changed", diff(b, a) || (x.kind === "cancelled" ? "nothing yet: the page says the event is cancelled" : "nothing")) + fact("Page Grok read", x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>${x.seen ? ` <span class="meta">(read ${esc(x.seen)})</span>` : ""}` : "") + fact("What it said", esc(x.evidence || "")) + fact("Note", esc(x.reason || "")),
      main: `<a class="btn ghost" href="/e/${encodeURIComponent(x.event_id)}" target="_blank" rel="noopener">View card</a>` + (x.status === "applied" ? btn("danger", "Undo", 'data-ga="update_revert"') : x.status === "held" ? (x.kind !== "cancelled" ? btn("main", "Apply", 'data-ga="update_apply"') : "") + btn("ghost", "Dismiss", 'data-ga="update_dismiss"') : ""),
    });
  }).join("")}</div>`;
}

export async function renderGrok(main) {
  const d = await api("/api/admin/grok");
  const rows = d.rows.filter((r) => r.status === VIEW), n = (k) => (k === "updates" ? (d.updates || []).filter((x) => x.status === "held").length : d.counts[k] || 0);
  const state = !d.configured ? `<div class="empty">Not set up yet: no <code>GROK_INTAKE_KEY</code> secret exists. Setup steps are in docs/monetization/grok-browser-pass.md.</div>`
    : `<p class="meta" style="margin:0 0 12px">${d.publishing ? "Publishing is <b>on</b>: rows that pass every check go on the map right away, tagged From Grok." : "Publishing is <b>off</b> (the secret <code>GROK_INTAKE_PUBLISH</code> is 0): rows that pass every check wait under Held, and you publish them with one click. Delete the secret or set it to 1 to publish automatically."}</p>`;
  const block = VIEW === "updates" ? "" : rows.length ? `<div class="cards">${rows.map((x) => {
      const [lab, kind] = LABEL[x.status] || [x.status, ""];
      const season = SEASONS[x.season] ? SEASONS[x.season].label : x.season;
      return rec({
        attrs: `data-gid="${esc(x.id)}"`, title: esc(x.name || "(no name)"), tags: [[lab, kind], ["From Grok", ""]], meta: esc(String(x.received_at || "").slice(0, 16)) + " UTC",
        facts: fact("When", x.start_date ? esc(x.start_date) + (x.end_date !== x.start_date ? " to " + esc(x.end_date) : "") + (x.hours ? " · " + esc(x.hours) : "") : "")
          + fact("Where", x.venue || x.address ? `${esc(x.venue)}<br><span class="meta">${esc(x.address)}, ${esc(x.city)}${x.county ? " · " + esc(x.county) : ""}</span>` : esc(x.city))
          + fact("Type", `${esc(season)} · ${esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)}${x.price ? " · " + esc(x.price) : ""}`)
          + fact("Page Grok read", x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>${x.seen ? ` <span class="meta">(read ${esc(x.seen)})</span>` : ""}` : "")
          + fact("Photo", x.image ? `<a href="${esc(x.image)}" target="_blank" rel="noopener"><img src="${esc(x.image)}" alt="Linked photo for ${esc(x.name)}" loading="lazy" referrerpolicy="no-referrer" style="max-width:160px;max-height:110px;border-radius:8px;display:block"></a><span class="meta">linked from the event's site, not copied</span>` : "")
          + fact("What it said", esc(x.evidence || "")) + fact(x.status === "rejected" ? "Why rejected" : "Note", esc(x.reason || "")),
        main: x.status === "published" ? `<a class="btn ghost" href="/e/${encodeURIComponent(x.id)}" target="_blank" rel="noopener">View card</a>` + (x.image ? btn("ghost", "Remove photo", 'data-ga="remove_photo"') : "") + btn("danger", "Unpublish", 'data-ga="unpublish"') : x.status === "held" || x.status === "unpublished" ? btn("main", "Publish", 'data-ga="publish"') : x.status === "rejected" ? btn("ghost", "Publish anyway", 'data-ga="publish"') : "",
      });
    }).join("")}</div>` : `<div class="empty">${VIEW === "published" ? "Nothing from Grok is on the map yet." : "Nothing here."}</div>`;
  main.innerHTML = `<h2 class="dh" style="margin-top:0">From Grok</h2>${state}
    <div class="seg" role="group" aria-label="Show" style="margin-bottom:14px">${VIEWS.map(([k, l]) => `<button type="button" data-gv="${k}" aria-pressed="${VIEW === k}">${l} <span class="meta">${n(k)}</span></button>`).join("")}</div>
    ${VIEW === "updates" ? updatesHtml(d.updates || []) : block}`;
  main.onclick = async (e) => {
    const v = e.target.closest("[data-gv]"); if (v) { VIEW = v.dataset.gv; return renderGrok(main); }
    const b = e.target.closest("[data-ga]"); if (!b) return;
    const id = b.closest("[data-gid]").dataset.gid; b.disabled = true;
    try { await api("/api/admin/grok", { method: "POST", body: JSON.stringify({ action: b.dataset.ga, id }) }); toast({ publish: "Published", unpublish: "Unpublished", remove_photo: "Photo removed", update_revert: "Undone", update_apply: "Applied", update_dismiss: "Dismissed" }[b.dataset.ga]); renderGrok(main); }
    catch (er) { b.disabled = false; toast(er.message, true); }
  };
}
