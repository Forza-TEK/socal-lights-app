// POST /api/admin/orders/:session_id  { action: "mark_refunded" | "refund_stripe" | "reapply" | "note", note? }
//   refund_stripe : refund the whole payment in Stripe (POST /v1/refunds, idempotency key "refund-<session id>"), then record it exactly like mark_refunded. If Stripe refuses or cannot be reached, nothing changes here and Stripe's message is returned.
//   mark_refunded : the owner already refunded this payment in the Stripe dashboard; record it here and take the placement off. Never calls Stripe.
//   reapply       : apply a paid order that is not on its event yet, if the event exists now.
//   note          : write the owner's note on the order. This also clears an "[auto]" flag (it counts as "seen").
// The admin middleware has already required the Access login and logs the POST to admin_log (area "orders").
import { json, err, clean } from "../../../_lib/util.js";
import { applyOrder, revokePlan, setOrderNote } from "../../../_lib/featured.js";
import { notifyRefunded } from "../../../_lib/ordermail.js";
import { stripeCall } from "../../../_lib/stripe.js";

export async function onRequestPost({ request, env, params, data }) {
  const b = await request.json().catch(() => ({}));
  const o = await env.DB.prepare("SELECT * FROM feature_orders WHERE session_id = ?").bind(params.id).first();
  if (!o) return err(404, "That order no longer exists.");
  const who = (data && data.admin && data.admin.email) || "admin";
  if (b.action === "note") { await setOrderNote(env.DB, o.session_id, clean(b.note, 500)); return json({ ok: true }); }
  // The one place a refund is recorded, whether the owner did it in the Stripe dashboard (mark_refunded) or here (refund_stripe)
  const settle = async (how) => {
    const manual = await revokePlan(env.DB, o, "refunded");
    if (!manual) await setOrderNote(env.DB, o.session_id, `Marked refunded by ${who} on ${new Date().toISOString().slice(0, 10)} (${how}).`);
    await notifyRefunded(env, o, { off: !!o.applied && !manual }); // the buyer is told the refund was issued (once, service mail)
    return manual;
  };
  if (b.action === "mark_refunded") {
    if (o.status === "refunded") return json({ ok: true });
    return json({ ok: true, placement_differs: await settle("refunded in the Stripe dashboard") });
  }
  if (b.action === "refund_stripe") {
    if (o.status === "refunded") return err(409, "This order is already marked refunded.");
    if (!["paid", "refund_due", "held"].includes(o.status)) return err(400, "Only a paid order, or one waiting for a refund, can be refunded here.");
    if (!o.payment_intent) return err(400, "This order has no Stripe payment on record, so it cannot be refunded here. Refund it where it was paid, then mark it refunded.");
    if (!env.STRIPE_SECRET_KEY) return err(503, "Stripe is not set up on this site (no STRIPE_SECRET_KEY).");
    const form = new URLSearchParams({ payment_intent: o.payment_intent, "metadata[session_id]": o.session_id, "metadata[by]": who }).toString();
    const r = await stripeCall(env, "POST", "/v1/refunds", form, "refund-" + o.session_id);
    if (!r.ok) return err(r.status === 0 ? 502 : 400, (r.data && r.data.error && r.data.error.message) || "Stripe could not be reached. Nothing was refunded. Try again in a minute."); // nothing changed here
    return json({ ok: true, refund: r.data.id || null, placement_differs: await settle(`refunded in Stripe from Admin, ${r.data.id || "refund"}`) });
  }
  if (b.action === "reapply") {
    if (o.status !== "paid" || o.applied) return err(400, "Only a paid order that is not on its event yet can be applied.");
    let target = o.event_id;
    if (target.startsWith("sub:")) {
      const s = await env.DB.prepare("SELECT event_id FROM event_submissions WHERE id = ?").bind(target.slice(4)).first();
      if (!s || !s.event_id) return err(409, "That event is still waiting for approval. Approving it applies this order.");
      target = s.event_id;
    }
    const nf = await applyOrder(env.DB, o, target);
    if (!nf) return err(409, "The event this order was paid for does not exist (deleted or never published). Refund it in Stripe, then mark it refunded.");
    await setOrderNote(env.DB, o.session_id, `Applied by ${who} on ${new Date().toISOString().slice(0, 10)}.`);
    return json({ ok: true, featured: nf });
  }
  return err(400, "Unknown action.");
}
