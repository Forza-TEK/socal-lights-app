// POST /api/stripe-webhook — Stripe tells us a Featured payment completed; we switch the placement on.
// Set up in Stripe: Developers > Webhooks > endpoint https://socallights.app/api/stripe-webhook, event checkout.session.completed
// (and checkout.session.async_payment_succeeded for Cash App Pay), then store its signing secret as STRIPE_WEBHOOK_SECRET.
import { json, err } from "../_lib/util.js";
import { PLANS, applyPlan, verifyStripeSignature } from "../_lib/featured.js";

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) return err(400, "Bad signature.");
  let evt; try { evt = JSON.parse(raw); } catch { return err(400, "Bad payload."); }
  if (evt.type !== "checkout.session.completed" && evt.type !== "checkout.session.async_payment_succeeded") return json({ ok: true, ignored: evt.type });

  const s = evt.data && evt.data.object || {};
  if (s.payment_status !== "paid") return json({ ok: true, waiting: s.payment_status }); // e.g. a delayed method; Stripe sends async_payment_succeeded later
  const eventId = s.metadata && s.metadata.event_id, plan = s.metadata && s.metadata.plan;
  if (!eventId || !PLANS[plan]) return json({ ok: true, ignored: "no feature metadata" });

  // One order per Checkout session: a repeated delivery does nothing the second time.
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO feature_orders (session_id,event_id,plan,amount,email) VALUES (?,?,?,?,?)")
    .bind(s.id, eventId, plan, s.amount_total ?? null, (s.customer_details && s.customer_details.email) || "").run();
  if (!ins.meta || !ins.meta.changes) return json({ ok: true, duplicate: true });

  const ev = await env.DB.prepare("SELECT id, end_date, featured, featured_until FROM events WHERE id = ?").bind(eventId).first();
  if (!ev) return json({ ok: true, ignored: "event not found" });
  const today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10);
  const nf = applyPlan(ev, plan, today);
  await env.DB.prepare("UPDATE events SET featured=?, featured_until=?, updated_at=datetime('now') WHERE id=?").bind(nf.featured, nf.featured_until, eventId).run();
  return json({ ok: true, featured: nf });
}
