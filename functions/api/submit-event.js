// POST /api/submit-event — public "Add your event" form (JSON).
// The event is geocoded and its web page is checked. If the page really mentions the event and its year, the event
// is published straight away; otherwise it waits in the admin's "Submitted events" tab. Either way it is logged.
import { json, err, clean, webUrl, newId, nearestCounty, geocodeAddress, verifyTurnstile } from "../_lib/util.js";
import { bump } from "../_lib/funnel.js";
import { ipPruneStatements } from "../_lib/retention.js";
import { requireUser, sameOrigin } from "../_lib/auth.js";
import { isDate, slug, upsertEvent, verifyEventPage } from "../_lib/events.js";
import { normName, line, normEmailText } from "../_lib/fields.js";
import { CITY } from "../../public/cities.js";
import { SEASONS } from "../../public/seasons.js";
import { ptToday } from "../_lib/time.js";
import { checkSubmitLimits, limitResponse } from "../_lib/submitlimit.js";
import { sendReceipt } from "../_lib/receipt.js";
import { EVENT_PLANS, eventQuote } from "../_lib/featured.js";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (s) => { const [, m, d] = String(s).split("-").map(Number); return MON[m - 1] + " " + d; };
const whenOf = (e) => (e.end_date && e.end_date !== e.start_date ? `${day(e.start_date)} to ${day(e.end_date)}` : day(e.start_date));

const AUTO_PUBLISH_PER_DAY = 100; // safety valve: past this, everything waits for review
import { BAD } from "../_lib/moderation.js"; // the same rule the edit sheet uses

// Can a Featured placement be bought for this event today? (the same calculation the checkout uses: featuring opens 30 days before the event, and not after it ended)
const featurable = (ev) => { const t = ptToday(); return Object.keys(EVENT_PLANS).some((k) => !eventQuote(ev, k, t).problem); };

export async function onRequestPost({ request, env, waitUntil }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  // An event belongs to the account that adds it: sign in first, and pass the "I am human" check (the token comes with the form)
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "The form couldn't be read. Please try again.");
  if (!(await verifyTurnstile(env, b["cf-turnstile-response"], ip))) return err(400, "Please finish the 'I am human' check, then try again.");

  // Throttles (functions/_lib/submitlimit.js): per account (the real limit, hourly and daily) and per connection (a safety net a shared network does not trip). A refusal says which limit and when it resets.
  const lim = await checkSubmitLimits(env, { ip, user, kind: "event" });
  if (lim) return limitResponse(lim);

  const e = {
    name: normName(clean(b.name, 120)), city: clean(b.city, 60), season: SEASONS[b.season] ? b.season : "", type: clean(b.type, 10),
    start_date: clean(b.start, 10), end_date: clean(b.end || b.start, 10), hours: line(b.hours, 120),
    free: b.free ? 1 : 0, price: line(b.price, 80), blurb: line(b.blurb, 200), url: webUrl(clean(b.url, 300)),
    venue: normName(clean(b.venue, 120)), address: line(b.address, 160), email: String(user.email || "").toLowerCase(), // always the account email, which is how the event is tied to its owner
  };
  if (e.name.length < 4) return err(400, "Enter the event's name.");
  if (!CITY[e.city]) return err(400, "Choose a city from the list.");
  if (!e.season || !SEASONS[e.season].types[e.type]) return err(400, "Choose a season and an event type.");
  if (!isDate(e.start_date) || !isDate(e.end_date) || e.end_date < e.start_date) return err(400, "Check the start and end dates.");
  const today = ptToday(); // roughly Pacific time
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

  // Already on the map? The answer says whose it is and whether it can be featured, so the page shows only what is true (no "Feature your event" for someone else's event).
  const dup = await env.DB.prepare("SELECT id, start_date, end_date, featured, featured_until, banner_until FROM events WHERE (lower(name) = lower(?) AND start_date = ?) OR (lower(address) = lower(?) AND start_date = ? AND lower(city) = lower(?)) LIMIT 1")
    .bind(e.name, e.start_date, e.address, e.start_date, e.city).first();
  if (dup) {
    const own = await env.DB.prepare("SELECT 1 AS x FROM event_submissions WHERE event_id = ? AND lower(contact_email) = ? LIMIT 1").bind(dup.id, e.email).first();
    return json({ ok: true, status: "duplicate", id: dup.id, mine: !!own, featurable: !!own && featurable(dup), message: own ? "You already added this event, and it is on the map." : "This event is already on the map." });
  }

  // The same person sending the same event again while the first one still waits for review: say so (it is not on the map yet), and do not queue a second copy
  const again = await env.DB.prepare("SELECT id FROM event_submissions WHERE status = 'pending' AND lower(contact_email) = ? AND lower(name) = lower(?) AND start_date = ? LIMIT 1").bind(e.email, e.name, e.start_date).first();
  if (again) return json({ ok: true, status: "pending", duplicate: true, mine: true, submission_id: again.id, message: "You already sent this event. It is waiting for review." });

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
    ...ipPruneStatements(env),
  ]);

  if (auto) {
    await upsertEvent(env, { id: eventId, name: e.name, county, city: e.city, type: e.type, start_date: e.start_date, end_date: e.end_date, status: check.ok ? "confirmed" : "expected", free: e.free, price: e.price, hours: e.hours, lat, lng, blurb: e.blurb, url: e.url, season: e.season, venue: e.venue, address: e.address });
    await bump(env, "fn:add-event-done");
    const receipt = await sendReceipt(env, waitUntil, { id: "event_live", to: e.email, vars: { name: e.name, when: whenOf(e), map: `https://socallights.app/#e-${eventId}`, link: "https://socallights.app/profile#events" } });
    return json({ ok: true, status: "published", id: eventId, submission_id: id, featurable: featurable({ start_date: e.start_date, end_date: e.end_date }), receipt: receipt === "queued" ? "sent" : "", email: e.email, message: "Your event is on the map." });
  }
  await bump(env, "fn:add-event-done");
  const receipt = await sendReceipt(env, waitUntil, { id: "event_received", to: e.email, vars: { name: e.name, when: whenOf(e), link: "https://socallights.app/profile#events" } });
  return json({ ok: true, status: "pending", submission_id: id, receipt: receipt === "queued" ? "sent" : "", email: e.email, message: "Thanks! We'll check your event and add it shortly." });
}
