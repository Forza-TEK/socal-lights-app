// Featured orders that need a human. One definition, used by Admin > Orders, the tab badge (admin/counts.js) and the daily email (admin-digest.js).
//   refund_due : paid, but the owner has to refund it in Stripe (the event was declined, unpublished or deleted)
//   disputed / held : a chargeback is open or lost; a partial refund is waiting for a decision
//   unapplied  : paid and still not on the event an hour later (a pending submission may wait a day for its approval)
//   note       : the system left an "[auto]" note (placement differs, amount mismatch, dispute won, partial refund)
//   cancelled  : a paid placement is still running on a cancelled or postponed event
import { json } from "./util.js";
import { ptToday } from "./time.js";
import { AUTO, restorePlacement } from "./featured.js";

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
  return (await db.prepare("SELECT session_id, plan, amount, applied_until, email FROM feature_orders WHERE event_id = ?1 AND status = 'paid' AND applied = 1 AND ((applied_until IS NULL AND applied_top_until IS NULL) OR applied_until >= ?2 OR applied_top_until >= ?2) ORDER BY created_at").bind(eventId, today).all()).results;
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
export async function markHomeRefundDue(db, postId, why, today = ptToday()) { // only placements still running or not yet applied
  const r = await db.prepare("UPDATE feature_orders SET status='refund_due', note=? WHERE target='home' AND event_id=? AND status IN ('paid','held') AND (applied = 0 OR applied_until IS NULL OR applied_until >= ?)").bind(("[auto] " + why).slice(0, 500), postId, today).run();
  return (r.meta && r.meta.changes) || 0;
}

// ---- One helper for every path that takes a paid placement away (delete, unpublish, hide, account deletion) ----
// Rule: a path that removes an event row, a home row or hides an installer profile MUST call flagRefundDue (or unlistFromMap / deleteContest, which do).
// It marks every paid (or held), not-yet-refunded order that is unapplied or still running as refund_due with an [auto] note, which puts it in Admin > Orders,
// the tab badge and the daily digest email (NEEDS_ATTENTION above). tests/refund-flags.test.mjs scans the code and fails when a delete path does not call it.
// restorable: the removal can be undone (unpublish, decline, hide). The note then ends with RESTORE_MARK, and restoreRefundDue turns those orders back to paid
// when the event or profile comes back (an order the owner already refunded stays refunded). Time on the clock keeps running while it is off, as with Admin's unpublish.
export const RESTORE_MARK = " Publishing it again puts the placement back.";
// Still running or not applied yet. An installer's top-of-the-list-only order has no applied_until (it wrote only top_until), so a placement counts as running while ANY date it wrote is today or later; no date at all = open-ended.
const OPEN = "status IN ('paid','held') AND (applied = 0 OR (applied_until IS NULL AND applied_top_until IS NULL) OR applied_until >= ? OR applied_top_until >= ?)";
const KINDS = [["event", "events"], ["home", "homes"], ["installer", "installers"]];
const slices = (ids) => { const l = [...new Set((ids || []).filter(Boolean))], o = []; for (let i = 0; i < l.length; i += 80) o.push(l.slice(i, i + 80)); return o; };
// t: { events: [event ids or "sub:<id>"], homes: [post ids], installers: [installer ids] }. Statements only, so a caller can put them in its own batch (before the delete).
export function refundDueStatements(db, t, why, { restorable = false, today = ptToday() } = {}) {
  const note = (AUTO + why).slice(0, restorable ? 500 - RESTORE_MARK.length : 500) + (restorable ? RESTORE_MARK : "");
  const out = [];
  for (const [kind, key] of KINDS) for (const part of slices(t[key]))
    out.push(db.prepare(`UPDATE feature_orders SET status='refund_due', note=? WHERE target=? AND event_id IN (${part.map(() => "?").join(",")}) AND ${OPEN}`).bind(note, kind, ...part, today, today));
  return out;
}
const changed = (rs) => rs.reduce((n, r) => n + ((r.meta && r.meta.changes) || 0), 0);
// Runs the statements; returns how many orders were flagged.
export async function flagRefundDue(db, t, why, opts) {
  const stmts = refundDueStatements(db, t, why, opts);
  return stmts.length ? changed(await db.batch(stmts)) : 0;
}
// Undo of a restorable flag: orders flagged by an unpublish/hide go back to paid. Returns how many.
export async function restoreRefundDue(db, t) {
  const stmts = [];
  for (const [kind, key] of KINDS) for (const part of slices(t[key]))
    stmts.push(db.prepare(`UPDATE feature_orders SET status='paid', note=NULL WHERE status='refund_due' AND target=? AND note LIKE '[auto]%' AND note LIKE '%' || ? AND event_id IN (${part.map(() => "?").join(",")})`).bind(kind, RESTORE_MARK, ...part));
  return stmts.length ? changed(await db.batch(stmts)) : 0;
}

// Taking an event row off the map (a contest unpublished or declined): flag its paid orders (restorable), then delete the row. putBackOnMap is the undo after the event is listed again.
// `by` finishes the sentence "The contest was ..." in the order note. (Contest code may not mention the Featured feature; see tests/featured-homes.test.mjs, so the wording lives here.)
export async function takeOffMap(db, eventId, by) {
  await flagRefundDue(db, { events: [eventId] }, `The contest was ${by} while a paid placement was running. Refund it in the Stripe dashboard, then mark it refunded here.`, { restorable: true });
  return db.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
}
export async function putBackOnMap(db, eventId) {
  await restoreRefundDue(db, { events: [eventId] });
  return restorePlacement(db, eventId);
}
export const contestDeletedStatements = (db, eventId, homeIds = []) => refundDueStatements(db, { events: [eventId], homes: homeIds }, "The contest was deleted while a paid placement was running. Refund it in the Stripe dashboard, then mark it refunded here.");
