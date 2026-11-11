// Emails to the buyer about what happened to a payment: "your payment was not applied, we are refunding it" and "your refund was issued", plus the lines every receipt shares
// (payment date, order reference, refund statement). These are SERVICE mail: they go even to someone who unsubscribed from marketing or the monthly update, because they are about
// money the person paid. They never go to a hard-bounced or complained address or a deleted account (templates carry guard: "deliverable"). Best effort: a failed email never blocks the webhook.
import { sendTemplate } from "./mailtpl.js";
import { canMailService } from "./servicemail.js";
import { money, niceStamp, orderRef } from "./money.js";
import { REFUND, refundTermsUrl } from "../../public/refund-terms.js";
import { CONTEST_PASSES, LEGACY_PASSES } from "./passes.js";
import { RESTORE_MARK } from "./orders.js";

// The lines every receipt carries: when it was paid, the order reference, and the one refund statement for the product (kind: event | home | pass | partner | installer).
export const receiptExtras = (order, kind) => ({ paid_on: niceStamp(order && order.created_at), ref: orderRef(order && order.session_id), refund: REFUND[kind] || "", terms: refundTermsUrl(kind) });

// What the order was for, in a few words for "We received $X for ...".
export async function describeOrder(env, o) {
  const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first().catch(() => null);
  if (o.target === "contest_pass") { const p = CONTEST_PASSES[o.plan] || LEGACY_PASSES[o.plan]; return "a contest pass" + (p ? ` (${p.label})` : ""); }
  if (o.target === "event_partner") return "an Event Partner plan";
  if (o.target === "installer") { const r = await one("SELECT name FROM installers WHERE id = ?", o.event_id); return "a Sponsor placement" + (r && r.name ? ` for ${r.name}` : ""); }
  if (o.target === "home") { const r = await one("SELECT title FROM posts WHERE id = ?", o.event_id); return "a Featured placement" + (r && r.title ? ` for ${r.title}` : " for your home"); }
  const id = String(o.event_id || "");
  const r = id.startsWith("sub:") ? await one("SELECT name FROM event_submissions WHERE id = ?", id.slice(4)) : await one("SELECT name FROM events WHERE id = ?", id);
  return "a Featured placement" + (r && r.name ? ` for ${r.name}` : " for your event");
}

async function recipient(env, o) {
  if (o.email) return o.email;
  if (!o.user_id) return "";
  const u = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(o.user_id).first().catch(() => null);
  return (u && u.email) || "";
}

// Sends once per order and kind: the column is claimed first (so two webhooks or two sweeps cannot both send), and released again when the mail service failed so the next sweep retries.
async function once(env, o, column, id, extra) {
  const claim = await env.DB.prepare(`UPDATE feature_orders SET ${column} = datetime('now') WHERE session_id = ? AND ${column} IS NULL`).bind(o.session_id).run();
  if (!(claim.meta && claim.meta.changes)) return false;
  try {
    const to = await recipient(env, o);
    if (!to || !(await canMailService(env, to))) { await env.DB.prepare(`UPDATE feature_orders SET ${column} = 'skipped' WHERE session_id = ?`).bind(o.session_id).run(); return false; }
    const ok = await sendTemplate(env, id, to, { what: await describeOrder(env, o), amount: money(o.amount), paid_on: niceStamp(o.created_at), ref: orderRef(o.session_id), ...extra });
    if (!ok) await env.DB.prepare(`UPDATE feature_orders SET ${column} = NULL WHERE session_id = ?`).bind(o.session_id).run();
    return !!ok;
  } catch (e) { console.error("order notice", id, e && e.message); await env.DB.prepare(`UPDATE feature_orders SET ${column} = NULL WHERE session_id = ?`).bind(o.session_id).run().catch(() => {}); return false; }
}

// "Your payment was not applied; we are refunding it."
export const notifyNotApplied = (env, order) => once(env, order, "not_applied_notice_at", "payment_not_applied", {});
// "Your refund was issued." off: a placement that was on has been switched off.
export const notifyRefunded = (env, order, { off = false } = {}) => once(env, order, "refund_notice_at", "refund_issued", { off: off ? "yes" : "" });

// Orders that were flagged "refund due" after the payment (an event declined or removed, a pass that could not be applied...) have no webhook moment of their own: the scheduled digest calls this
// to tell the buyers. An order whose removal can be undone (note ends with RESTORE_MARK: the event or profile may come back) is left alone until it is really refund due.
export async function sweepNotApplied(env, limit = 20) {
  let rows = [];
  try { rows = (await env.DB.prepare("SELECT * FROM feature_orders WHERE status = 'refund_due' AND not_applied_notice_at IS NULL AND created_at > datetime('now', '-90 days') AND COALESCE(note, '') NOT LIKE ? ORDER BY created_at LIMIT ?").bind("%" + RESTORE_MARK.trim(), limit).all()).results; } catch { return 0; }
  let n = 0;
  for (const o of rows) if (await notifyNotApplied(env, o)) n++;
  return n;
}
