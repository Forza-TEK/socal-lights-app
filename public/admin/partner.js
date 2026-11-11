// Admin > Event Partners: one list of organizations (a plan, a comp or covered events this season), like Contest passes. Open one for its events (free a slot),
// its comps and plans, and a form to grant it a comp. "Grant a comp" at the top does the same for a new organization (founder cities are free; no price is ever shown to them).
// Plans bought also show in Orders.
import { esc, btn, rec, fact, toast, modalFrame, tap } from "/admin/kit.js?v=20261113a";

const $ = (s) => document.querySelector(s);
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
const pdate = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
let PD = null, MAIN = null; // the last /api/admin/partner answer, so a detail view opens without another request

// Same field markup as the other Admin forms (fieldset, grid of columns)
const field = (id, label, control, c = "c3") => `<div class="ff ${c}"><label for="${id}">${label}</label>${control}</div>`;
const grantForm = (pre, withTarget) => `<fieldset class="fsec"><legend>${withTarget ? "Grant a comp" : "Grant a comp to this organization"}</legend><p class="fdesc">A comp covers an organization's events at no price. The organizer never sees a price: they see "Founding partner: free through the date". ${withTarget ? "Type the organization's website domain (like eastvaleca.gov) or the organizer's email. " : ""}Nothing is granted until you click Grant.</p>
  <div class="fgrid">${withTarget ? field(pre + "Target", "Website domain or organizer email", `<input id="${pre}Target" maxlength="120" placeholder="eastvaleca.gov" autocomplete="off">`, "c6") : ""}
  ${field(pre + "Allowed", "Events per season", `<input id="${pre}Allowed" type="number" min="1" max="1000" value="10" inputmode="numeric">`)}
  ${field(pre + "Until", "Valid until", `<input id="${pre}Until" type="date">`)}
  ${field(pre + "Note", "Note (only you see it)", `<input id="${pre}Note" maxlength="300" placeholder="Founding city partner">`, "c6")}</div>
  <div class="mfoot grantfoot"><button class="btn ice" type="button" id="${pre}Go">Grant comp</button><span class="msg" id="${pre}Msg" role="status"></span></div></fieldset>`;
// key = the organization the form belongs to ("" = it asks for one); onDone runs after a successful grant
function wireGrant(root, pre, key, onDone) {
  const q = (id) => root.querySelector("#" + pre + id);
  q("Go").onclick = async () => {
    const m = q("Msg"); m.className = "msg"; m.textContent = "Working…";
    try { await api("/api/admin/partner", { method: "POST", body: JSON.stringify({ action: "grant", target: key || q("Target").value, allowed: Number(q("Allowed").value), until: q("Until").value, note: q("Note").value }) }); toast("Comp granted"); await onDone(); }
    catch (er) { m.className = "msg err"; m.textContent = er.message; }
  };
}

const orgStatus = (o) => (o.comp ? ["Comp", "ok"] : o.hasPlan ? ["Plan", "ok"] : ["None", ""]);
function orgRow(o) {
  const [t, tone] = orgStatus(o), cap = o.unlimited ? "unlimited" : o.cap ?? 0;
  const sub = `${o.used} of ${cap} event${cap === 1 ? "" : "s"} this season${o.comp ? ` · comp through ${pdate(o.comp.until)}` : ""}`;
  return rec({ compact: true, attrs: `data-pkey="${esc(o.key)}"`, title: esc(o.label), tags: [[t, tone]], lead: `<span class="sub">${esc(sub)}</span>`, main: btn("ghost", "Open", 'data-popen="1"') });
}
const compCard = (c) => rec({ attrs: `data-pcomp="${esc(c.id)}"`, title: esc(c.label), tags: [[c.running ? "Running" : c.revoked ? "Ended by you" : "Expired", c.running ? "ok" : ""]], meta: esc((c.created_at || "").slice(0, 10)),
  facts: fact("Allowed", c.allowed < 0 ? "unlimited events per season" : `${c.allowed} events per season`) + fact("Valid until", esc(pdate(c.valid_until))) + fact("Note", esc(c.note)) + fact("Granted by", esc(c.created_by)), main: c.running ? btn("ghost", "Edit", 'data-pedit="1"') : "", danger: c.running ? btn("danger", "End this comp now", 'data-pact="revoke_comp"') : "",
  body: c.running ? `<form class="f pcedit" data-pcform hidden><div class="fgrid">${field("pe" + c.id + "A", "Events per season", `<input type="number" min="1" max="1000" inputmode="numeric" value="${c.allowed < 0 ? 10 : c.allowed}" data-pe="allowed"${c.allowed < 0 ? " disabled" : ""}>`)}${field("pe" + c.id + "U", "Valid until", `<input type="date" value="${esc(c.valid_until)}" data-pe="until">`)}${field("pe" + c.id + "L", "Unlimited", `<label class="chk"><input type="checkbox" data-pe="unl"${c.allowed < 0 ? " checked" : ""}> No limit while the comp runs</label>`)}${field("pe" + c.id + "N", "Note (only you see it)", `<input maxlength="300" value="${esc(c.note || "")}" data-pe="note">`, "c6")}</div><div class="mfoot grantfoot"><button class="btn ice" type="submit">Save changes</button><button class="btn ghost" type="button" data-pecancel>Cancel</button><span class="msg" role="status"></span></div></form>` : "" });
const planCard = (p) => rec({ title: esc(p.label), tags: [[p.status === "active" ? "Active" : "Revoked", p.status === "active" ? "ok" : ""]], meta: esc((p.created_at || "").slice(0, 10)),
  facts: fact("Season", `${esc(pdate(p.season_start))} to ${esc(pdate(p.season_end))}`) + fact("Paid", esc("$" + ((p.amount || 0) / 100).toFixed(2))) + fact("Buyer", esc(p.email || "")) + fact("Order", esc(p.order_status || "")) });

function openGrant() {
  const m = $("#modal"); m.hidden = false; m.innerHTML = modalFrame("Grant a comp", `<div class="f">${grantForm("pg", true)}</div>`, true);
  const close = () => { m.hidden = true; m.innerHTML = ""; }; $("#mClose").onclick = close;
  wireGrant(m, "pg", "", async () => { close(); await renderPartner(MAIN); });
}
function openOrg(key) {
  const o = PD.orgs.find((x) => x.key === key); if (!o) return;
  const m = $("#modal"); m.hidden = false;
  const comps = PD.comps.filter((c) => c.org_key === key), plans = PD.plans.filter((p) => p.org_key === key), [t, tone] = orgStatus(o);
  const events = o.events.length ? `<ul class="plist">${o.events.map((e) => `<li data-evrow="${esc(e.id)}">${esc(e.name || e.id)} <span class="meta">${esc(e.applied_from)} to ${esc(e.applied_until)}</span> <a href="#" data-act="release" data-ev="${esc(e.id)}" data-ss="${esc(e.season_start)}">free this slot</a></li>`).join("")}</ul>` : `<div class="empty">No event is covered under this organization yet.</div>`;
  m.innerHTML = modalFrame(o.label, `<p class="meta">${esc(o.key)} <span class="tag ${tone}">${esc(t)}</span></p>
    <dl class="facts">${fact("This season", esc(PD.season.label) + " · through " + esc(pdate(PD.season.end)))}${fact("Events used", `<b>${o.used}</b> of ${o.unlimited ? "unlimited" : o.cap ?? 0}`)}${o.comp ? fact("Comp", `${o.comp.unlimited ? "unlimited" : o.comp.allowed} per season through ${esc(pdate(o.comp.until))}${o.comp.note ? " · " + esc(o.comp.note) : ""}`) : ""}</dl>
    <h3 class="dh">Events</h3>${events}
    <h3 class="dh">Comps</h3><div class="cards">${comps.length ? comps.map(compCard).join("") : `<div class="empty">No comps for this organization.</div>`}</div>
    <details class="pgrant"><summary>Grant a comp to this organization</summary><div class="f">${grantForm("po", false)}</div></details>
    <h3 class="dh">Plans bought</h3><div class="cards">${plans.length ? plans.map(planCard).join("") : `<div class="empty">No plans bought. Plans also show in Orders.</div>`}</div>`, true);
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  $("#mClose").onclick = close;
  wireGrant(m, "po", key, async () => { await renderPartner(MAIN); openOrg(key); });
  m.querySelectorAll("[data-pact]").forEach((b) => (b.onclick = async () => {
    if (!tap(b, "end this comp")) return;
    try { await api("/api/admin/partner", { method: "POST", body: JSON.stringify({ action: "revoke_comp", id: b.closest("[data-pcomp]").dataset.pcomp }) }); toast("Done"); await renderPartner(MAIN); openOrg(key); } catch (er) { toast(er.message, true); }
  }));
  m.querySelectorAll("[data-pedit]").forEach((b) => (b.onclick = () => { const f = b.closest("[data-pcomp]").querySelector("[data-pcform]"); f.hidden = !f.hidden; if (!f.hidden) f.querySelector("[data-pe=until]").focus(); }));
  m.querySelectorAll("[data-pcform]").forEach((f) => {
    const g = (k) => f.querySelector(`[data-pe=${k}]`), msg = f.querySelector(".msg");
    g("unl").onchange = (e) => { g("allowed").disabled = e.target.checked; };
    f.querySelector("[data-pecancel]").onclick = () => { f.hidden = true; };
    f.onsubmit = async (e) => {
      e.preventDefault(); msg.className = "msg"; msg.textContent = "Saving…";
      try { await api("/api/admin/partner", { method: "POST", body: JSON.stringify({ action: "edit_comp", id: f.closest("[data-pcomp]").dataset.pcomp, allowed: g("unl").checked ? "unlimited" : Number(g("allowed").value), until: g("until").value, note: g("note").value }) }); toast("Comp saved"); await renderPartner(MAIN); openOrg(key); }
      catch (er) { msg.className = "msg err"; msg.textContent = er.message; }
    };
  });
  m.querySelectorAll("[data-act=release]").forEach((a) => (a.onclick = async (e) => {
    e.preventDefault();
    if (!tap(a, "free this slot")) return;
    try { await api("/api/admin/partner", { method: "POST", body: JSON.stringify({ action: "release", event_id: a.dataset.ev, season_start: a.dataset.ss }) }); toast("Slot freed. The Event Partner badge is gone; the Featured pin is left as it is (change it in Events)."); await renderPartner(MAIN); openOrg(key); } catch (er) { toast(er.message, true); }
  }));
}

export async function renderPartner(main) {
  MAIN = main;
  let d;
  try { d = await api("/api/admin/partner"); } catch (er) { main.innerHTML = `<div class="empty">${esc(er.message)}</div>`; return; }
  PD = d;
  const old = d.comps.filter((c) => !c.running).length + d.plans.filter((p) => p.status !== "active").length;
  main.innerHTML = `<div class="dhrow"><h2 class="dh">Organizations (${d.orgs.length})</h2>${btn("main", "Grant a comp", 'id="ppNew"')}</div>
    <p class="meta">Every organization with a plan, a comp or a covered event this season (${esc(d.season.label)}, through ${esc(pdate(d.season.end))}). Open one for its events, comps and plans.</p>
    ${d.orgs.length ? `<div class="cards">${d.orgs.map(orgRow).join("")}</div>` : `<div class="empty">No organization has a plan, a comp or a covered event this season yet.</div>`}
    ${old ? `<details class="pleads"><summary>Ended comps and past plans (${old})</summary><div class="cards">${d.comps.filter((c) => !c.running).map(compCard).join("")}${d.plans.filter((p) => p.status !== "active").map(planCard).join("")}</div></details>` : ""}`;
  $("#ppNew").onclick = openGrant;
  main.querySelectorAll("[data-pkey]").forEach((card) => (card.onclick = (e) => { if (e.target.closest("a")) return; openOrg(card.dataset.pkey); }));
}
