// POST /api/admin/orders/:session_id  { action: "mark_refunded" | "reapply" | "note", note? }
//   mark_refunded : the owner already refunded this payment in the Stripe dashboard; record it here and take the placement off. Never calls Stripe.
//   reapply       : apply a paid order that is not on its event yet, if the event exists now.
//   note          : write the owner's note on the order. This also clears an "[auto]" flag (it counts as "seen").
// The admin middleware has already required the Access login and logs the POST to admin_log (area "orders").
import { json, err, clean } from "../../../_lib/util.js";
import { applyOrder, revokePlan, setOrderNote } from "../../../_lib/featured.js";
import { notifyRefunded } from "../../../_lib/ordermail.js";

export async function onRequestPost({ request, env, params, data }) {
  const b = await request.json().catch(() => ({}));
  const o = await env.DB.prepare("SELECT * FROM feature_orders WHERE session_id = ?").bind(params.id).first();
  if (!o) return err(404, "That order no longer exists.");
  const who = (data && data.admin && data.admin.email) || "admin";
  if (b.action === "note") { await setOrderNote(env.DB, o.session_id, clean(b.note, 500)); return json({ ok: true }); }
  if (b.action === "mark_refunded") {
    if (o.status === "refunded") return json({ ok: true });
    const manual = await revokePlan(env.DB, o, "refunded");
    if (!manual) await setOrderNote(env.DB, o.session_id, `Marked refunded by ${who} on ${new Date().toISOString().slice(0, 10)} (refunded in the Stripe dashboard).`);
    await notifyRefunded(env, o, { off: !!o.applied && !manual }); // the buyer is told the refund was issued (once, service mail)
    return json({ ok: true, placement_differs: manual });
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
