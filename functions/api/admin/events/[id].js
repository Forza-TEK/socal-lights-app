// DELETE /api/admin/events/<id>[?confirm=1]
// An event with a paid Featured placement still running is not deleted silently: the first call answers 409 with the orders, and the
// page asks again with confirm=1. The paid orders are then marked "refund due" (they are listed in Admin > Orders; nothing is refunded for you).
import { json } from "../../../_lib/util.js";
import { ptToday, eventFloor } from "../../../_lib/featured.js";
import { livePaidOrders, paidPlacementConflict } from "../../../_lib/orders.js";
import { ownerKeys } from "../../../_lib/eventphotos.js";

// GET /api/admin/events/<id> — the paid placement fields of one event (the editor shows them next to the event; they are not part of the public events list) and the floor paid orders set.
export async function onRequestGet({ params, env }) {
  const e = await env.DB.prepare("SELECT featured, featured_until, banner_until, video, video_file, video_ok, owner_photos, image FROM events WHERE id = ?").bind(params.id).first();
  if (!e) return json({ featured: 0, featured_until: "", banner_until: "", floor: { featured: 0, featured_until: "", banner_until: "" } }, { headers: { "cache-control": "no-store" } });
  let last_edit = null; // the newest organizer takeover that can still be reverted (events/revert.js)
  try { const h = await env.DB.prepare("SELECT by_email, reason, created_at FROM event_edit_history WHERE event_id = ? AND reverted_at IS NULL ORDER BY id DESC LIMIT 1").bind(params.id).first(); if (h) last_edit = { by: h.by_email || "", reason: h.reason || "", at: h.created_at }; } catch { /* migration 0288 not applied yet */ }
  return json({ last_edit, featured: e.featured || 0, featured_until: e.featured_until || "", banner_until: e.banner_until || "", video: e.video || "", video_file: e.video_file || "", video_ok: !!e.video_ok, photos: ownerKeys(e.owner_photos), linked_image: e.image || "", floor: await eventFloor(env.DB, params.id, ptToday()) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestDelete({ request, params, env, data = {} }) {
  const live = await livePaidOrders(env.DB, params.id, ptToday());
  if (live.length && new URL(request.url).searchParams.get("confirm") !== "1") return paidPlacementConflict(live, "delete");
  // Keep the whole row (a tombstone): it makes the delete undoable (POST /api/admin/events/restore) and lets the migration gate refuse a later migration that would bring the event back by accident.
  const row = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(params.id).first();
  if (row) { try { await env.DB.prepare("INSERT OR REPLACE INTO deleted_events (id, name, row, deleted_by) VALUES (?,?,?,?)").bind(params.id, String(row.name || "").slice(0, 120), JSON.stringify(row), String(data.admin && data.admin.email || "").slice(0, 120)).run(); } catch {} } // before migration 0268 the table is missing: the delete still goes ahead
  await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(params.id).run();
  if (live.length) await env.DB.prepare("UPDATE feature_orders SET status = 'refund_due', note = ? WHERE event_id = ? AND status = 'paid'")
    .bind("[auto] The event was deleted while this placement was running. Refund it in the Stripe dashboard, then mark it refunded here.", params.id).run();
  return json({ ok: true, refund_due: live.length, restorable: !!row });
}
