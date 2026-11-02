// POST /api/admin/submissions/:id  { action: "approve" | "decline" | "unpublish" | "edit", status?: "confirmed" | "expected", ...fields for edit }
import { json, err } from "../../../_lib/util.js";
import { upsertEvent, slug } from "../../../_lib/events.js";
import { applyPlan } from "../../../_lib/featured.js";
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
    if (s.event_id) await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(s.event_id).run();
    await env.DB.prepare("UPDATE event_submissions SET status='pending' WHERE id = ?").bind(s.id).run();
    return json({ ok: true });
  }
  if (b.action === "decline") {
    await env.DB.prepare("UPDATE event_submissions SET status='declined' WHERE id = ?").bind(s.id).run();
    tell(env, waitUntil, s.contact_email, "event_declined", { name: s.name, reason: clean(b.reason, 400) });
    return json({ ok: true });
  }
  if (b.action === "restore") {
    if (s.status !== "declined") return err(400, "Only a declined event can be restored.");
    await env.DB.prepare("UPDATE event_submissions SET status='pending' WHERE id = ?").bind(s.id).run();
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
  if (b.notify !== false) { tell(env, waitUntil, s.contact_email, "event_approved", { name: s.name }); }
  return json({ ok: true, id: eventId, featured: orders.length });
}
