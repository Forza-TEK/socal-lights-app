// GET  /api/admin/passes — Admin > Contests > Contest passes: every organization that has a contest live (used / cap in its current 12-month window), the passes bought, the comps and the
//                          "more than 20 contests" leads. Four reads in all (free plan: few outgoing calls).
// POST /api/admin/passes { action: "grant", target, allowed (a number or "unlimited"), until (YYYY-MM-DD), note, badge (true = Founder city badge), badge_until (optional, default valid-until) }   grant a comp to an organization key, a website domain or an email address
//                        { action: "revoke_comp", id }                                  end a comp now
//                        { action: "merge", from, to }                                  count everything of one organization key under another (past contests and future ones)
//                        { action: "set_key", contest_id, key }                         put one contest under an organization key by hand
//                        { action: "revoke_pass", session_id }                          take a pass off after the extra contests were used and Admin decided (the order is not refunded here)
// Nothing here calls Stripe or writes any production data by itself. The admin middleware has already required the Access login and logs the POST to admin_log.
import { json, err, clean, newId } from "../../_lib/util.js";
import { windowFromDates, entitlementOf, orgLabel, FREE_CONTESTS } from "../../_lib/passes.js";
import { keyFromInput } from "../../_lib/passkey.js";
import { todayPT, isDate } from "../../_lib/contests.js";

export async function onRequestGet({ env }) {
  const today = todayPT();
  const [cs, ps, cm, ld] = await Promise.all([
    env.DB.prepare("SELECT id, slug, name, org_key, live_at, status FROM contests WHERE org_key != '' AND live_at != '' ORDER BY live_at").all(),
    env.DB.prepare("SELECT p.session_id, p.org_key, p.cap, p.window_start, p.window_end, p.cents, p.status, p.created_at, o.amount, o.status AS order_status, o.email FROM contest_passes p LEFT JOIN feature_orders o ON o.session_id = p.session_id ORDER BY p.created_at DESC LIMIT 300").all(),
    env.DB.prepare("SELECT id, org_key, allowed, valid_until, note, created_by, revoked, badge, badge_until, created_at FROM contest_comps ORDER BY created_at DESC LIMIT 200").all(),
    env.DB.prepare("SELECT id, email, org_key, note, created_at FROM contest_pass_leads ORDER BY created_at DESC LIMIT 50").all(),
  ]);
  const byKey = new Map();
  for (const c of cs.results) (byKey.get(c.org_key) || byKey.set(c.org_key, []).get(c.org_key)).push(c);
  for (const k of new Set([...ps.results.map((p) => p.org_key), ...cm.results.map((c) => c.org_key)])) if (!byKey.has(k)) byKey.set(k, []);
  const orgs = [...byKey].map(([key, list]) => {
    const w = windowFromDates(list.map((c) => c.live_at), today);
    const ent = entitlementOf(w, ps.results.filter((p) => p.org_key === key && p.status === "active" && w.active && p.window_start === w.start), cm.results.filter((c) => c.org_key === key && !c.revoked && c.valid_until >= today));
    return { key, label: orgLabel(key), used: ent.used, cap: ent.cap, unlimited: ent.unlimited, windowStart: ent.windowStart, windowEnd: ent.windowEnd, over: !ent.unlimited && ent.used > ent.cap, comp: ent.comp, contests: list.filter((c) => !w.active || (c.live_at >= w.start && c.live_at <= w.end)).map((c) => ({ id: c.id, slug: c.slug, name: c.name, live_at: c.live_at, status: c.status })) };
  }).sort((a, b) => (b.over - a.over) || b.used - a.used);
  return json({ today, free: FREE_CONTESTS, orgs, passes: ps.results, comps: cm.results.map((c) => ({ ...c, badge: !!c.badge, badge_running: !!c.badge && !c.revoked && (c.badge_until || c.valid_until) >= today, label: orgLabel(c.org_key), running: !c.revoked && c.valid_until >= today })), leads: ld.results.map((l) => ({ ...l, label: orgLabel(l.org_key) })) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env, data }) {
  const b = await request.json().catch(() => ({})), who = (data && data.admin && data.admin.email) || "admin";
  if (b.action === "grant") {
    const key = keyFromInput(b.target), until = clean(b.until, 10), unlimited = b.allowed === "unlimited" || b.allowed === -1, n = Math.floor(Number(b.allowed));
    if (!key || key === "d:" || key === "u:") return err(400, "Enter the organization's website domain (like covinaca.gov) or the organizer's email address.");
    if (!isDate(until) || until < todayPT()) return err(400, "Pick a valid-until date that has not passed.");
    if (!unlimited && !(n >= 1 && n <= 1000)) return err(400, "Allowed contests must be a number from 1 to 1000, or unlimited.");
    const badge = b.badge === true || b.badge === 1, bu = clean(b.badge_until, 10), badgeUntil = isDate(bu) && bu >= until ? bu : until;
    const id = newId();
    await env.DB.prepare("INSERT INTO contest_comps (id, org_key, allowed, valid_until, note, created_by, badge, badge_until) VALUES (?,?,?,?,?,?,?,?)").bind(id, key, unlimited ? -1 : n, until, clean(b.note, 300), who, badge ? 1 : 0, badge ? badgeUntil : "").run();
    return json({ ok: true, id, key });
  }
  if (b.action === "revoke_comp") { await env.DB.prepare("UPDATE contest_comps SET revoked = 1 WHERE id = ?").bind(clean(b.id, 40)).run(); return json({ ok: true }); }
  if (b.action === "merge") {
    const from = keyFromInput(b.from), to = keyFromInput(b.to);
    if (!from || !to || from === to) return err(400, "Enter two different organization keys (a domain like covinaca.gov or an email address).");
    await env.DB.batch([
      env.DB.prepare("INSERT INTO contest_org_alias (from_key, to_key) VALUES (?, ?) ON CONFLICT(from_key) DO UPDATE SET to_key = excluded.to_key").bind(from, to),
      env.DB.prepare("UPDATE contests SET org_key = ? WHERE org_key = ?").bind(to, from),
      env.DB.prepare("UPDATE contest_passes SET org_key = ? WHERE org_key = ?").bind(to, from),
      env.DB.prepare("UPDATE contest_comps SET org_key = ? WHERE org_key = ?").bind(to, from),
    ]);
    return json({ ok: true, from, to });
  }
  if (b.action === "set_key") {
    const key = keyFromInput(b.key); if (!key) return err(400, "Enter a domain like covinaca.gov or an email address.");
    const r = await env.DB.prepare("UPDATE contests SET org_key = ? WHERE id = ?").bind(key, clean(b.contest_id, 40)).run();
    return r.meta && r.meta.changes ? json({ ok: true, key }) : err(404, "That contest no longer exists.");
  }
  if (b.action === "revoke_pass") {
    const r = await env.DB.prepare("UPDATE contest_passes SET status = 'revoked' WHERE session_id = ? AND status = 'active'").bind(clean(b.session_id, 80)).run();
    return r.meta && r.meta.changes ? json({ ok: true }) : err(404, "That pass is not active.");
  }
  return err(400, "Unknown action.");
}
