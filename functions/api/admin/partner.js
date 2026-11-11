// GET  /api/admin/partner — Admin > Event Partners: the organizations with a plan, a comp or covered events this season (events used x of cap), the comps and the plans bought.
// POST /api/admin/partner { action: "grant", target, allowed (1-1000 or "unlimited"), until (YYYY-MM-DD), note }   cover an organization key, website domain or email at no price
//                         { action: "edit_comp", id, allowed (1-1000 or "unlimited"), until, note }   change a running comp (events per season, valid-until date, note)
//                         { action: "revoke_comp", id }                                  end a comp now
//                         { action: "release", event_id, season_start }                   free one slot (the event stops showing the badge; its Featured pin is left for Admin > Events)
// Nothing here calls Stripe. The admin middleware has already required the Access login and logs the POST to admin_log.
import { json, err, clean, newId } from "../../_lib/util.js";
import { partnerEntitlement } from "../../_lib/partner.js";
import { seasonOf } from "../../_lib/sponsor.js";
import { orgLabel } from "../../_lib/passes.js";
import { keyFromInput } from "../../_lib/passkey.js";
import { todayPT, isDate } from "../../_lib/contests.js";

export async function onRequestGet({ env }) {
  const today = todayPT(), season = seasonOf(today);
  const [ps, cm, ev] = await Promise.all([
    env.DB.prepare("SELECT p.session_id, p.org_key, p.season_start, p.season_end, p.cap, p.status, p.created_at, o.amount, o.status AS order_status, o.email FROM event_partner_plans p LEFT JOIN feature_orders o ON o.session_id = p.session_id ORDER BY p.created_at DESC LIMIT 300").all(),
    env.DB.prepare("SELECT id, org_key, allowed, valid_until, note, created_by, revoked, created_at FROM event_partner_comps ORDER BY created_at DESC LIMIT 200").all(),
    env.DB.prepare("SELECT p.event_id, p.org_key, p.season_start, p.applied_from, p.applied_until, e.name FROM event_partner_events p LEFT JOIN events e ON e.id = p.event_id WHERE p.season_start = ? AND p.status = 'active' ORDER BY p.created_at").bind(season.start).all(),
  ]);
  const keys = new Set([...ps.results.filter((p) => p.season_start === season.start).map((p) => p.org_key), ...cm.results.filter((c) => !c.revoked && c.valid_until >= today).map((c) => c.org_key), ...ev.results.map((e) => e.org_key)]);
  const orgs = [...keys].map((key) => {
    const events = ev.results.filter((e) => e.org_key === key).map((e) => ({ id: e.event_id, name: e.name, season_start: e.season_start, applied_from: e.applied_from, applied_until: e.applied_until }));
    const ent = partnerEntitlement(season, ps.results.filter((p) => p.org_key === key && p.season_start === season.start && p.status === "active"), cm.results.filter((c) => c.org_key === key && !c.revoked && c.valid_until >= today), events.length);
    return { key, label: orgLabel(key), used: ent.used, cap: ent.cap, unlimited: ent.unlimited, covered: ent.covered, hasPlan: ent.hasPlan, comp: ent.comp, events };
  }).sort((a, b) => b.used - a.used);
  return json({ today, season, orgs, plans: ps.results.map((p) => ({ ...p, label: orgLabel(p.org_key) })), comps: cm.results.map((c) => ({ ...c, label: orgLabel(c.org_key), running: !c.revoked && c.valid_until >= today })) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env, data }) {
  const b = await request.json().catch(() => ({})), who = (data && data.admin && data.admin.email) || "admin";
  if (b.action === "grant") {
    const key = keyFromInput(b.target), until = clean(b.until, 10), unlimited = b.allowed === "unlimited" || b.allowed === -1, n = Math.floor(Number(b.allowed));
    if (!key || key === "d:" || key === "u:") return err(400, "Enter the organization's website domain (like eastvaleca.gov) or the organizer's email address.");
    if (!isDate(until) || until < todayPT()) return err(400, "Pick a valid-until date that has not passed.");
    if (!unlimited && !(n >= 1 && n <= 1000)) return err(400, "Events per season must be a number from 1 to 1000, or unlimited.");
    const id = newId();
    await env.DB.prepare("INSERT INTO event_partner_comps (id, org_key, allowed, valid_until, note, created_by) VALUES (?,?,?,?,?,?)").bind(id, key, unlimited ? -1 : n, until, clean(b.note, 300), who).run();
    return json({ ok: true, id, key });
  }
  if (b.action === "edit_comp") {
    const id = clean(b.id, 60), c = await env.DB.prepare("SELECT id, revoked, valid_until FROM event_partner_comps WHERE id = ?").bind(id).first();
    if (!c) return err(404, "That comp does not exist.");
    if (c.revoked || c.valid_until < todayPT()) return err(400, "Only a running comp can be edited. Grant a new one instead.");
    const until = clean(b.until, 10), unlimited = b.allowed === "unlimited" || b.allowed === -1, n = Math.floor(Number(b.allowed));
    if (!isDate(until) || until < todayPT()) return err(400, "Pick a valid-until date that has not passed.");
    if (!unlimited && !(n >= 1 && n <= 1000)) return err(400, "Events per season must be a number from 1 to 1000, or unlimited.");
    await env.DB.prepare("UPDATE event_partner_comps SET allowed = ?, valid_until = ?, note = ? WHERE id = ?").bind(unlimited ? -1 : n, until, clean(b.note, 300), id).run();
    return json({ ok: true });
  }
  if (b.action === "revoke_comp") { await env.DB.prepare("UPDATE event_partner_comps SET revoked = 1 WHERE id = ?").bind(clean(b.id, 60)).run(); return json({ ok: true }); }
  if (b.action === "release") {
    const id = clean(b.event_id, 60), ss = clean(b.season_start, 10);
    const r = await env.DB.prepare("UPDATE event_partner_events SET status = 'released' WHERE event_id = ? AND season_start = ? AND status = 'active'").bind(id, ss).run();
    if (!(r.meta && r.meta.changes)) return err(404, "That event is not using a slot.");
    await env.DB.prepare("UPDATE events SET partner_until = NULL, partner_verified = 0 WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
