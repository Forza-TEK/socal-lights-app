// POST   /api/me/events/<submission id> { action: "edit" | "notice" | "copy" } — the person who submitted an event manages it.
// DELETE /api/me/events/<submission id> — removes the event from the map and the list (only the person who added it).
//   edit   : name, hours, price, free, blurb, url, venue, start, end
//   notice : "cancelled" | "postponed" | "" shows a tag on the event
//   copy   : "Run again next year": a new event with every date moved forward a year, marked Expected
import { json, err, clean, webUrl, newId, geocodeAddress, nearestCounty } from "../../../_lib/util.js";
import { CITY } from "../../../../public/cities.js";
import { SEASONS } from "../../../../public/seasons.js";
import { BAD } from "../../../_lib/moderation.js";
import { requireUser, sameOrigin, normEmail } from "../../../_lib/auth.js";
import { isDate, slug, upsertEvent, verifyEventPage } from "../../../_lib/events.js";
import { refundDueStatements } from "../../../_lib/orders.js";
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
    // The same rules as a new event (functions/api/submit-event.js): the words that need a person's look are refused, a season needs one of its own types, the city must be listed,
    // the street address needs 6 characters, and a changed address is looked up again so the pin moves with it.
    if (BAD.test(`${name} ${blurb} ${venue}`)) return err(400, "That doesn't look like a community event listing.");
    const season = b.season === undefined ? s.season : SEASONS[b.season] ? b.season : "", type = b.type === undefined ? s.type : clean(b.type, 10);
    if (b.season !== undefined || b.type !== undefined) { if (!season || !SEASONS[season].types[type]) return err(400, "Choose a season and an event type."); }
    const city = b.city === undefined ? s.city : clean(b.city, 60), address = b.address === undefined ? String(s.address || "") : line(b.address, 160);
    if (b.city !== undefined && !CITY[city]) return err(400, "Choose a city from the list.");
    if (b.address !== undefined && address.length < 6) return err(400, "Enter the street address (or the two cross streets for a parade).");
    let { lat, lng, county } = s, located;
    if (CITY[city] && (city !== s.city || address.toLowerCase() !== String(s.address || "").toLowerCase())) {
      [lat, lng] = CITY[city]; const pt = await geocodeAddress(address, city, [lat, lng]); located = !!pt; if (pt) [lat, lng] = pt;
      const { results: evs } = await env.DB.prepare("SELECT lat, lng, county FROM events").all(); county = nearestCounty(lat, lng, evs);
    }
    // A new web page, name or first day is checked the way a new event's page is: "Confirmed" only when the page mentions the event and its year, otherwise "Expected".
    const cur = live ? await env.DB.prepare("SELECT status FROM events WHERE id = ?").bind(s.event_id).first() : null;
    let status = cur ? cur.status : "expected", verified = s.verified;
    if (url !== (s.url || "") || name !== s.name || start !== s.start_date) { const ck = url ? await verifyEventPage(url, name, start, undefined, user.email) : { ok: false }; status = ck.ok ? "confirmed" : "expected"; verified = ck.ok ? 1 : 0; }
    await env.DB.prepare("UPDATE event_submissions SET name=?, blurb=?, venue=?, start_date=?, end_date=?, hours=?, free=?, price=?, url=?, season=?, type=?, city=?, address=?, lat=?, lng=?, county=?, verified=? WHERE id=?").bind(name, blurb, venue, start, end, hours, free, price, url, season, type, city, address, lat, lng, county, verified, s.id).run();
    if (live) await upsertEvent(env, { id: s.event_id, name, county, city, type, start_date: start, end_date: end, status, free, price, hours, lat, lng, blurb, url, season, venue, address });
    return json({ ok: true, ...(located === undefined ? {} : { located }) });
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

export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s || normEmail(s.contact_email) !== user.email) return err(404, "That event isn't yours.");
  // A paid Featured placement goes with the event row (or was waiting on this submission): flag it refund due first.
  const stmts = [...refundDueStatements(env.DB, { events: ["sub:" + s.id, s.event_id] }, "The organizer deleted the event while a paid Featured placement was running or waiting. Refund it in Stripe, then mark it refunded here."), env.DB.prepare("DELETE FROM event_submissions WHERE id = ?").bind(s.id)];
  if (s.event_id) stmts.push(env.DB.prepare("DELETE FROM events WHERE id = ?").bind(s.event_id));
  await env.DB.batch(stmts);
  return json({ ok: true });
}
