// POST /api/admin/submissions/:id  { action: "approve" | "decline", status?: "confirmed" | "expected" }
import { json, err } from "../../../_lib/util.js";
import { upsertEvent, slug } from "../../../_lib/events.js";
import { applyPlan } from "../../../_lib/featured.js";
import { newId } from "../../../_lib/util.js";

export async function onRequestPost({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s) return err(404, "That submission no longer exists.");
  if (b.action === "unpublish") {
    // Takes a published event off the map; the submission goes back to "waiting" with the same event id, so publishing it again restores it
    if (s.event_id) await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(s.event_id).run();
    await env.DB.prepare("UPDATE event_submissions SET status='pending' WHERE id = ?").bind(s.id).run();
    return json({ ok: true });
  }
  if (b.action === "decline") {
    await env.DB.prepare("UPDATE event_submissions SET status='declined' WHERE id = ?").bind(s.id).run();
    return json({ ok: true });
  }
  if (b.action !== "approve") return err(400, "Unknown action.");
  const eventId = s.event_id || `u-${slug(s.name).slice(0, 24)}-${newId().slice(0, 6)}`;
  await upsertEvent(env, { id: eventId, name: s.name, county: s.county, city: s.city, type: s.type, start_date: s.start_date, end_date: s.end_date,
    status: b.status === "confirmed" ? "confirmed" : "expected", free: s.free, price: s.price, hours: s.hours, lat: s.lat, lng: s.lng,
    blurb: s.blurb, url: s.url, season: s.season, venue: s.venue, address: s.address });
  await env.DB.prepare("UPDATE event_submissions SET status='published', event_id=? WHERE id = ?").bind(eventId, s.id).run();
  // Apply any Featured plans paid for while this event was waiting for review.
  const { results: orders } = await env.DB.prepare("SELECT plan FROM feature_orders WHERE event_id = ? ORDER BY created_at").bind("sub:" + s.id).all();
  if (orders.length) {
    const today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10);
    let ev = await env.DB.prepare("SELECT id, end_date, featured, featured_until FROM events WHERE id = ?").bind(eventId).first();
    for (const o of orders) ev = { ...ev, ...applyPlan(ev, o.plan, today) };
    await env.DB.batch([
      env.DB.prepare("UPDATE events SET featured=?, featured_until=?, updated_at=datetime('now') WHERE id=?").bind(ev.featured, ev.featured_until, eventId),
      env.DB.prepare("UPDATE feature_orders SET event_id=? WHERE event_id=?").bind(eventId, "sub:" + s.id),
    ]);
  }
  return json({ ok: true, id: eventId, featured: orders.length });
}
