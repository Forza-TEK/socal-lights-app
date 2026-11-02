// POST /api/me/events/<submission id> { action: "edit" | "notice" | "copy" } — the person who submitted an event manages it.
//   edit   : name, hours, price, free, blurb, url, venue, start, end
//   notice : "cancelled" | "postponed" | "" shows a tag on the event
//   copy   : "Run again next year": a new event with every date moved forward a year, marked Expected
import { json, err, clean, webUrl, newId } from "../../../_lib/util.js";
import { requireUser, sameOrigin, normEmail } from "../../../_lib/auth.js";
import { isDate, slug, upsertEvent } from "../../../_lib/events.js";
import { normName, line } from "../../../_lib/fields.js";

const plusYear = (d) => { const x = new Date(d + "T12:00:00Z"); x.setUTCFullYear(x.getUTCFullYear() + 1); return x.toISOString().slice(0, 10); };

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s || normEmail(s.contact_email) !== user.email) return err(404, "That event isn't yours.");
  const b = await request.json().catch(() => ({}));
  const live = s.status === "published" && s.event_id;

  if (b.action === "notice") {
    if (!live) return err(400, "That event isn't on the map.");
    const n = ["cancelled", "postponed", ""].includes(b.notice) ? b.notice : "";
    await env.DB.prepare("UPDATE events SET notice = ?, updated_at = datetime('now') WHERE id = ?").bind(n, s.event_id).run();
    return json({ ok: true });
  }
  if (b.action === "edit") {
    const name = normName(clean(b.name ?? s.name, 120)), blurb = line(b.blurb ?? s.blurb, 200), venue = normName(clean(b.venue ?? s.venue, 120));
    const start = clean(b.start ?? s.start_date, 10), end = clean(b.end ?? s.end_date, 10), hours = line(b.hours ?? s.hours, 120);
    const free = b.free === undefined ? s.free : b.free ? 1 : 0, price = line(b.price ?? s.price, 80) || (free ? "Free" : "Price not listed");
    const urlRaw = clean(b.url ?? s.url, 300), url = urlRaw ? webUrl(urlRaw) : "";
    if (name.length < 4) return err(400, "Enter the event's name.");
    if (blurb.length < 20) return err(400, "Add a one- or two-sentence description (at least 20 characters).");
    if (venue.length < 3) return err(400, "Enter the venue or place name.");
    if (!isDate(start) || !isDate(end) || end < start) return err(400, "Check the start and end dates.");
    if (urlRaw && !url) return err(400, "That doesn't look like a valid web address.");
    await env.DB.prepare("UPDATE event_submissions SET name=?, blurb=?, venue=?, start_date=?, end_date=?, hours=?, free=?, price=?, url=? WHERE id=?").bind(name, blurb, venue, start, end, hours, free, price, url, s.id).run();
    if (live) {
      const cur = await env.DB.prepare("SELECT status FROM events WHERE id = ?").bind(s.event_id).first();
      await upsertEvent(env, { id: s.event_id, name, county: s.county, city: s.city, type: s.type, start_date: start, end_date: end, status: cur ? cur.status : "expected", free, price, hours, lat: s.lat, lng: s.lng, blurb, url, season: s.season, venue, address: s.address });
    }
    return json({ ok: true });
  }
  if (b.action === "copy") {
    const start = plusYear(s.start_date), end = plusYear(s.end_date), id = newId(), eventId = `u-${slug(s.name).slice(0, 24)}-${newId().slice(0, 6)}`;
    await env.DB.prepare(`INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,verified,note,event_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, "published", s.name, s.county, s.city, s.season, s.type, start, end, s.free, s.price, s.hours, s.lat, s.lng, s.blurb, s.url, s.venue, s.address, s.contact_email, 0, "copied from last year by the organizer", eventId).run();
    await upsertEvent(env, { id: eventId, name: s.name, county: s.county, city: s.city, type: s.type, start_date: start, end_date: end, status: "expected", free: s.free, price: s.price, hours: s.hours, lat: s.lat, lng: s.lng, blurb: s.blurb, url: s.url, season: s.season, venue: s.venue, address: s.address });
    return json({ ok: true, id: eventId });
  }
  return err(400, "Unknown action.");
}
