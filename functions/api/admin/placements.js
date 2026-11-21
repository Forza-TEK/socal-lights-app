// GET /api/admin/placements -> { today, events: { <event id>: { level, until, banner, orders: [{ plan, cents, status, at }] } } }
// What each event has bought, for the Events list (Paid column and the Paid tab): the Featured pin (events.featured >= 1), top of the list (featured 2), the banner (events.banner_until),
// each with its last day, plus every order recorded for the event. Behind requireAdmin like all of /api/admin.
import { json } from "../../_lib/util.js";
import { ptToday } from "../../_lib/featured.js";

export async function onRequestGet({ env }) {
  const today = ptToday(), events = {};
  const get = (id) => (events[id] ||= { level: 0, until: "", banner: "", orders: [] });
  const live = (await env.DB.prepare("SELECT id, featured, featured_until, banner_until FROM events WHERE featured > 0 OR (banner_until IS NOT NULL AND banner_until != '')").all()).results;
  for (const r of live) { const x = get(r.id); x.level = r.featured >= 2 ? 2 : r.featured > 0 ? 1 : 0; x.until = r.featured_until || ""; x.banner = r.banner_until || ""; }
  const orders = (await env.DB.prepare("SELECT event_id, plan, amount, status, created_at FROM feature_orders WHERE target = 'event' ORDER BY created_at DESC").all().catch(() => ({ results: [] }))).results;
  for (const o of orders) get(o.event_id).orders.push({ plan: o.plan, cents: o.amount, status: o.status || "paid", at: String(o.created_at || "").slice(0, 10) });
  return json({ today, events }, { headers: { "cache-control": "no-store" } });
}
