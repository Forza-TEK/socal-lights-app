// POST /api/stripe-webhook — Stripe tells us about Featured payments; we switch the placement on, and off again on refund/dispute.
// Set up in Stripe: Developers > Webhooks > endpoint https://socallights.app/api/stripe-webhook, events checkout.session.completed,
// checkout.session.async_payment_succeeded, checkout.session.expired, charge.refunded, charge.dispute.created, charge.dispute.closed,
// then store its signing secret as STRIPE_WEBHOOK_SECRET.
//
// Retry safety: nothing is "done" until it has really been applied. The order row records `applied`; the Stripe event id is written to
// stripe_events only after the work succeeded; failures that a retry can fix return 500 so Stripe redelivers.
import { json, err } from "../_lib/util.js";
import { PLANS, applyPlan, verifyStripeSignature, revokePlan } from "../_lib/featured.js";

const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired", "charge.refunded", "charge.dispute.created", "charge.dispute.closed"]);

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) return err(400, "Bad signature.");
  let evt; try { evt = JSON.parse(raw); } catch { return err(400, "Bad payload."); }
  if (!evt || !evt.id || !HANDLED.has(evt.type)) return json({ ok: true, ignored: evt && evt.type });

  if (await env.DB.prepare("SELECT 1 FROM stripe_events WHERE id = ?").bind(evt.id).first()) return json({ ok: true, duplicate: true });

  let res;
  try { res = await handle(evt, env); } catch (e) { console.error("stripe-webhook", evt.type, evt.id, e && e.message); return err(500, "Could not process; please retry."); }
  if (res instanceof Response) return res; // a retryable failure: leave the event unrecorded so Stripe redelivers
  await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id,type) VALUES (?,?)").bind(evt.id, evt.type).run();
  return json({ ok: true, ...res });
}

async function handle(evt, env) {
  const o = (evt.data && evt.data.object) || {};
  switch (evt.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": return paid(o, env);
    case "checkout.session.expired": return { expired: o.id || null }; // abandoned checkout: recorded in stripe_events only
    case "charge.refunded": {
      const order = await orderByPi(env, o.payment_intent);
      if (!order) return { ignored: "no matching order" };
      await env.DB.prepare("UPDATE feature_orders SET charge_id = ? WHERE session_id = ?").bind(o.id || null, order.session_id).run();
      if (o.refunded !== true) { // partial refund: flag it, the admin decides
        await env.DB.prepare("UPDATE feature_orders SET status = 'held' WHERE session_id = ? AND status = 'paid'").bind(order.session_id).run();
        return { held: "partial refund" };
      }
      return revoked(await revokePlan(env.DB, order, "refunded"));
    }
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      let pi = o.payment_intent;
      if (!pi && o.charge) {
        const known = await env.DB.prepare("SELECT payment_intent FROM feature_orders WHERE charge_id = ?").bind(o.charge).first();
        pi = known && known.payment_intent;
        if (!pi && env.STRIPE_SECRET_KEY) { // the dispute names only its charge: ask Stripe which payment it belongs to
          const r = await fetch("https://api.stripe.com/v1/charges/" + encodeURIComponent(o.charge), { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
          if (!r.ok) return err(502, "Could not look up the charge.");
          pi = (await r.json().catch(() => ({}))).payment_intent;
        }
      }
      const order = await orderByPi(env, pi);
      if (!order) return { ignored: "no matching order" };
      if (o.charge) await env.DB.prepare("UPDATE feature_orders SET charge_id = ? WHERE session_id = ?").bind(o.charge, order.session_id).run();
      if (evt.type === "charge.dispute.closed") {
        if (o.status === "won") { await env.DB.prepare("UPDATE feature_orders SET status = 'dispute_won' WHERE session_id = ?").bind(order.session_id).run(); return { dispute: "won", manual: "re-grant by hand if wanted" }; }
        if (o.status !== "lost") return { ignored: "dispute closed: " + o.status };
      }
      return revoked(await revokePlan(env.DB, order, "disputed"));
    }
  }
}

const revoked = (manual) => (manual ? { revoked: false, manual: "placement differs" } : { revoked: true });
const orderByPi = (env, pi) => (pi ? env.DB.prepare("SELECT * FROM feature_orders WHERE payment_intent = ?").bind(pi).first() : null);

async function paid(s, env) {
  if (s.payment_status !== "paid") return { waiting: s.payment_status }; // e.g. a delayed method; Stripe sends async_payment_succeeded later
  const eventId = s.metadata && s.metadata.event_id, plan = s.metadata && s.metadata.plan;
  if (!eventId || !PLANS[plan]) return { ignored: "no feature metadata" };

  // One order per Checkout session. The row existing is NOT proof the placement was applied; `applied` is.
  await env.DB.prepare("INSERT OR IGNORE INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status) VALUES (?,?,?,?,?,?,?,'paid')")
    .bind(s.id, eventId, plan, s.amount_total ?? null, (s.customer_details && s.customer_details.email) || "", (typeof s.payment_intent === "string" && s.payment_intent) || null, s.currency || null).run();
  const order = await env.DB.prepare("SELECT * FROM feature_orders WHERE session_id = ?").bind(s.id).first();
  if (order.applied) return { duplicate: true };
  if (order.status !== "paid") return { skipped: order.status }; // already refunded/disputed before we got to apply it
  if (!order.payment_intent && typeof s.payment_intent === "string") await env.DB.prepare("UPDATE feature_orders SET payment_intent = ? WHERE session_id = ?").bind(s.payment_intent, s.id).run();

  let targetId = order.event_id;
  if (targetId.startsWith("sub:")) {
    // Paid while the event was still waiting for review: apply now if it has since published, otherwise the admin's approval applies it.
    const sub = await env.DB.prepare("SELECT event_id FROM event_submissions WHERE id = ?").bind(targetId.slice(4)).first();
    if (!sub) { console.error("stripe-webhook: submission not found", targetId); return err(500, "Submission not found; will retry."); }
    if (!sub.event_id) return { held: "waiting for the event to be approved" };
    targetId = sub.event_id;
    await env.DB.prepare("UPDATE feature_orders SET event_id = ? WHERE session_id = ?").bind(targetId, s.id).run();
  }
  const ev = await env.DB.prepare("SELECT id, end_date, featured, featured_until FROM events WHERE id = ?").bind(targetId).first();
  if (!ev) { console.error("stripe-webhook: event not found", targetId); return err(500, "Event not found; will retry."); }
  const today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10);
  const nf = applyPlan(ev, plan, today);
  // One transaction; both statements only act while the order is still unapplied, so a concurrent retry cannot extend the placement twice.
  await env.DB.batch([
    env.DB.prepare("UPDATE events SET featured=?, featured_until=?, updated_at=datetime('now') WHERE id=? AND EXISTS (SELECT 1 FROM feature_orders WHERE session_id=? AND applied=0)").bind(nf.featured, nf.featured_until, targetId, s.id),
    env.DB.prepare("UPDATE feature_orders SET applied=1, applied_featured=?, applied_until=? WHERE session_id=? AND applied=0").bind(nf.featured, nf.featured_until, s.id),
  ]);
  return { featured: nf };
}
