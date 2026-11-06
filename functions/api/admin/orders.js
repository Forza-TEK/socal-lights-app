// GET /api/admin/orders — every Featured order, the ones that need the owner first. Actions are in orders/[id].js.
// Read-only: nothing here calls Stripe. Refunds are made in the Stripe dashboard, then marked here.
import { json } from "../../_lib/util.js";
import { ptToday } from "../../_lib/featured.js";
import { orderFlags, stripeUrl, ORDER_FROM } from "../../_lib/orders.js";

export async function onRequestGet({ env }) {
  const today = ptToday();
  const { results } = await env.DB.prepare(
    `SELECT o.session_id, o.event_id, o.plan, o.amount, o.currency, o.email, o.status, o.applied, o.applied_featured, o.applied_until, o.payment_intent,
            o.charge_id, o.refunded_at, o.created_at, o.note, o.user_id, o.target, COALESCE(e.name, s.name, hp.title) AS name, COALESCE(e.city, s.city, hp.city) AS city, e.notice,
            e.end_date, COALESCE(e.featured, hp.featured) AS ev_featured, COALESCE(e.featured_until, hp.featured_until) AS ev_until, hc.name AS contest_name, hc.slug AS contest_slug
     FROM ${ORDER_FROM} LEFT JOIN event_submissions s ON o.event_id = 'sub:' || s.id
     LEFT JOIN posts hp ON o.target = 'home' AND hp.id = o.event_id LEFT JOIN contests hc ON hc.id = hp.contest_id
     ORDER BY o.created_at DESC LIMIT 500`).all();
  const rows = results.map((o) => ({ ...o, flags: orderFlags(o, today), stripe_url: stripeUrl(o.payment_intent) }));
  rows.sort((a, b) => (b.flags.length > 0) - (a.flags.length > 0)); // stable: newest first inside each group
  return json(rows, { headers: { "cache-control": "no-store" } });
}
