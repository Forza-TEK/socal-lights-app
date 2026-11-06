// Featured orders that need a human. One definition, used by Admin > Orders, the tab badge (admin/counts.js) and the daily email (admin-digest.js).
//   refund_due : paid, but the owner has to refund it in Stripe (the event was declined, unpublished or deleted)
//   disputed / held : a chargeback is open or lost; a partial refund is waiting for a decision
//   unapplied  : paid and still not on the event an hour later (a pending submission may wait a day for its approval)
//   note       : the system left an "[auto]" note (placement differs, amount mismatch, dispute won, partial refund)
//   cancelled  : a paid placement is still running on a cancelled or postponed event
import { json } from "./util.js";

export const NEEDS_ATTENTION = `(o.status IN ('refund_due','disputed','held')
  OR (o.status = 'paid' AND o.applied = 0 AND o.created_at < datetime('now','-1 hour') AND (o.event_id NOT LIKE 'sub:%' OR o.created_at < datetime('now','-1 day')))
  OR o.note LIKE '[auto]%'
  OR (o.status = 'paid' AND o.applied = 1 AND e.notice IN ('cancelled','postponed') AND (o.applied_until IS NULL OR o.applied_until >= ?1)))`;
export const ORDER_FROM = "feature_orders o LEFT JOIN events e ON e.id = o.event_id";
export const stripeUrl = (pi) => (pi ? "https://dashboard.stripe.com/payments/" + encodeURIComponent(pi) : "");

const toMs = (t) => Date.parse(String(t || "").replace(" ", "T") + "Z");
// The reasons an order needs attention, in the words Admin shows. Mirrors NEEDS_ATTENTION.
export function orderFlags(o, today, now = Date.now()) {
  const f = [], age = now - toMs(o.created_at), note = String(o.note || "");
  if (o.status === "refund_due") f.push("refund_due");
  if (o.status === "disputed") f.push("disputed");
  if (o.status === "held") f.push("held");
  if (o.status === "paid" && !o.applied && age > 3600_000 && (!String(o.event_id).startsWith("sub:") || age > 86400_000)) f.push("unapplied");
  if (note.startsWith("[auto]")) f.push(/placement differs/.test(note) ? "differs" : /amount mismatch/.test(note) ? "mismatch" : "note");
  if (o.status === "paid" && o.applied && (o.notice === "cancelled" || o.notice === "postponed") && (!o.applied_until || o.applied_until >= today)) f.push("cancelled");
  return f;
}

// Paid, applied orders whose placement is still running on this event (what an unpublish or delete would take away).
export async function livePaidOrders(db, eventId, today) {
  return (await db.prepare("SELECT session_id, plan, amount, applied_until, email FROM feature_orders WHERE event_id = ? AND status = 'paid' AND applied = 1 AND (applied_until IS NULL OR applied_until >= ?) ORDER BY created_at").bind(eventId, today).all()).results;
}
// Writes the same note on every live paid order of an event.
export const noteOrders = (db, eventId, note) => db.prepare("UPDATE feature_orders SET note = ? WHERE event_id = ? AND status = 'paid' AND applied = 1").bind(String(note).slice(0, 500), eventId).run();

// Turns every open order of a submission into "refund due". Used when a submission with a paid order is declined.
export async function markRefundDue(db, subId, eventId, why) {
  const ids = ["sub:" + subId].concat(eventId ? [eventId] : []);
  const r = await db.prepare(`UPDATE feature_orders SET status='refund_due', note=? WHERE status IN ('paid','held') AND event_id IN (${ids.map(() => "?").join(",")})`)
    .bind(("[auto] " + why).slice(0, 500), ...ids).run();
  return (r.meta && r.meta.changes) || 0;
}

// 409: the event carries a paid Featured placement. The page shows this and asks again with confirm:true.
export function paidPlacementConflict(orders, verb) {
  const list = orders.map((o) => o.plan + ", " + ((o.amount || 0) / 100).toFixed(2) + " USD, until " + (o.applied_until || "the end")).join("; ");
  return json({ error: `This event has a paid Featured placement (${list}). To ${verb} it anyway, confirm. The paid orders are kept and listed in Admin > Orders.`, code: "paid_placement", orders }, { status: 409 });
}

// A home with a paid Featured placement is declined, unpublished or deleted: its paid orders become "refund due" for the owner to refund in Stripe.
export async function markHomeRefundDue(db, postId, why, today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10)) { // only placements still running or not yet applied
  const r = await db.prepare("UPDATE feature_orders SET status='refund_due', note=? WHERE target='home' AND event_id=? AND status IN ('paid','held') AND (applied = 0 OR applied_until IS NULL OR applied_until >= ?)").bind(("[auto] " + why).slice(0, 500), postId, today).run();
  return (r.meta && r.meta.changes) || 0;
}
