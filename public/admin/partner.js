// Admin > Event Partners: every organization with a plan, a comp or covered events this season, the comps (founder cities are free; no price is ever shown to them),
// a form to grant a comp, and a way to free a slot. Plans bought also show in Orders.
import { esc, btn, rec, fact, toast } from "/admin/kit.js?v=20261103a";

const $ = (s) => document.querySelector(s);
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
const pdate = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

export async function renderPartner(main) {
  let d;
  try { d = await api("/api/admin/partner"); } catch (er) { main.innerHTML = `<div class="empty">${esc(er.message)}</div>`; return; }
  const form = `<fieldset class="fsec"><legend>Grant a comp</legend><p class="fdesc">A comp covers an organization's events at no price. The organizer never sees a price: they see "Founding partner: free through the date". Type the organization's website domain (like eastvaleca.gov) or the organizer's email. Nothing is granted until you click Grant.</p>
    <div class="fgrid"><div class="ff c3"><label for="pcTarget">Website domain or organizer email</label><input id="pcTarget" maxlength="120" placeholder="eastvaleca.gov" autocomplete="off"></div>
    <div class="ff c3"><label for="pcAllowed">Events per season</label><input id="pcAllowed" type="number" min="1" max="1000" value="10" inputmode="numeric"></div>
    <div class="ff c3"><label for="pcUntil">Valid until</label><input id="pcUntil" type="date"></div>
    <div class="ff c6"><label for="pcNote">Note (only you see it)</label><input id="pcNote" maxlength="300" placeholder="Founding city partner"></div></div>
    <div class="mfoot grantfoot"><button class="btn ice" type="button" id="pcGrant">Grant comp</button><span class="msg" id="pcMsg" role="status"></span></div></fieldset>`;
  const orgs = d.orgs.length ? `<div class="cards">${d.orgs.map((o) => rec({ attrs: `data-okey="${esc(o.key)}"`, title: esc(o.label), tags: [[o.comp ? "Comp" : o.hasPlan ? "Plan" : "None", o.covered ? "ok" : ""]], meta: esc(o.key),
    facts: fact("This season", esc(d.season.label) + " · through " + esc(pdate(d.season.end))) + fact("Events used", `<b>${o.used}</b> of ${o.unlimited ? "unlimited" : o.cap ?? 0}`) + fact("Comp", o.comp ? `${o.comp.unlimited ? "unlimited" : o.comp.allowed} per season through ${esc(pdate(o.comp.until))}${o.comp.note ? " · " + esc(o.comp.note) : ""}` : "")
      + fact("Events", o.events.map((e) => `<span data-evrow="${esc(e.id)}">${esc(e.name || e.id)} (${esc(e.applied_from)} to ${esc(e.applied_until)}) <a href="#" data-act="release" data-ev="${esc(e.id)}" data-ss="${esc(e.season_start)}">free this slot</a></span>`).join("<br>")) })).join("")}</div>` : `<div class="empty">No organization has a plan, a comp or a covered event this season yet.</div>`;
  const comps = d.comps.length ? `<div class="cards">${d.comps.map((c) => rec({ attrs: `data-pcomp="${esc(c.id)}"`, title: esc(c.label), tags: [[c.running ? "Running" : c.revoked ? "Ended by you" : "Expired", c.running ? "ok" : ""]], meta: esc((c.created_at || "").slice(0, 10)),
    facts: fact("Allowed", c.allowed < 0 ? "unlimited events per season" : `${c.allowed} events per season`) + fact("Valid until", esc(pdate(c.valid_until))) + fact("Note", esc(c.note)) + fact("Granted by", esc(c.created_by)), main: c.running ? btn("ghost", "End this comp now", 'data-pact="revoke_comp"') : "" })).join("")}</div>` : `<div class="empty">No comps yet.</div>`;
  const plans = d.plans.length ? `<div class="cards">${d.plans.map((p) => rec({ title: esc(p.label), tags: [[p.status === "active" ? "Active" : "Revoked", p.status === "active" ? "ok" : ""]], meta: esc((p.created_at || "").slice(0, 10)),
    facts: fact("Season", `${esc(pdate(p.season_start))} to ${esc(pdate(p.season_end))}`) + fact("Paid", esc("$" + ((p.amount || 0) / 100).toFixed(2))) + fact("Buyer", esc(p.email || "")) + fact("Order", esc(p.order_status || "")) })).join("")}</div>` : `<div class="empty">No plans bought yet. Plans also show in Orders.</div>`;
  main.innerHTML = `${form}<h2 class="dh">Organizations (${d.orgs.length})</h2>${orgs}<h2 class="dh">Comps</h2>${comps}<h2 class="dh">Plans bought</h2>${plans}`;
  $("#pcGrant").onclick = async () => {
    const m = $("#pcMsg"); m.className = "msg"; m.textContent = "Working…";
    try { await api("/api/admin/partner", { method: "POST", body: JSON.stringify({ action: "grant", target: $("#pcTarget").value, allowed: Number($("#pcAllowed").value), until: $("#pcUntil").value, note: $("#pcNote").value }) }); toast("Comp granted"); renderPartner(main); }
    catch (er) { m.className = "msg err"; m.textContent = er.message; }
  };
  main.querySelectorAll("[data-pact]").forEach((b) => (b.onclick = async () => {
    if (!confirm("End this comp now?")) return;
    try { await api("/api/admin/partner", { method: "POST", body: JSON.stringify({ action: "revoke_comp", id: b.closest("[data-pcomp]").dataset.pcomp }) }); toast("Done"); renderPartner(main); } catch (er) { toast(er.message); }
  }));
  main.querySelectorAll("[data-act=release]").forEach((a) => (a.onclick = async (e) => {
    e.preventDefault();
    if (!confirm("Free this slot? The event stops showing the Event Partner badge. Its Featured pin is left as it is (change it in Events).")) return;
    try { await api("/api/admin/partner", { method: "POST", body: JSON.stringify({ action: "release", event_id: a.dataset.ev, season_start: a.dataset.ss }) }); toast("Slot freed"); renderPartner(main); } catch (er) { toast(er.message); }
  }));
}
