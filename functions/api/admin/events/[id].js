// DELETE /api/admin/events/<id>[?confirm=1]
// An event with a paid Featured placement still running is not deleted silently: the first call answers 409 with the orders, and the
// page asks again with confirm=1. The paid orders are then marked "refund due" (they are listed in Admin > Orders; nothing is refunded for you).
import { json } from "../../../_lib/util.js";
import { ptToday, eventFloor } from "../../../_lib/featured.js";
import { livePaidOrders, paidPlacementConflict } from "../../../_lib/orders.js";

// GET /api/admin/events/<id> — the paid placement fields of one event (the editor shows them next to the event; they are not part of the public events list) and the floor paid orders set.
export async function onRequestGet({ params, env }) {
  const e = await env.DB.prepare("SELECT featured, featured_until, banner_until FROM events WHERE id = ?").bind(params.id).first();
  if (!e) return json({ featured: 0, featured_until: "", banner_until: "", floor: { featured: 0, featured_until: "", banner_until: "" } }, { headers: { "cache-control": "no-store" } });
  return json({ featured: e.featured || 0, featured_until: e.featured_until || "", banner_until: e.banner_until || "", floor: await eventFloor(env.DB, params.id, ptToday()) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestDelete({ request, params, env }) {
  const live = await livePaidOrders(env.DB, params.id, ptToday());
  if (live.length && new URL(request.url).searchParams.get("confirm") !== "1") return paidPlacementConflict(live, "delete");
  await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(params.id).run();
  if (live.length) await env.DB.prepare("UPDATE feature_orders SET status = 'refund_due', note = ? WHERE event_id = ? AND status = 'paid'")
    .bind("[auto] The event was deleted while this placement was running. Refund it in the Stripe dashboard, then mark it refunded here.", params.id).run();
  return json({ ok: true, refund_due: live.length });
}
