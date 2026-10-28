// POST /api/admin/submissions/:id  { action: "approve" | "decline", status?: "confirmed" | "expected" }
import { json, err } from "../../../_lib/util.js";
import { upsertEvent, slug } from "../../../_lib/events.js";
import { newId } from "../../../_lib/util.js";

export async function onRequestPost({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s) return err(404, "That submission no longer exists.");
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
  return json({ ok: true, id: eventId });
}
