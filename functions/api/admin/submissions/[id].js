// POST /api/admin/submissions/:id  { action: "approve" | "decline" | "unpublish" | "edit", status?: "confirmed" | "expected", ...fields for edit }
import { json, err } from "../../../_lib/util.js";
import { upsertEvent, slug } from "../../../_lib/events.js";
import { applyOrder, restorePlacement, ptToday } from "../../../_lib/featured.js";
import { markRefundDue, livePaidOrders, noteOrders, paidPlacementConflict } from "../../../_lib/orders.js";
import { newId, clean } from "../../../_lib/util.js";
import { tell } from "../../../_lib/notify.js";

export async function onRequestPost({ request, env, params, waitUntil }) {
  const b = await request.json().catch(() => ({}));
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s) return err(404, "That submission no longer exists.");
  if (b.action === "edit") {
    // Fix a typo or a wrong date before publishing. A published event is edited in the Events tab instead.
    if (s.status !== "pending") return err(400, "Only events waiting for review can be edited here. Edit a live one in the Events tab.");
    const t = (v, n) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, n), d = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
    const f = { name: t(b.name, 120), venue: t(b.venue, 120), address: t(b.address, 160), city: t(b.city, 60), hours: t(b.hours, 80), price: t(b.price, 80), blurb: t(b.blurb, 600), url: t(b.url, 300), contact_email: t(b.contact_email, 120).toLowerCase(), start_date: d(b.start_date), end_date: d(b.end_date) };
    if (!f.name || !f.city) return err(400, "An event needs a name and a city.");
    if (!f.start_date || !f.end_date) return err(400, "Enter both dates as YYYY-MM-DD.");
    if (f.end_date < f.start_date) return err(400, "The end date is before the start date.");
    if (f.url && !/^https?:\/\//i.test(f.url)) return err(400, "The event page must start with http:// or https://.");
    await env.DB.prepare("UPDATE event_submissions SET name=?, venue=?, address=?, city=?, hours=?, price=?, blurb=?, url=?, contact_email=?, start_date=?, end_date=? WHERE id=?")
      .bind(f.name, f.venue, f.address, f.city, f.hours, f.price, f.blurb, f.url, f.contact_email, f.start_date, f.end_date, s.id).run();
    return json({ ok: true });
  }
  if (b.action === "unpublish") {
    // Takes a published event off the map; the submission goes back to "waiting" with the same event id, so publishing it again restores it
    if (s.event_id) {
      // A paid placement is deleted with the event row: ask first, and keep the orders so a republish gives it back.
      const live = await livePaidOrders(env.DB, s.event_id, ptToday());
      if (live.length && !b.confirm) return paidPlacementConflict(live, "unpublish");
      await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(s.event_id).run();
      if (live.length) await noteOrders(env.DB, s.event_id, "[auto] The event was unpublished while this placement was running. Publishing it again restores the placement; if it will not come back, refund this order in Stripe and mark it refunded.");
    }
    await env.DB.prepare("UPDATE event_submissions SET status='pending' WHERE id = ?").bind(s.id).run();
    return json({ ok: true });
  }
  if (b.action === "decline") {
    await env.DB.prepare("UPDATE event_submissions SET status='declined' WHERE id = ?").bind(s.id).run();
    // A buyer who paid for Featured on a submission we decline is owed a refund: surface it in Admin > Orders (nothing is refunded automatically).
    const gone = s.event_id && !(await env.DB.prepare("SELECT 1 FROM events WHERE id = ?").bind(s.event_id).first());
    const due = await markRefundDue(env.DB, s.id, gone ? s.event_id : "", "The submission was declined after the buyer paid for Featured. Refund it in the Stripe dashboard, then mark it refunded here.");
    tell(env, waitUntil, s.contact_email, "event_declined", { name: s.name, reason: clean(b.reason, 400) });
    return json({ ok: true, refund_due: due });
  }
  if (b.action === "restore") {
    if (s.status !== "declined") return err(400, "Only a declined event can be restored.");
    await env.DB.prepare("UPDATE event_submissions SET status='pending' WHERE id = ?").bind(s.id).run();
    // Undo of a decline: orders still waiting on a refund go back to paid (an order already marked refunded stays refunded)
    await env.DB.prepare("UPDATE feature_orders SET status='paid', note=NULL WHERE status='refund_due' AND event_id IN (?, ?)").bind("sub:" + s.id, s.event_id || "sub:" + s.id).run();
    return json({ ok: true });
  }
  if (b.action !== "approve") return err(400, "Unknown action.");
  const eventId = s.event_id || `u-${slug(s.name).slice(0, 24)}-${newId().slice(0, 6)}`;
  await upsertEvent(env, { id: eventId, name: s.name, county: s.county, city: s.city, type: s.type, start_date: s.start_date, end_date: s.end_date,
    status: b.status === "confirmed" ? "confirmed" : "expected", free: s.free, price: s.price, hours: s.hours, lat: s.lat, lng: s.lng,
    blurb: s.blurb, url: s.url, season: s.season, venue: s.venue, address: s.address });
  await env.DB.prepare("UPDATE event_submissions SET status='published', event_id=? WHERE id = ?").bind(eventId, s.id).run();
  // Same event id as before an unpublish: put back what its paid orders still owe, then apply plans paid for while it waited for review.
  const restored = s.event_id ? await restorePlacement(env.DB, eventId) : null;
  const { results: orders } = await env.DB.prepare("SELECT session_id, plan FROM feature_orders WHERE event_id = ? AND status = 'paid' AND applied = 0 ORDER BY created_at").bind("sub:" + s.id).all();
  const today = ptToday();
  for (const o of orders) await applyOrder(env.DB, o, eventId, today); // one at a time, so each order records what it added
  if (b.notify !== false) { tell(env, waitUntil, s.contact_email, "event_approved", { name: s.name }); }
  return json({ ok: true, id: eventId, featured: orders.length, restored: !!restored });
}
