// Admin > From Grok: the events Grok sent from its browser pass (docs/monetization/grok-browser-pass.md). Published rows are on the map tagged "From Grok"; one click takes one off (and Grok cannot add it again).
import { esc, btn, rec, fact, toast } from "/admin/kit.js?v=20261113a";
import { SEASONS } from "/seasons.js?v=20261114n";

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
const LABEL = { published: ["On the map", "ok"], held: ["Held for you", "warn"], unpublished: ["Taken down", "bad"], rejected: ["Rejected", "bad"] };
const VIEWS = [["published", "On the map"], ["held", "Held"], ["unpublished", "Taken down"], ["rejected", "Rejected"]];
let VIEW = "published";

export async function renderGrok(main) {
  const d = await api("/api/admin/grok");
  const rows = d.rows.filter((r) => r.status === VIEW), n = (k) => d.counts[k] || 0;
  const state = !d.configured ? `<div class="empty">Not set up yet: no <code>GROK_INTAKE_KEY</code> secret exists. Setup steps are in docs/monetization/grok-browser-pass.md.</div>`
    : `<p class="meta" style="margin:0 0 12px">${d.publishing ? "Publishing is <b>on</b>: rows that pass every check go on the map right away, tagged From Grok." : "Publishing is <b>off</b> (set <code>GROK_INTAKE_PUBLISH=1</code> to turn it on): rows that pass every check wait under Held, and you publish them with one click."}</p>`;
  main.innerHTML = `<h2 class="dh" style="margin-top:0">From Grok</h2>${state}
    <div class="seg" role="group" aria-label="Show" style="margin-bottom:14px">${VIEWS.map(([k, l]) => `<button type="button" data-gv="${k}" aria-pressed="${VIEW === k}">${l} <span class="meta">${n(k)}</span></button>`).join("")}</div>
    ${rows.length ? `<div class="cards">${rows.map((x) => {
      const [lab, kind] = LABEL[x.status] || [x.status, ""];
      const season = SEASONS[x.season] ? SEASONS[x.season].label : x.season;
      return rec({
        attrs: `data-gid="${esc(x.id)}"`, title: esc(x.name || "(no name)"), tags: [[lab, kind], ["From Grok", ""]], meta: esc(String(x.received_at || "").slice(0, 16)) + " UTC",
        facts: fact("When", x.start_date ? esc(x.start_date) + (x.end_date !== x.start_date ? " to " + esc(x.end_date) : "") + (x.hours ? " · " + esc(x.hours) : "") : "")
          + fact("Where", x.venue || x.address ? `${esc(x.venue)}<br><span class="meta">${esc(x.address)}, ${esc(x.city)}${x.county ? " · " + esc(x.county) : ""}</span>` : esc(x.city))
          + fact("Type", `${esc(season)} · ${esc((SEASONS[x.season] && SEASONS[x.season].types[x.type]) || x.type)}${x.price ? " · " + esc(x.price) : ""}`)
          + fact("Page Grok read", x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>${x.seen ? ` <span class="meta">(read ${esc(x.seen)})</span>` : ""}` : "")
          + fact("What it said", esc(x.evidence || "")) + fact(x.status === "rejected" ? "Why rejected" : "Note", esc(x.reason || "")),
        main: x.status === "published" ? `<a class="btn ghost" href="/e/${encodeURIComponent(x.id)}" target="_blank" rel="noopener">View card</a>` + btn("danger", "Unpublish", 'data-ga="unpublish"') : x.status === "held" || x.status === "unpublished" ? btn("main", "Publish", 'data-ga="publish"') : "",
      });
    }).join("")}</div>` : `<div class="empty">${VIEW === "published" ? "Nothing from Grok is on the map yet." : "Nothing here."}</div>`}`;
  main.onclick = async (e) => {
    const v = e.target.closest("[data-gv]"); if (v) { VIEW = v.dataset.gv; return renderGrok(main); }
    const b = e.target.closest("[data-ga]"); if (!b) return;
    const id = b.closest("[data-gid]").dataset.gid; b.disabled = true;
    try { await api("/api/admin/grok", { method: "POST", body: JSON.stringify({ action: b.dataset.ga, id }) }); toast(b.dataset.ga === "publish" ? "Published" : "Unpublished"); renderGrok(main); }
    catch (er) { b.disabled = false; toast(er.message, true); }
  };
}
