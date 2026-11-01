// POST /api/submit-event — public "Add your event" form (JSON).
// The event is geocoded and its web page is checked. If the page really mentions the event and its year, the event
// is published straight away; otherwise it waits in the admin's "Submitted events" tab. Either way it is logged.
import { json, err, clean, webUrl, newId, verifyTurnstile, nearestCounty, geocodeAddress } from "../_lib/util.js";
import { isDate, slug, upsertEvent, verifyEventPage } from "../_lib/events.js";
import { CITY } from "../../public/cities.js";
import { SEASONS } from "../../public/seasons.js";

const AUTO_PUBLISH_PER_DAY = 100; // safety valve: past this, everything waits for review
const BAD = /\b(viagra|casino|porn|xxx|escort|crypto|bitcoin|loan|forex|cbd|betting)\b/i;

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "The form couldn't be read. Please try again.");

  if (!(await verifyTurnstile(env, b["cf-turnstile-response"], ip))) return err(400, "Please complete the 'I am human' check and send again.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  if (n >= 5) return err(429, "Too many submissions from this connection. Try again in an hour.");

  const e = {
    name: clean(b.name, 120), city: clean(b.city, 60), season: SEASONS[b.season] ? b.season : "", type: clean(b.type, 10),
    start_date: clean(b.start, 10), end_date: clean(b.end || b.start, 10), hours: clean(b.hours, 120),
    free: b.free ? 1 : 0, price: clean(b.price, 80), blurb: clean(b.blurb, 200), url: webUrl(clean(b.url, 300)),
    venue: clean(b.venue, 120), address: clean(b.address, 160), email: clean(b.email, 120),
  };
  if (e.name.length < 4) return err(400, "Enter the event's name.");
  if (!CITY[e.city]) return err(400, "Choose a city from the list.");
  if (!e.season || !SEASONS[e.season].types[e.type]) return err(400, "Choose a season and an event type.");
  if (!isDate(e.start_date) || !isDate(e.end_date) || e.end_date < e.start_date) return err(400, "Check the start and end dates.");
  const today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // roughly Pacific time
  const limit = new Date(Date.now() + 500 * 86400_000).toISOString().slice(0, 10);
  if (e.end_date < today) return err(400, "That event has already ended.");
  if (e.start_date > limit) return err(400, "That date is too far in the future.");
  if (clean(b.url, 300) && !e.url) return err(400, "That doesn't look like a valid web address. Try something like example.org/event, or leave it blank.");
  if (e.venue.length < 3) return err(400, "Enter the venue or place name.");
  if (e.address.length < 6) return err(400, "Enter the street address (or the two cross streets for a parade).");
  if (e.blurb.length < 20) return err(400, "Add a one- or two-sentence description (at least 20 characters).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) return err(400, "Enter an email address so we can reach you if something needs fixing.");
  if (BAD.test(`${e.name} ${e.blurb} ${e.venue}`)) return err(400, "That doesn't look like a community event listing.");
  if (!e.free && !e.price) e.price = "Price not listed";
  if (e.free && !e.price) e.price = "Free";

  // Already on the map?
  const dup = await env.DB.prepare("SELECT id FROM events WHERE (lower(name) = lower(?) AND start_date = ?) OR (lower(address) = lower(?) AND start_date = ? AND lower(city) = lower(?)) LIMIT 1")
    .bind(e.name, e.start_date, e.address, e.start_date, e.city).first();
  if (dup) return json({ ok: true, status: "duplicate", id: dup.id, message: "Good news: this event is already on the map." });

  // Pin: geocode the street address (rejects a hit more than 30 km from the chosen city)
  let [lat, lng] = CITY[e.city];
  const pt = await geocodeAddress(e.address, e.city, [lat, lng]);
  const located = !!pt; if (pt) [lat, lng] = pt;
  const { results: evs } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
  const county = nearestCounty(lat, lng, evs);

  // The event web page is optional. With one, we check it mentions the event and its year (then the event goes live right away); without one, a person reviews it.
  const check = e.url ? await verifyEventPage(e.url, e.name, e.start_date) : { ok: false, note: "no event web page given" };
  const { c: today24 } = await env.DB.prepare("SELECT COUNT(*) AS c FROM event_submissions WHERE status = 'published' AND created_at > datetime('now','-1 day')").first();
  // Every event goes live right away (it can be unpublished from the admin). Only a busy day holds new ones for review.
  // A web page that mentions the event and its year makes it "confirmed"; otherwise it goes up as "expected".
  const reasons = [];
  if (!located) reasons.push("pin is at the city center (address not found)");
  if (!check.ok) reasons.push(check.note);
  const auto = today24 < AUTO_PUBLISH_PER_DAY;
  if (!auto) reasons.push("daily auto-publish limit reached");

  const id = newId();
  const eventId = auto ? `u-${slug(e.name).slice(0, 24)}-${newId().slice(0, 6)}` : null;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,verified,note,event_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, auto ? "published" : "pending", e.name, county, e.city, e.season, e.type, e.start_date, e.end_date, e.free, e.price, e.hours, lat, lng, e.blurb, e.url, e.venue, e.address, e.email, check.ok ? 1 : 0, reasons.join("; ") || check.note, eventId),
    env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
    env.DB.prepare("DELETE FROM submit_log WHERE created_at < datetime('now','-1 day')"),
  ]);

  if (auto) {
    await upsertEvent(env, { id: eventId, name: e.name, county, city: e.city, type: e.type, start_date: e.start_date, end_date: e.end_date, status: check.ok ? "confirmed" : "expected", free: e.free, price: e.price, hours: e.hours, lat, lng, blurb: e.blurb, url: e.url, season: e.season, venue: e.venue, address: e.address });
    return json({ ok: true, status: "published", id: eventId, submission_id: id, message: "Your event is on the map." });
  }
  return json({ ok: true, status: "pending", submission_id: id, message: "Thanks! We'll check your event and add it shortly." });
}
