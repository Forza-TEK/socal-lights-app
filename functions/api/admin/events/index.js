// GET /api/admin/events — every event, nothing hidden (the admin editor reads it; behind the Access login like all of /api/admin).
// POST /api/admin/events — create or update one event.
import { json, err, clean, safeUrl, COUNTIES } from "../../../_lib/util.js";
import { SEASONS } from "../../../../public/seasons.js";
import { build } from "../../events.js";
import { eventFloor, ptToday } from "../../../_lib/featured.js";
export async function onRequestGet({ env }) { const b = await build(env, true, true, true); return new Response(b.body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", etag: b.tag } }); }
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "Send the event as JSON.");
  const e = {
    id: clean(b.id, 40).toLowerCase().replace(/[^a-z0-9-]/g, "-") || crypto.randomUUID().slice(0, 8),
    name: clean(b.name, 120), county: clean(b.county, 40), city: clean(b.city, 60), type: clean(b.type, 10),
    start: clean(b.start, 10), end: clean(b.end, 10), status: b.status === "confirmed" ? "confirmed" : "expected",
    free: b.free ? 1 : 0, price: clean(b.price, 80), hours: clean(b.hours, 200),
    lat: Number(b.lat), lng: Number(b.lng), blurb: clean(b.blurb, 600), url: safeUrl(b.url),
    season: SEASONS[b.season] ? b.season : "christmas",
    venue: clean(b.venue, 120), address: clean(b.address, 200),
  };
  if (!e.name || !e.city) return err(400, "Name and city are required.");
  if (!COUNTIES.includes(e.county)) return err(400, "Choose one of the seven counties.");
  if (!SEASONS[e.season].types[e.type]) return err(400, "Choose an event type that fits the season.");
  if (!isDate(e.start) || !isDate(e.end) || e.end < e.start) return err(400, "Check the start and end dates.");
  if (!(e.lat > 32 && e.lat < 35.8 && e.lng > -121.5 && e.lng < -114)) return err(400, "The location is outside Southern California.");

  // Paid placement fields, only when the editor sends them (an older page or a script that does not send them leaves them alone). A date or level set by hand never cuts off a paid order that is still running.
  const pl = b.placement && typeof b.placement === "object" ? b.placement : null;
  let place = null;
  if (pl) {
    const lvl = [0, 1, 2].includes(Number(pl.featured)) ? Number(pl.featured) : 0, fu = clean(pl.featured_until, 10), bu = clean(pl.banner_until, 10);
    if ((fu && !isDate(fu)) || (bu && !isDate(bu))) return err(400, "An end date doesn't look right.");
    const floor = await eventFloor(env.DB, e.id, ptToday());
    if (lvl < floor.featured || (lvl && fu && fu < floor.featured_until)) return err(400, `A paid Featured order runs until ${floor.featured_until}, so the level and the date cannot be lowered or ended earlier. To end it sooner, refund the order in Stripe and mark it refunded under Orders.`);
    if ((bu || "") < floor.banner_until) return err(400, `A paid banner order runs until ${floor.banner_until}, so the banner date cannot be earlier. To end it sooner, refund the order in Stripe and mark it refunded under Orders.`);
    place = { lvl, fu: lvl ? fu || null : null, bu: bu || null };
  }
  const withVenue = () => env.DB.prepare(
    `INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city, type=excluded.type,
       start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, free=excluded.free,
       price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng, blurb=excluded.blurb,
       url=excluded.url, season=excluded.season, venue=excluded.venue, address=excluded.address, updated_at=datetime('now')`
  ).bind(e.id, e.name, e.county, e.city, e.type, e.start, e.end, e.status, e.free, e.price, e.hours, e.lat, e.lng, e.blurb, e.url, e.season, e.venue, e.address).run();
  // Before migration 0006 (venue/address columns) reaches the live database, save without those fields.
  const withoutVenue = () => env.DB.prepare(
    `INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city, type=excluded.type,
       start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, free=excluded.free,
       price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng, blurb=excluded.blurb,
       url=excluded.url, season=excluded.season, updated_at=datetime('now')`
  ).bind(e.id, e.name, e.county, e.city, e.type, e.start, e.end, e.status, e.free, e.price, e.hours, e.lat, e.lng, e.blurb, e.url, e.season).run();
  try { await withVenue(); if (place) await env.DB.prepare("UPDATE events SET featured=?, featured_until=?, banner_until=? WHERE id=?").bind(place.lvl, place.fu, place.bu, e.id).run(); }
  catch (x) { if (/no column named|no such column/i.test(String(x && x.message))) await withoutVenue(); else throw x; }
  return json({ ok: true, id: e.id });
}
